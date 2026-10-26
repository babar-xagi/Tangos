/**
 * Qutivex route patterns — parsing, matching, specificity, and conflict keys.
 *
 * This package is runtime-agnostic and dependency-free. Core uses it to build
 * the request router; it does not know about Bun or HTTP responses.
 */

export type RouteSegment =
  | { readonly kind: "static"; readonly value: string }
  | { readonly kind: "param"; readonly name: string }
  | { readonly kind: "wildcard" };

export interface RoutePattern {
  readonly path: string;
  readonly segments: readonly RouteSegment[];
  readonly paramNames: readonly string[];
  readonly wildcard: boolean;
}

export interface RouteMatch {
  readonly params: Readonly<Record<string, string>>;
}

/** Thrown when a route path is structurally invalid. */
export class RoutePathError extends Error {
  readonly path: string;

  constructor(message: string, path: string) {
    super(message);
    this.name = "RoutePathError";
    this.path = path;
  }
}

const PARAM_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Validates the shape of a route path before compiling it. */
export function validateRoutePath(path: string): void {
  if (typeof path !== "string" || path.length === 0) {
    throw new RoutePathError("Route paths must be non-empty strings.", String(path));
  }
  if (!path.startsWith("/")) {
    throw new RoutePathError(`Route path "${path}" must start with "/".`, path);
  }
  if (path.includes("?") || path.includes("#")) {
    throw new RoutePathError(
      `Route path "${path}" must not include a query string or fragment.`,
      path,
    );
  }
  if (/\s/.test(path)) {
    throw new RoutePathError(`Route path "${path}" must not contain whitespace.`, path);
  }
}

function splitPath(path: string): string[] {
  return path === "/" ? [] : path.slice(1).split("/");
}

/** Compiles a path such as `/users/:id` or `/assets/*` into a matcher. */
export function compileRoutePattern(path: string): RoutePattern {
  validateRoutePath(path);

  const rawSegments = splitPath(path);
  const segments: RouteSegment[] = [];
  const paramNames: string[] = [];

  rawSegments.forEach((raw, index) => {
    if (raw === "*") {
      if (index !== rawSegments.length - 1) {
        throw new RoutePathError(
          `Wildcard in route path "${path}" must be the final segment.`,
          path,
        );
      }
      segments.push({ kind: "wildcard" });
      return;
    }

    if (raw.startsWith("*")) {
      throw new RoutePathError(
        `Wildcard in route path "${path}" must be written as a standalone "*" segment.`,
        path,
      );
    }

    if (raw.startsWith(":")) {
      const name = raw.slice(1);
      if (!PARAM_NAME.test(name)) {
        throw new RoutePathError(`Invalid parameter "${raw}" in route path "${path}".`, path);
      }
      if (paramNames.includes(name)) {
        throw new RoutePathError(`Duplicate parameter "${name}" in route path "${path}".`, path);
      }
      paramNames.push(name);
      segments.push({ kind: "param", name });
      return;
    }

    segments.push({ kind: "static", value: raw });
  });

  return {
    paramNames,
    path,
    segments,
    wildcard: segments.some((segment) => segment.kind === "wildcard"),
  };
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new URIError(`Malformed percent-encoding in request path: "${value}".`);
  }
}

/** Matches a compiled pattern against a `URL.pathname`-style path. */
export function matchRoutePattern(pattern: RoutePattern, pathname: string): RouteMatch | undefined {
  const actualSegments = splitPath(pathname);
  const params: Record<string, string> = {};

  let index = 0;
  for (const segment of pattern.segments) {
    if (segment.kind === "static") {
      if (actualSegments[index] !== segment.value) {
        return undefined;
      }
      index += 1;
      continue;
    }

    if (segment.kind === "param") {
      const actual = actualSegments[index];
      if (actual === undefined || actual === "") {
        return undefined;
      }
      params[segment.name] = decodeSegment(actual);
      index += 1;
      continue;
    }

    const rest = actualSegments.slice(index).join("/");
    params["*"] = rest === "" ? "" : decodeSegment(rest);
    index = actualSegments.length;
    break;
  }

  if (index !== actualSegments.length) {
    return undefined;
  }

  return { params };
}

/**
 * A stable key for route-shape conflicts: static values are preserved, parameter
 * names are ignored, and wildcards are represented structurally.
 */
export function routePatternKey(pattern: RoutePattern): string {
  return JSON.stringify(
    pattern.segments.map((segment) =>
      segment.kind === "static"
        ? ["static", segment.value]
        : segment.kind === "param"
          ? ["param"]
          : ["wildcard"],
    ),
  );
}

/** Whether a pattern contains no parameters or wildcards. */
export function isStaticPattern(pattern: RoutePattern): boolean {
  return pattern.segments.every((segment) => segment.kind === "static");
}

function segmentRank(segment: RouteSegment | undefined): number {
  if (segment === undefined) {
    // A shorter pattern that already matched every segment is more specific than
    // a trailing wildcard that also matches the empty remainder.
    return 3;
  }
  if (segment.kind === "static") {
    return 2;
  }
  if (segment.kind === "param") {
    return 1;
  }
  return 0;
}

/**
 * Sorts more specific patterns first: static > param > wildcard, left to right.
 * A shorter exact pattern also outranks a trailing wildcard.
 */
export function compareRoutePatterns(a: RoutePattern, b: RoutePattern): number {
  const length = Math.max(a.segments.length, b.segments.length);

  for (let index = 0; index < length; index += 1) {
    const difference = segmentRank(b.segments[index]) - segmentRank(a.segments[index]);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

/** Joins a group prefix and a route path, normalising trailing slashes. */
export function joinRoutePaths(prefix: string, path: string): string {
  validateRoutePath(prefix);
  validateRoutePath(path);

  const base = prefix === "/" ? "" : prefix.replace(/\/+$/, "");
  if (path === "/") {
    return base === "" ? "/" : base;
  }

  return `${base}${path}`;
}
