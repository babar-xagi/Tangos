import {
  ConfigurationError,
  LifecycleError,
  QutivexError,
  ServerShutdownError,
  ServerStartError,
} from "./errors";
import { errorResponse, notFoundResponse, toResponse, withoutBody } from "./response";
import { RouteTable } from "./routes";
import type {
  AppOptions,
  AppState,
  ErrorContext,
  ErrorHandler,
  Handler,
  HttpMethod,
  HttpServer,
  HttpServerAdapter,
  ListenOptions,
  RequestContext,
  RouteInfo,
  RunningAppInfo,
  ShutdownHook,
} from "./types";

const DEFAULT_HOSTNAME = "127.0.0.1";
const DEFAULT_PORT = 3000;
const DEFAULT_NAME = "Qutivex";

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

/**
 * Qutivex application core.
 *
 * The core owns lifecycle, routes, response semantics, and graceful shutdown.
 * HTTP runtime details live behind an {@link HttpServerAdapter}; the public
 * `qutivex` package wires in the Bun adapter by default.
 */
export class App {
  readonly #adapter: HttpServerAdapter | undefined;
  readonly #banner: boolean;
  readonly #development: boolean;
  readonly #hooks: ShutdownHook[] = [];
  readonly #hostname: string;
  readonly #name: string;
  readonly #onError: ErrorHandler | undefined;
  readonly #port: number;
  readonly #routes = new RouteTable();

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

    const development = options.development ?? process.env.NODE_ENV !== "production";

    this.#adapter = options.adapter;
    this.#banner = options.banner ?? development;
    this.#development = development;
    this.#hostname = hostname;
    this.#name = name;
    this.#onError = options.onError;
    this.#port = port;
  }

  get state(): AppState {
    return this.#state;
  }

  get name(): string {
    return this.#name;
  }

  /** The bound URL once the app is running, otherwise undefined. */
  get url(): URL | undefined {
    return this.#serverInfo?.url;
  }

  /** Registered routes in registration order, grouped by method. */
  get routes(): readonly RouteInfo[] {
    return this.#routes.list();
  }

  get(path: string, handler: Handler): this {
    return this.#route("GET", path, handler);
  }

  post(path: string, handler: Handler): this {
    return this.#route("POST", path, handler);
  }

  put(path: string, handler: Handler): this {
    return this.#route("PUT", path, handler);
  }

  patch(path: string, handler: Handler): this {
    return this.#route("PATCH", path, handler);
  }

  delete(path: string, handler: Handler): this {
    return this.#route("DELETE", path, handler);
  }

  options(path: string, handler: Handler): this {
    return this.#route("OPTIONS", path, handler);
  }

  head(path: string, handler: Handler): this {
    return this.#route("HEAD", path, handler);
  }

  /** Registers a hook that runs during graceful shutdown, last registered first. */
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
   * returns the same address; route registration must happen before startup.
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

    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const routeMethod =
        method === "HEAD" && !this.#routes.has("HEAD", path) ? "GET" : (method as HttpMethod);

      const handler = this.#routes.match(routeMethod, path);
      if (handler === undefined) {
        return this.#finalize(notFoundResponse(), method);
      }

      const context: RequestContext = {
        method,
        path,
        request,
        url,
      };
      const response = toResponse(await handler(context));
      return this.#finalize(response, method);
    } catch (error) {
      this.#report(error, { request });
      return this.#finalize(errorResponse(error), method);
    }
  }

  #finalize(response: Response, method: string): Response {
    return method === "HEAD" ? withoutBody(response) : response;
  }

  #route(method: HttpMethod, path: string, handler: Handler): this {
    this.#assertConfigurable();
    this.#routes.add(method, path, handler);

    if (this.#state === "created") {
      this.#state = "configured";
    }

    return this;
  }

  #assertConfigurable(): void {
    if (this.#state !== "created" && this.#state !== "configured") {
      throw new LifecycleError(
        `Cannot register routes while the app is "${this.#state}". Register routes before starting.`,
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
      const server = await adapter.start({
        development: this.#development,
        fetch: (request) => this.fetch(request),
        hostname,
        port,
      });

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
    const elapsed = Math.max(0, Math.round(duration));

    console.log(
      `\n  ${this.#name}\n  ➜  ${info.url.href}\n  ${count} ${routeLabel} | ${elapsed}ms\n`,
    );
  }

  #report(error: unknown, context: ErrorContext): void {
    if (this.#onError === undefined) {
      return;
    }

    try {
      this.#onError(error, context);
    } catch {
      // An observer must never break request handling or shutdown.
    }
  }
}
