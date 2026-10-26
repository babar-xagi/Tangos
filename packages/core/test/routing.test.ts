import { describe, expect, test } from "bun:test";
import {
  type AdapterStartOptions,
  App,
  type AppOptions,
  ConfigurationError,
  type Handler,
  type HttpServer,
  type HttpServerAdapter,
  LifecycleError,
  type Middleware,
  type RouteOptions,
} from "../src/index";
import { RouteTable } from "../src/routes";

class TestAdapter implements HttpServerAdapter {
  start(options: AdapterStartOptions): HttpServer {
    const port = options.port === 0 ? 4567 : options.port;
    return {
      hostname: options.hostname,
      port,
      stop: async () => {},
      url: new URL(`http://${options.hostname}:${port}`),
    };
  }
}

function createApp(options: AppOptions = {}): App {
  return new App({
    adapter: new TestAdapter(),
    banner: false,
    development: false,
    ...options,
  });
}

function get(app: App, path: string, method = "GET"): Promise<Response> {
  return app.fetch(new Request(`http://localhost${path}`, { method }));
}

describe("path parameters and wildcards", () => {
  test("matches one and multiple parameters and decodes values", async () => {
    const app = createApp();
    app.get("/orgs/:orgId/users/:userId", (ctx) => ctx.params);

    const response = await get(app, "/orgs/acme/users/hello%20world");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ orgId: "acme", userId: "hello world" });
  });

  test("captures wildcard paths, including the empty remainder", async () => {
    const app = createApp();
    app.get("/assets/*", (ctx) => ({ rest: ctx.params["*"] }));

    expect(await (await get(app, "/assets/css/app.css")).json()).toEqual({
      rest: "css/app.css",
    });
    expect(await (await get(app, "/assets")).json()).toEqual({ rest: "" });
  });

  test("prefers static over parameter over wildcard routes", async () => {
    const app = createApp();
    app.get("/users/me", () => "static");
    app.get("/users/:id", (ctx) => `param:${ctx.params.id}`);
    app.get("/users/*", (ctx) => `wildcard:${ctx.params["*"]}`);

    expect(await (await get(app, "/users/me")).text()).toBe("static");
    expect(await (await get(app, "/users/42")).text()).toBe("param:42");
    expect(await (await get(app, "/users/a/b")).text()).toBe("wildcard:a/b");
  });

  test("keeps trailing slashes distinct", async () => {
    const app = createApp();
    app.get("/users", () => "no slash");
    app.get("/users/", () => "slash");

    expect(await (await get(app, "/users")).text()).toBe("no slash");
    expect(await (await get(app, "/users/")).text()).toBe("slash");
  });

  test("rejects malformed percent-encoding with a safe 400", async () => {
    const app = createApp();
    app.get("/users/:id", () => "ok");

    const response = await get(app, "/users/%E0%A4%A");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_PATH_ENCODING",
        message: "Malformed URL encoding in the request path.",
      },
    });
  });
});

describe("405 and HEAD behavior", () => {
  test("returns 405 with Allow for a known path and wrong method", async () => {
    const app = createApp();
    app.post("/only-post", () => "created");

    const response = await get(app, "/only-post");

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(await response.json()).toEqual({
      error: { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" },
    });
  });

  test("includes implicit HEAD when GET is allowed", async () => {
    const app = createApp();
    app.get("/users", () => "ok");

    const response = await get(app, "/users", "POST");

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
  });

  test("returns a bodyless 405 for HEAD without a GET route", async () => {
    const app = createApp();
    app.post("/only-post", () => "created");

    const response = await get(app, "/only-post", "HEAD");

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(await response.text()).toBe("");
  });

  test("falls back from HEAD to a parameterized GET route", async () => {
    const app = createApp();
    app.get("/items/:id", () => "body");

    const response = await get(app, "/items/42", "HEAD");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  test("returns 404 for an unknown path and 405 for a known path", async () => {
    const app = createApp();
    app.get("/known", () => "ok");

    expect((await get(app, "/unknown")).status).toBe(404);
    expect((await get(app, "/unknown", "HEAD")).status).toBe(404);
    expect((await get(app, "/known", "POST")).status).toBe(405);
  });

  test("handles an unsupported HTTP method as 405 when the path exists", async () => {
    const app = createApp();
    app.get("/known", () => "ok");

    const response = await get(app, "/known", "PURGE");

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
  });
});

describe("route configuration and introspection", () => {
  test("rejects overlapping parameter routes", () => {
    const app = createApp();
    app.get("/users/:id", () => "ok");

    expect(() => app.get("/users/:name", () => "again")).toThrow(ConfigurationError);
  });

  test("allows static routes to coexist with parameter routes", async () => {
    const app = createApp();
    app.get("/users/:id", () => "param");
    app.get("/users/me", () => "static");

    expect(await (await get(app, "/users/me")).text()).toBe("static");
    expect(await (await get(app, "/users/42")).text()).toBe("param");
  });

  test("rejects duplicate names and invalid route options", () => {
    const app = createApp();
    app.get("/a", { name: "same" }, () => "a");

    expect(() => app.get("/b", { name: "same" }, () => "b")).toThrow(ConfigurationError);
    expect(() => app.get("/c", { name: "" }, () => "c")).toThrow(ConfigurationError);
    expect(() => app.get("/d", { name: "has space" }, () => "d")).toThrow(ConfigurationError);
    expect(() =>
      app.get("/e", { middleware: ["nope" as unknown as Middleware] }, () => "e"),
    ).toThrow(ConfigurationError);
  });

  test("exposes method, path, name, and metadata", () => {
    const app = createApp();
    const metadata = { auth: true, tags: ["users"] };
    app.get("/users/:id", { metadata, name: "users.show" }, () => "ok");
    app.post("/users", () => "created");

    expect(app.routes).toEqual([
      { method: "GET", metadata, name: "users.show", path: "/users/:id" },
      { method: "POST", path: "/users" },
    ]);
  });

  test("rejects registration after startup and after stop", async () => {
    const app = createApp();
    app.get("/", () => "ok");
    await app.listen({ port: 0 });

    expect(() => app.get("/late", () => "late")).toThrow(LifecycleError);
    await app.stop();
    expect(() => app.get("/later", () => "later")).toThrow(LifecycleError);
  });
});

describe("route groups", () => {
  test("prefixes and nests routes", async () => {
    const app = createApp();
    const api = app.group("/api");
    const admin = api.group("/admin");

    api.get("/users/:id", (ctx) => ({ id: ctx.params.id }));
    admin.get("/stats", () => ({ ok: true }));

    expect(api.path).toBe("/api");
    expect(admin.path).toBe("/api/admin");
    expect(await (await get(app, "/api/users/42")).json()).toEqual({ id: "42" });
    expect(await (await get(app, "/api/admin/stats")).json()).toEqual({ ok: true });
  });

  test("registers every HTTP method through a group", () => {
    const app = createApp();
    const api = app.group("/api");

    const chained = api
      .get("/m", () => "GET")
      .post("/m", () => "POST")
      .put("/m", () => "PUT")
      .patch("/m", () => "PATCH")
      .delete("/m", () => "DELETE")
      .options("/m", () => "OPTIONS")
      .head("/m", () => "HEAD");

    expect(chained).toBe(api);
    expect(app.routes).toHaveLength(7);
    expect(new Set(app.routes.map((route) => route.path))).toEqual(new Set(["/api/m"]));
  });

  test("merges group and route metadata", async () => {
    const app = createApp();
    const api = app.group("/api", { metadata: { section: "api" } });
    api.get("/users", { name: "api.users", metadata: { auth: true } }, () => "ok");

    expect(app.routes[0]).toEqual({
      method: "GET",
      metadata: { auth: true, section: "api" },
      name: "api.users",
      path: "/api/users",
    });
  });

  test("supports group options and rejects invalid prefixes", () => {
    const app = createApp();

    expect(() => app.group("api")).toThrow(ConfigurationError);
    expect(() => app.group("/api", { middleware: ["nope" as unknown as Middleware] })).toThrow(
      ConfigurationError,
    );
  });

  test("rejects group registration after startup", async () => {
    const app = createApp();
    const group = app.group("/api");
    group.get("/before", () => "ok");
    await app.listen({ port: 0 });

    expect(() => group.get("/after", () => "late")).toThrow(LifecycleError);
    await app.stop();
  });

  test("applies route-level options through groups", async () => {
    const app = createApp();
    const api = app.group("/api");
    const options: RouteOptions = { name: "grouped" };
    api.get("/named", options, () => "ok");

    expect(app.routes[0]?.name).toBe("grouped");
  });
});

describe("route handler type boundary", () => {
  test("rejects a non-function handler at runtime", () => {
    const app = createApp();

    expect(() => app.get("/", "nope" as unknown as Handler)).toThrow(ConfigurationError);
    expect(() => app.get("/", {}, "nope" as unknown as Handler)).toThrow(ConfigurationError);
  });

  test("RouteTable rejects a non-function handler directly", () => {
    const table = new RouteTable();

    expect(() => table.add("GET", "/", "nope" as unknown as Handler)).toThrow(ConfigurationError);
  });
});
