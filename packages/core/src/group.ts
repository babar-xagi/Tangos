import { joinRoutePaths } from "@qutivex/router";
import { ConfigurationError } from "./errors";
import type { Handler, HttpMethod, Middleware, RouteOptions } from "./types";

export interface GroupOptions {
  middleware?: readonly Middleware[];
  metadata?: Readonly<Record<string, unknown>>;
}

export type RouteRegistrar = (
  method: HttpMethod,
  path: string,
  handler: Handler,
  options: RouteOptions,
) => void;

export interface ResolvedRouteArguments {
  readonly handler: Handler;
  readonly options: RouteOptions;
}

function joinPrefix(prefix: string, path: string): string {
  try {
    return joinRoutePaths(prefix, path);
  } catch (error) {
    throw new ConfigurationError((error as Error).message, { cause: error });
  }
}

/** Normalizes `(handler)` and `(options, handler)` overloads. */
export function resolveRouteArguments(
  optionsOrHandler: RouteOptions | Handler,
  maybeHandler?: Handler,
): ResolvedRouteArguments {
  if (typeof optionsOrHandler === "function") {
    return { handler: optionsOrHandler, options: {} };
  }

  if (optionsOrHandler === null || typeof optionsOrHandler !== "object") {
    throw new ConfigurationError("Route options must be an object or a handler function.");
  }
  if (typeof maybeHandler !== "function") {
    throw new ConfigurationError("A route handler function is required.");
  }

  return { handler: maybeHandler, options: optionsOrHandler };
}

/**
 * A prefixed route group with shared middleware and metadata.
 *
 * Group middleware runs after global middleware and before route middleware.
 * `use()` only affects routes registered afterwards.
 */
export class RouteGroup {
  readonly #metadata: Readonly<Record<string, unknown>>;
  readonly #middleware: Middleware[];
  readonly #prefix: string;
  readonly #register: RouteRegistrar;

  constructor(
    register: RouteRegistrar,
    prefix: string,
    middleware: readonly Middleware[] = [],
    metadata: Readonly<Record<string, unknown>> = {},
  ) {
    // Validate the prefix immediately, even before a route is added.
    joinPrefix(prefix, "/");

    this.#register = register;
    this.#prefix = prefix;
    this.#middleware = [...middleware];
    this.#metadata = metadata;
  }

  get path(): string {
    return this.#prefix;
  }

  use(middleware: Middleware): this {
    if (typeof middleware !== "function") {
      throw new ConfigurationError("Middleware must be a function.");
    }
    this.#middleware.push(middleware);
    return this;
  }

  group(prefix: string, options: GroupOptions = {}): RouteGroup {
    return new RouteGroup(
      this.#register,
      joinPrefix(this.#prefix, prefix),
      [...this.#middleware, ...(options.middleware ?? [])],
      { ...this.#metadata, ...options.metadata },
    );
  }

  get(path: string, handler: Handler): this;
  get(path: string, options: RouteOptions, handler: Handler): this;
  get(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    return this.#route("GET", path, optionsOrHandler, maybeHandler);
  }

  post(path: string, handler: Handler): this;
  post(path: string, options: RouteOptions, handler: Handler): this;
  post(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    return this.#route("POST", path, optionsOrHandler, maybeHandler);
  }

  put(path: string, handler: Handler): this;
  put(path: string, options: RouteOptions, handler: Handler): this;
  put(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    return this.#route("PUT", path, optionsOrHandler, maybeHandler);
  }

  patch(path: string, handler: Handler): this;
  patch(path: string, options: RouteOptions, handler: Handler): this;
  patch(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    return this.#route("PATCH", path, optionsOrHandler, maybeHandler);
  }

  delete(path: string, handler: Handler): this;
  delete(path: string, options: RouteOptions, handler: Handler): this;
  delete(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    return this.#route("DELETE", path, optionsOrHandler, maybeHandler);
  }

  options(path: string, handler: Handler): this;
  options(path: string, options: RouteOptions, handler: Handler): this;
  options(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    return this.#route("OPTIONS", path, optionsOrHandler, maybeHandler);
  }

  head(path: string, handler: Handler): this;
  head(path: string, options: RouteOptions, handler: Handler): this;
  head(path: string, optionsOrHandler: RouteOptions | Handler, maybeHandler?: Handler): this {
    return this.#route("HEAD", path, optionsOrHandler, maybeHandler);
  }

  #route(
    method: HttpMethod,
    path: string,
    optionsOrHandler: RouteOptions | Handler,
    maybeHandler?: Handler,
  ): this {
    const resolved = resolveRouteArguments(optionsOrHandler, maybeHandler);
    const metadata = { ...this.#metadata, ...resolved.options.metadata };
    const options: RouteOptions = {
      ...resolved.options,
      middleware: [...this.#middleware, ...(resolved.options.middleware ?? [])],
    };

    if (Object.keys(metadata).length > 0) {
      options.metadata = metadata;
    }

    this.#register(method, joinPrefix(this.#prefix, path), resolved.handler, options);
    return this;
  }
}
