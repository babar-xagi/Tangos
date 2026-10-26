import { ConfigurationError } from "./errors";
import type { Handler, HttpMethod, RouteInfo } from "./types";

interface RouteEntry {
  readonly handler: Handler;
}

function validatePath(path: string): void {
  if (typeof path !== "string" || path.length === 0) {
    throw new ConfigurationError("Route paths must be non-empty strings.");
  }
  if (!path.startsWith("/")) {
    throw new ConfigurationError(`Route path "${path}" must start with "/".`);
  }
  if (path.includes("?") || path.includes("#")) {
    throw new ConfigurationError(
      `Route path "${path}" must not include a query string or fragment.`,
    );
  }
  if (/\s/.test(path)) {
    throw new ConfigurationError(`Route path "${path}" must not contain whitespace.`);
  }
}

/** Exact-match route table for the Phase 2 core. */
export class RouteTable {
  readonly #routes = new Map<HttpMethod, Map<string, RouteEntry>>();

  add(method: HttpMethod, path: string, handler: Handler): void {
    validatePath(path);

    if (typeof handler !== "function") {
      throw new ConfigurationError(`Handler for ${method} ${path} must be a function.`);
    }

    let methodRoutes = this.#routes.get(method);
    if (methodRoutes === undefined) {
      methodRoutes = new Map();
      this.#routes.set(method, methodRoutes);
    }

    if (methodRoutes.has(path)) {
      throw new ConfigurationError(`Duplicate route: ${method} ${path} is already registered.`);
    }

    methodRoutes.set(path, { handler });
  }

  has(method: HttpMethod, path: string): boolean {
    return this.#routes.get(method)?.has(path) ?? false;
  }

  match(method: HttpMethod, path: string): Handler | undefined {
    return this.#routes.get(method)?.get(path)?.handler;
  }

  get size(): number {
    let total = 0;
    for (const methodRoutes of this.#routes.values()) {
      total += methodRoutes.size;
    }
    return total;
  }

  list(): readonly RouteInfo[] {
    const routes: RouteInfo[] = [];
    for (const [method, methodRoutes] of this.#routes) {
      for (const path of methodRoutes.keys()) {
        routes.push({ method, path });
      }
    }
    return routes;
  }
}
