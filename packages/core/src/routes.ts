import {
  compareRoutePatterns,
  compileRoutePattern,
  isStaticPattern,
  matchRoutePattern,
  type RoutePattern,
  routePatternKey,
} from "@qutivex/router";
import { ConfigurationError } from "./errors";
import type { Handler, HttpMethod, RouteInfo, RouteOptions } from "./types";
import { HTTP_METHODS } from "./types";

interface RouteEntry {
  readonly handler: Handler;
  readonly method: HttpMethod;
  readonly options: RouteOptions;
  readonly path: string;
  readonly pattern: RoutePattern;
}

export interface RouteMatch {
  readonly entry: RouteEntry;
  readonly params: Readonly<Record<string, string>>;
}

/** Route registry with static, parameter, wildcard, and metadata support. */
export class RouteTable {
  readonly #entries: RouteEntry[] = [];
  readonly #names = new Map<string, RouteEntry>();
  readonly #patterns = new Map<HttpMethod, RouteEntry[]>();
  readonly #shapes = new Map<string, RouteEntry>();
  readonly #static = new Map<HttpMethod, Map<string, RouteEntry>>();

  add(method: HttpMethod, path: string, handler: Handler, options: RouteOptions = {}): void {
    let pattern: RoutePattern;
    try {
      pattern = compileRoutePattern(path);
    } catch (error) {
      throw new ConfigurationError((error as Error).message, { cause: error });
    }

    if (typeof handler !== "function") {
      throw new ConfigurationError(`Handler for ${method} ${path} must be a function.`);
    }

    for (const middleware of options.middleware ?? []) {
      if (typeof middleware !== "function") {
        throw new ConfigurationError(`Middleware for ${method} ${path} must be a function.`);
      }
    }

    const shapeKey = `${method}\u0000${routePatternKey(pattern)}`;
    const conflict = this.#shapes.get(shapeKey);
    if (conflict !== undefined) {
      throw new ConfigurationError(
        `Conflicting route: ${method} ${path} overlaps ${conflict.method} ${conflict.path}.`,
      );
    }

    if (options.name !== undefined) {
      if (typeof options.name !== "string" || options.name.trim() === "") {
        throw new ConfigurationError(`Route name for ${method} ${path} must be non-empty.`);
      }
      if (/\s/.test(options.name)) {
        throw new ConfigurationError(`Route name "${options.name}" must not contain whitespace.`);
      }
      const named = this.#names.get(options.name);
      if (named !== undefined) {
        throw new ConfigurationError(
          `Duplicate route name "${options.name}" on ${named.method} ${named.path}.`,
        );
      }
    }

    const entry: RouteEntry = {
      handler,
      method,
      options,
      path,
      pattern,
    };

    this.#shapes.set(shapeKey, entry);
    this.#entries.push(entry);

    if (options.name !== undefined) {
      this.#names.set(options.name, entry);
    }

    if (isStaticPattern(pattern)) {
      let methodRoutes = this.#static.get(method);
      if (methodRoutes === undefined) {
        methodRoutes = new Map();
        this.#static.set(method, methodRoutes);
      }
      methodRoutes.set(path, entry);
      return;
    }

    let methodPatterns = this.#patterns.get(method);
    if (methodPatterns === undefined) {
      methodPatterns = [];
      this.#patterns.set(method, methodPatterns);
    }
    methodPatterns.push(entry);
    methodPatterns.sort((left, right) => compareRoutePatterns(left.pattern, right.pattern));
  }

  match(method: HttpMethod, pathname: string): RouteMatch | undefined {
    const exact = this.#static.get(method)?.get(pathname);
    if (exact !== undefined) {
      return { entry: exact, params: {} };
    }

    for (const entry of this.#patterns.get(method) ?? []) {
      const matched = matchRoutePattern(entry.pattern, pathname);
      if (matched !== undefined) {
        return { entry, params: matched.params };
      }
    }

    return undefined;
  }

  /** Methods that match this path. GET implies HEAD for the Allow header. */
  allowedMethods(pathname: string): readonly HttpMethod[] {
    const allowed = new Set<HttpMethod>();

    for (const method of HTTP_METHODS) {
      if (this.match(method, pathname) !== undefined) {
        allowed.add(method);
      }
    }

    if (allowed.has("GET") && !allowed.has("HEAD")) {
      allowed.add("HEAD");
    }

    return HTTP_METHODS.filter((method) => allowed.has(method));
  }

  list(): readonly RouteInfo[] {
    return this.#entries.map((entry) => {
      const info: {
        method: HttpMethod;
        path: string;
        name?: string;
        metadata?: Readonly<Record<string, unknown>>;
      } = {
        method: entry.method,
        path: entry.path,
      };

      if (entry.options.name !== undefined) {
        info.name = entry.options.name;
      }
      if (entry.options.metadata !== undefined) {
        info.metadata = entry.options.metadata;
      }

      return info;
    });
  }

  get size(): number {
    return this.#entries.length;
  }
}
