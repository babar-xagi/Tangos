import { describe, expect, test } from "bun:test";
import {
  compareRoutePatterns,
  compileRoutePattern,
  isStaticPattern,
  joinRoutePaths,
  matchRoutePattern,
  RoutePathError,
  routePatternKey,
  validateRoutePath,
} from "../src/index";

describe("route path compilation", () => {
  test("compiles static, parameter, and wildcard patterns", () => {
    const users = compileRoutePattern("/users/:id");
    const assets = compileRoutePattern("/assets/*");

    expect(users.path).toBe("/users/:id");
    expect(users.paramNames).toEqual(["id"]);
    expect(users.wildcard).toBe(false);
    expect(users.segments).toEqual([
      { kind: "static", value: "users" },
      { kind: "param", name: "id" },
    ]);

    expect(assets.wildcard).toBe(true);
    expect(assets.segments.at(-1)).toEqual({ kind: "wildcard" });
  });

  test("treats root and trailing slashes as distinct static paths", () => {
    expect(compileRoutePattern("/").segments).toEqual([]);
    expect(compileRoutePattern("/users/").segments).toEqual([
      { kind: "static", value: "users" },
      { kind: "static", value: "" },
    ]);
  });

  test("rejects invalid paths and parameters", () => {
    expect(() => validateRoutePath("")).toThrow(RoutePathError);
    expect(() => validateRoutePath("users")).toThrow(RoutePathError);
    expect(() => validateRoutePath("/users?x=1")).toThrow(RoutePathError);
    expect(() => validateRoutePath("/users#top")).toThrow(RoutePathError);
    expect(() => validateRoutePath("/has space")).toThrow(RoutePathError);
    expect(() => compileRoutePattern("/users/:")).toThrow(RoutePathError);
    expect(() => compileRoutePattern("/users/:1id")).toThrow(RoutePathError);
    expect(() => compileRoutePattern("/users/:id/:id")).toThrow(RoutePathError);
    expect(() => compileRoutePattern("/files/*/more")).toThrow(RoutePathError);
    expect(() => compileRoutePattern("/files/*name")).toThrow(RoutePathError);
  });
});

describe("route matching", () => {
  test("matches static and parameter routes and decodes params", () => {
    const pattern = compileRoutePattern("/orgs/:orgId/users/:userId");

    expect(matchRoutePattern(pattern, "/orgs/acme/users/42")).toEqual({
      params: { orgId: "acme", userId: "42" },
    });
    expect(matchRoutePattern(pattern, "/orgs/acme/users/hello%20world")).toEqual({
      params: { orgId: "acme", userId: "hello world" },
    });
    expect(matchRoutePattern(pattern, "/orgs/acme/users")).toBeUndefined();
    expect(matchRoutePattern(pattern, "/orgs//users/42")).toBeUndefined();
  });

  test("wildcards capture the rest of the path and may be empty", () => {
    const pattern = compileRoutePattern("/assets/*");

    expect(matchRoutePattern(pattern, "/assets/css/app.css")).toEqual({
      params: { "*": "css/app.css" },
    });
    expect(matchRoutePattern(pattern, "/assets")).toEqual({ params: { "*": "" } });
    expect(matchRoutePattern(pattern, "/other/css/app.css")).toBeUndefined();
  });

  test("keeps trailing slashes distinct", () => {
    const pattern = compileRoutePattern("/users");

    expect(matchRoutePattern(pattern, "/users")).toEqual({ params: {} });
    expect(matchRoutePattern(pattern, "/users/")).toBeUndefined();
    expect(matchRoutePattern(compileRoutePattern("/users/"), "/users/")).toEqual({
      params: {},
    });
  });

  test("throws on malformed percent-encoding", () => {
    expect(() => matchRoutePattern(compileRoutePattern("/users/:id"), "/users/%E0%A4%A")).toThrow(
      URIError,
    );
  });
});

describe("route specificity and keys", () => {
  test("orders static before param before wildcard", () => {
    const staticRoute = compileRoutePattern("/users/me");
    const paramRoute = compileRoutePattern("/users/:id");
    const wildcardRoute = compileRoutePattern("/users/*");

    const sorted = [wildcardRoute, paramRoute, staticRoute].sort(compareRoutePatterns);

    expect(sorted.map((pattern) => pattern.path)).toEqual(["/users/me", "/users/:id", "/users/*"]);
  });

  test("prefers a shorter exact route over a trailing wildcard", () => {
    const exact = compileRoutePattern("/files");
    const wildcard = compileRoutePattern("/files/*");

    expect(compareRoutePatterns(exact, wildcard)).toBeLessThan(0);
  });

  test("builds conflict keys independent of parameter names", () => {
    expect(routePatternKey(compileRoutePattern("/users/:id"))).toBe(
      routePatternKey(compileRoutePattern("/users/:userId")),
    );
    expect(routePatternKey(compileRoutePattern("/users/:id"))).not.toBe(
      routePatternKey(compileRoutePattern("/posts/:id")),
    );
    expect(routePatternKey(compileRoutePattern("/assets/*"))).not.toBe(
      routePatternKey(compileRoutePattern("/assets/:path")),
    );
  });

  test("identifies static patterns", () => {
    expect(isStaticPattern(compileRoutePattern("/health"))).toBe(true);
    expect(isStaticPattern(compileRoutePattern("/users/:id"))).toBe(false);
    expect(isStaticPattern(compileRoutePattern("/assets/*"))).toBe(false);
  });
});

describe("group path joining", () => {
  test("joins prefixes and routes without duplicate slashes", () => {
    expect(joinRoutePaths("/api", "/users")).toBe("/api/users");
    expect(joinRoutePaths("/api/", "/users")).toBe("/api/users");
    expect(joinRoutePaths("/", "/users")).toBe("/users");
    expect(joinRoutePaths("/api", "/")).toBe("/api");
    expect(joinRoutePaths("/", "/")).toBe("/");
  });

  test("rejects invalid prefixes", () => {
    expect(() => joinRoutePaths("api", "/users")).toThrow(RoutePathError);
    expect(() => joinRoutePaths("/api", "users")).toThrow(RoutePathError);
  });
});
