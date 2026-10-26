import { createRequestContext } from "./context";
import {
  ConfigurationError,
  HttpError,
  LifecycleError,
  QutivexError,
  ServerShutdownError,
  ServerStartError,
} from "./errors";
import { type GroupOptions, RouteGroup, resolveRouteArguments } from "./group";
import { createRequestLogger, parseCookies, resolveRequestId } from "./helpers";
import { errorResponse, methodNotAllowedResponse, notFoundResponse, toResponse } from "./response";
import { type RouteMatch, RouteTable } from "./routes";
import type {
  AdapterStartOptions,
  AfterHook,
  AppOptions,
  AppState,
  BeforeHook,
  ErrorContext,
  ErrorHandler,
  Handler,
  HttpMethod,
  HttpServer,
  HttpServerAdapter,
  ListenOptions,
  Logger,
  Middleware,
  Next,
  RequestContext,
  RouteInfo,
  RouteOptions,
  RunningAppInfo,
  ShutdownHook,
  WebSocketContext,
  WebSocketHandlers,
  WebSocketMatch,
} from "./types";
import { HTTP_METHODS } from "./types";
import { WebSocketTable } from "./websocket";

const DEFAULT_HOSTNAME = "127.0.0.1";
const DEFAULT_PORT = 3000;
const DEFAULT_NAME = "Qutivex";
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT = Symbol("qutivex.request-timeout");

function validatePort(port: number): void {
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new ConfigurationError(
      `Invalid port "${port}": expected an integer between 0 and 65535.`,
    );
  }
}

function validateHostname(hostname: string): void {
  if (typeof hostname !== "string" || hostname.trim() === "") {
    throw new ConfigurationError("Hostname must be a non-empty string.");
  }
}

function validateLogger(logger: Logger): void {
  for (const method of ["debug", "info", "warn", "error"] as const) {
    if (typeof logger[method] !== "function") {
      throw new ConfigurationError(`Logger.${method} must be a function.`);
    }
  }
}

function isHttpMethod(value: string): value is HttpMethod {
  return (HTTP_METHODS as readonly string[]).includes(value);
}

function normalizeRequestError(error: unknown): unknown {
  if (error instanceof URIError) {
    return new HttpError("Malformed URL encoding in the request path.", {
      cause: error,
      code: "INVALID_PATH_ENCODING",
      status: 400,
    });
  }
  return error;
}

/**
 * Qutivex application core.
 *
 * Owns routing, middleware, request context, response semantics, lifecycle,
 * WebSocket routes, and graceful shutdown. Runtime details stay behind an
 * {@link HttpServerAdapter}; the public `qutivex` package wires in the Bun runtime.
 */
export class App {
  readonly #adapter: HttpServerAdapter | undefined;
  readonly #afterHooks: AfterHook[] = [];
  readonly #banner: boolean;
  readonly #baseLogger: Logger | undefined;
  readonly #beforeHooks: BeforeHook[] = [];
  readonly #development: boolean;
  readonly #errorHooks: ErrorHandler[] = [];
  readonly #hooks: ShutdownHook[] = [];
  readonly #hostname: string;
  readonly #maxBodyBytes: number;
  readonly #middleware: Middleware[] = [];
  readonly #name: string;
  readonly #onError: ErrorHandler | undefined;
  readonly #port: number;
  readonly #requestTimeoutMs: number;
  readonly #routes = new RouteTable();
  readonly #webSockets = new WebSocketTable();

  #listenPromise: Promise<RunningAppInfo> | undefined;
  #server: HttpServer | undefined;
  #serverInfo: RunningAppInfo | undefined;
  #state: AppState = "created";
  #stopPromise: Promise<void> | undefined;

  constructor(options: AppOptions = {}) {
    const port = options.port ?? DEFAULT_PORT;
    validatePort(port);

    const hostname = options.hostname ?? DEFAULT_HOSTNAME;
    validateHostname(hostname);

    const name = options.name ?? DEFAULT_NAME;
    if (typeof name !== "string" || name.trim() === "") {
      throw new ConfigurationError("App name must be a non-empty string.");
    }

    const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    if (!Number.isInteger(maxBodyBytes) || maxBodyBytes < 0) {
      throw new ConfigurationError("maxBodyBytes must be an integer greater than or equal to 0.");
    }

    const requestTimeoutMs = options.requestTimeoutMs ?? 0;
    if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 0) {
      throw new ConfigurationError(
        "requestTimeoutMs must be an integer greater than or equal to 0.",
      );
    }

    if (options.logger !== undefined) {
      validateLogger(options.logger);
    }

    for (const middleware of options.middleware ?? []) {
      if (typeof middleware !== "function") {
        throw new ConfigurationError("Global middleware must be functions.");
      }
      this.#middleware.push(middleware);
    }

    const development = options.development ?? process.env.NODE_ENV !== "production";

    this.#adapter = options.adapter;
    this.#banner = options.banner ?? development;
    this.#baseLogger = options.logger;
    this.#development = development;
    this.#hostname = hostname;
    this.#maxBodyBytes = maxBodyBytes;
    this.#name = name;
    this.#onError = options.onError;
    this.#port = port;
    this.#requestTimeoutMs = requestTimeoutMs;
  }

  get state(): AppState {
    return this.#state;
  }

  get name(): string {
    return this.#name;
  }

  get url(): URL | undefined {
    return this.#serverInfo?.url;
  }

  get routes(): readonly RouteInfo[] {
    return this.#routes.list();
  }

  get webSockets(): readonly { path: string }[] {
    return this.#webSockets.list();
  }

  use(middleware: Middleware): this {
    this.#assertConfigurable();
    if (typeof middleware !== "function") {
      throw new ConfigurationError("Middleware must be a function.");
    }
    this.#middleware.push(middleware);
    return this;
  }

  before(hook: BeforeHook): this {
    this.#assertConfigurable();
    if (typeof hook !== "function") {
      throw new ConfigurationError("Before hooks must be functions.");
    }
    this.#beforeHooks.push(hook);
    return this;
  }

  after(hook: AfterHook): this {
    this.#assertConfigurable();
    if (typeof hook !== "function") {
      throw new ConfigurationError("After hooks must be functions.");
    }
    this.#afterHooks.push(hook);
    return this;
  }

  onError(handler: ErrorHandler): this {
    if (this.#state === "stopping" || this.#state === "stopped" || this.#state === "failed") {
      throw new LifecycleError(`Cannot register an error hook while the app is "${this.#state}".`);
    }
    if (typeof handler !== "function") {
      throw new ConfigurationError("Error hooks must be functions.");
    }
    this.#errorHooks.push(handler);
    return this;
  }

  group(prefix: string, options: GroupOptions = {}): RouteGroup {
    this.#assertConfigurable();

    for (const middleware of options.middleware ?? []) {
      if (typeof middleware !== "function") {
        throw new ConfigurationError("Group middleware must be functions.");
      }
    }

    return new RouteGroup(
      (method, path, handler, routeOptions) => {
        this.#registerRoute(method, path, handler, routeOptions);
      },
      prefix,
      options.middleware ?? [],
      options.metadata ?? {},
    );
  }

  websocket(path: string, handlers: WebSocketHandlers): this {
    this.#assertConfigurable();
    this.#webSockets.add(path, handlers);
    this.#markConfigured();
    return this;
  }

  get(path: string, handler: Handler): this;
  get(path: string, options: RouteOptions, handler: Handler): this;
  get(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    const resolved = resolveRouteArguments(optionsOrHandler, maybeHandler);
    return this.#registerRoute("GET", path, resolved.handler, resolved.options);
  }

  post(path: string, handler: Handler): this;
  post(path: string, options: RouteOptions, handler: Handler): this;
  post(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    const resolved = resolveRouteArguments(optionsOrHandler, maybeHandler);
    return this.#registerRoute("POST", path, resolved.handler, resolved.options);
  }

  put(path: string, handler: Handler): this;
  put(path: string, options: RouteOptions, handler: Handler): this;
  put(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    const resolved = resolveRouteArguments(optionsOrHandler, maybeHandler);
    return this.#registerRoute("PUT", path, resolved.handler, resolved.options);
  }

  patch(path: string, handler: Handler): this;
  patch(path: string, options: RouteOptions, handler: Handler): this;
  patch(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    const resolved = resolveRouteArguments(optionsOrHandler, maybeHandler);
    return this.#registerRoute("PATCH", path, resolved.handler, resolved.options);
  }

  delete(path: string, handler: Handler): this;
  delete(path: string, options: RouteOptions, handler: Handler): this;
  delete(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    const resolved = resolveRouteArguments(optionsOrHandler, maybeHandler);
    return this.#registerRoute("DELETE", path, resolved.handler, resolved.options);
  }

  options(path: string, handler: Handler): this;
  options(path: string, options: RouteOptions, handler: Handler): this;
  options(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    const resolved = resolveRouteArguments(optionsOrHandler, maybeHandler);
    return this.#registerRoute("OPTIONS", path, resolved.handler, resolved.options);
  }

  head(path: string, handler: Handler): this;
  head(path: string, options: RouteOptions, handler: Handler): this;
  head(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    const resolved = resolveRouteArguments(optionsOrHandler, maybeHandler);
    return this.#registerRoute("HEAD", path, resolved.handler, resolved.options);
  }

  onShutdown(hook: ShutdownHook): this {
    if (typeof hook !== "function") {
      throw new ConfigurationError("Shutdown hooks must be functions.");
    }
    if (this.#state === "stopping" || this.#state === "stopped" || this.#state === "failed") {
      throw new LifecycleError(
        `Cannot register a shutdown hook while the app is "${this.#state}".`,
      );
    }

    this.#hooks.push(hook);
    return this;
  }

  /**
   * Starts the HTTP server and resolves with its address.
   *
   * `run()` is an alias for `listen()`. Calling `listen()` on a running app
   * returns the same address; route and middleware registration must happen
   * before startup.
   */
  async listen(options: ListenOptions = {}): Promise<RunningAppInfo> {
    if (this.#state === "running" && this.#serverInfo !== undefined) {
      return this.#serverInfo;
    }
    if (this.#state === "starting" && this.#listenPromise !== undefined) {
      return this.#listenPromise;
    }
    if (this.#state === "stopping") {
      throw new LifecycleError("Cannot start the app while it is shutting down.");
    }
    if (this.#state === "stopped") {
      throw new LifecycleError("Cannot start an app that has already stopped.");
    }
    if (this.#state === "failed") {
      throw new LifecycleError("Cannot start an app whose startup failed. Create a new App.");
    }

    const adapter = this.#adapter;
    if (adapter === undefined) {
      throw new ConfigurationError(
        'No HTTP adapter is configured. Use the public "qutivex" package or pass an adapter.',
      );
    }

    const hostname = options.hostname ?? this.#hostname;
    validateHostname(hostname);

    const port = options.port ?? this.#port;
    validatePort(port);

    this.#state = "starting";
    const promise = this.#start(adapter, hostname, port);
    this.#listenPromise = promise;

    try {
      return await promise;
    } finally {
      this.#listenPromise = undefined;
    }
  }

  /** Alias for {@link listen}. */
  run(options: ListenOptions = {}): Promise<RunningAppInfo> {
    return this.listen(options);
  }

  /** Stops accepting requests, runs shutdown hooks, and resolves when clean. */
  async stop(force = false): Promise<void> {
    if (this.#stopPromise !== undefined) {
      return this.#stopPromise;
    }
    if (this.#state === "stopped") {
      return;
    }

    const stopPromise = this.#shutdown(force);
    this.#stopPromise = stopPromise.finally(() => {
      this.#stopPromise = undefined;
    });
    return this.#stopPromise;
  }

  /** Dispatches a request without requiring a bound socket. */
  async fetch(request: Request): Promise<Response> {
    const method = request.method.toUpperCase();
    const requestId = resolveRequestId(request.headers);

    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const routeMethod = this.#selectRouteMethod(method, path);
      const match = routeMethod === undefined ? undefined : this.#routes.match(routeMethod, path);

      if (match === undefined) {
        const allowed = this.#routes.allowedMethods(path);
        const response =
          allowed.length > 0 ? methodNotAllowedResponse(allowed) : notFoundResponse();
        return this.#finalize(response, method, requestId);
      }

      const controller = new AbortController();
      const onAbort = (): void => {
        controller.abort(request.signal.reason);
      };

      if (request.signal.aborted) {
        onAbort();
      } else {
        request.signal.addEventListener("abort", onAbort, { once: true });
      }

      let timer: ReturnType<typeof setTimeout> | undefined;

      try {
        const context = createRequestContext({
          logger: createRequestLogger(this.#baseLogger, { method, path, requestId }),
          maxBodyBytes: this.#maxBodyBytes,
          method,
          params: match.params,
          path,
          request,
          requestId,
          signal: controller.signal,
          url,
        });

        const execute = this.#compose(match, context);
        let response: Response;

        if (this.#requestTimeoutMs === 0) {
          response = await execute();
        } else {
          const timeout = new Promise<typeof REQUEST_TIMEOUT>((resolve) => {
            timer = setTimeout(() => {
              controller.abort(new Error("Request timed out."));
              resolve(REQUEST_TIMEOUT);
            }, this.#requestTimeoutMs);
          });

          const chain = execute();
          const raced = await Promise.race([chain, timeout]);

          if (raced === REQUEST_TIMEOUT) {
            void chain.catch(() => {});
            response = errorResponse(HttpError.requestTimeout());
          } else {
            response = raced;
          }
        }

        return this.#finalize(response, method, requestId);
      } finally {
        request.signal.removeEventListener("abort", onAbort);
        if (timer !== undefined) {
          clearTimeout(timer);
        }
      }
    } catch (error) {
      const normalized = normalizeRequestError(error);
      this.#report(normalized, { request });
      return this.#finalize(errorResponse(normalized), method, requestId);
    }
  }

  #selectRouteMethod(method: string, path: string): HttpMethod | undefined {
    if (!isHttpMethod(method)) {
      return undefined;
    }
    if (method === "HEAD" && this.#routes.match("HEAD", path) === undefined) {
      return "GET";
    }
    return method;
  }

  #compose(match: RouteMatch, context: RequestContext): () => Promise<Response> {
    const middleware = [...this.#middleware, ...(match.entry.options.middleware ?? [])];
    return () => this.#dispatch(middleware, 0, match.entry.handler, context);
  }

  async #dispatch(
    middleware: readonly Middleware[],
    index: number,
    handler: Handler,
    context: RequestContext,
  ): Promise<Response> {
    const current = middleware[index];
    if (current === undefined) {
      return this.#runHandler(handler, context);
    }

    let nextCalled = false;
    const next: Next = async () => {
      if (nextCalled) {
        throw new QutivexError("next() was called more than once in one middleware.", {
          code: "MIDDLEWARE_NEXT_CALLED_TWICE",
        });
      }
      nextCalled = true;
      return this.#dispatch(middleware, index + 1, handler, context);
    };

    const result = await current(context, next);
    if (!(result instanceof Response)) {
      throw new QutivexError("Middleware must return a Response.", {
        code: "INVALID_MIDDLEWARE_RESULT",
      });
    }
    return result;
  }

  async #runHandler(handler: Handler, context: RequestContext): Promise<Response> {
    let response: Response | undefined;

    for (const hook of this.#beforeHooks) {
      const result = await hook(context);
      if (result instanceof Response) {
        response = result;
        break;
      }
    }

    if (response === undefined) {
      response = toResponse(await handler(context));
    }

    for (const hook of this.#afterHooks) {
      const result = await hook(context, response);
      if (result instanceof Response) {
        response = result;
      }
    }

    return response;
  }

  #finalize(response: Response, method: string, requestId: string): Response {
    if (!response.headers.has("x-request-id")) {
      response.headers.set("x-request-id", requestId);
    }

    if (method !== "HEAD") {
      return response;
    }

    if (response.body !== null) {
      void response.body.cancel().catch(() => {});
    }

    const headers = new Headers(response.headers);
    headers.delete("content-length");

    return new Response(null, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  }

  #registerRoute(method: HttpMethod, path: string, handler: Handler, options: RouteOptions): this {
    this.#assertConfigurable();
    this.#routes.add(method, path, handler, options);
    this.#markConfigured();
    return this;
  }

  #markConfigured(): void {
    if (this.#state === "created") {
      this.#state = "configured";
    }
  }

  #assertConfigurable(): void {
    if (this.#state !== "created" && this.#state !== "configured") {
      throw new LifecycleError(
        `Cannot change routes or middleware while the app is "${this.#state}". Register them before starting.`,
      );
    }
  }

  async #start(
    adapter: HttpServerAdapter,
    hostname: string,
    port: number,
  ): Promise<RunningAppInfo> {
    const startedAt = performance.now();

    try {
      const options: AdapterStartOptions = {
        development: this.#development,
        fetch: (request) => this.fetch(request),
        hostname,
        matchWebSocket: (request) => this.#matchWebSocket(request),
        onError: (error, context) => this.#report(error, context),
        port,
      };

      const server = await adapter.start(options);

      this.#server = server;
      const info: RunningAppInfo = {
        hostname: server.hostname,
        port: server.port,
        url: server.url,
      };
      this.#serverInfo = info;
      this.#state = "running";

      if (this.#banner) {
        this.#printBanner(info, performance.now() - startedAt);
      }

      return info;
    } catch (error) {
      this.#state = "failed";
      this.#report(error, { state: "failed" });

      if (error instanceof QutivexError) {
        throw error;
      }

      throw new ServerStartError(`Failed to start ${this.#name} on ${hostname}:${port}.`, {
        cause: error,
      });
    }
  }

  #matchWebSocket(request: Request): WebSocketMatch | undefined {
    if (request.method.toUpperCase() !== "GET") {
      return undefined;
    }

    try {
      const url = new URL(request.url);
      const match = this.#webSockets.match(url.pathname);
      if (match === undefined) {
        return undefined;
      }

      const requestId = resolveRequestId(request.headers);
      const context: WebSocketContext = {
        cookies: parseCookies(request.headers.get("cookie")),
        headers: request.headers,
        logger: createRequestLogger(this.#baseLogger, {
          method: "GET",
          path: url.pathname,
          requestId,
        }),
        params: match.params,
        query: url.searchParams,
        request,
        requestId,
        state: new Map(),
        url,
      };

      return { context, handlers: match.handlers };
    } catch {
      return undefined;
    }
  }

  async #shutdown(force: boolean): Promise<void> {
    if (this.#state === "starting" && this.#listenPromise !== undefined) {
      try {
        await this.#listenPromise;
      } catch {
        // Startup failure is already recorded on the app state.
      }
    }

    this.#state = "stopping";
    const failures: unknown[] = [];

    if (this.#server !== undefined) {
      try {
        await this.#server.stop(force);
      } catch (error) {
        failures.push(error);
        this.#report(error, { state: "stopping" });
      }
    }

    for (const hook of [...this.#hooks].reverse()) {
      try {
        await hook();
      } catch (error) {
        failures.push(error);
        this.#report(error, { state: "stopping" });
      }
    }

    this.#server = undefined;
    this.#serverInfo = undefined;

    if (failures.length > 0) {
      this.#state = "failed";
      throw new ServerShutdownError("The app did not shut down cleanly.", {
        cause: failures[0],
      });
    }

    this.#state = "stopped";
  }

  #printBanner(info: RunningAppInfo, duration: number): void {
    const count = this.#routes.size;
    const routeLabel = count === 1 ? "route" : "routes";
    const socketCount = this.#webSockets.size;
    const socketLabel = socketCount === 1 ? "WebSocket route" : "WebSocket routes";
    const sockets = socketCount > 0 ? ` | ${socketCount} ${socketLabel}` : "";
    const elapsed = Math.max(0, Math.round(duration));

    console.log(
      `\n  ${this.#name}\n  ➜  ${info.url.href}\n  ${count} ${routeLabel}${sockets} | ${elapsed}ms\n`,
    );
  }

  #report(error: unknown, context: ErrorContext): void {
    const handlers: ErrorHandler[] = [];
    if (this.#onError !== undefined) {
      handlers.push(this.#onError);
    }
    handlers.push(...this.#errorHooks);

    for (const handler of handlers) {
      try {
        handler(error, context);
      } catch {
        // An observer must never break request handling or shutdown.
      }
    }
  }
}
