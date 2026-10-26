import {
  compareRoutePatterns,
  compileRoutePattern,
  matchRoutePattern,
  type RoutePattern,
  routePatternKey,
} from "@qutivex/router";
import { ConfigurationError } from "./errors";
import type { WebSocketHandlers } from "./types";

interface WebSocketEntry {
  readonly handlers: WebSocketHandlers;
  readonly path: string;
  readonly pattern: RoutePattern;
}

export interface WebSocketRouteMatch {
  readonly handlers: WebSocketHandlers;
  readonly params: Readonly<Record<string, string>>;
}

const HANDLER_NAMES = ["open", "message", "close", "drain"] as const;

/** WebSocket route registry. Uses the same pattern rules as HTTP routes. */
export class WebSocketTable {
  readonly #entries: WebSocketEntry[] = [];
  readonly #shapes = new Map<string, WebSocketEntry>();

  add(path: string, handlers: WebSocketHandlers): void {
    let pattern: RoutePattern;
    try {
      pattern = compileRoutePattern(path);
    } catch (error) {
      throw new ConfigurationError((error as Error).message, { cause: error });
    }

    if (handlers === null || typeof handlers !== "object") {
      throw new ConfigurationError(`WebSocket handlers for ${path} must be an object.`);
    }

    for (const name of HANDLER_NAMES) {
      const handler = handlers[name];
      if (handler !== undefined && typeof handler !== "function") {
        throw new ConfigurationError(`WebSocket "${name}" handler for ${path} must be a function.`);
      }
    }

    const shapeKey = routePatternKey(pattern);
    const conflict = this.#shapes.get(shapeKey);
    if (conflict !== undefined) {
      throw new ConfigurationError(
        `Conflicting WebSocket route: ${path} overlaps ${conflict.path}.`,
      );
    }

    const entry: WebSocketEntry = { handlers, path, pattern };
    this.#shapes.set(shapeKey, entry);
    this.#entries.push(entry);
    this.#entries.sort((left, right) => compareRoutePatterns(left.pattern, right.pattern));
  }

  match(pathname: string): WebSocketRouteMatch | undefined {
    for (const entry of this.#entries) {
      const matched = matchRoutePattern(entry.pattern, pathname);
      if (matched !== undefined) {
        return { handlers: entry.handlers, params: matched.params };
      }
    }
    return undefined;
  }

  list(): readonly { path: string }[] {
    return this.#entries.map((entry) => ({ path: entry.path }));
  }

  get size(): number {
    return this.#entries.length;
  }
}
