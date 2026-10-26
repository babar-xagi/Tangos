import { describe, expect, test } from "bun:test";
import {
  type AdapterStartOptions,
  App,
  HttpError,
  type HttpServer,
  type HttpServerAdapter,
  LifecycleError,
  type Middleware,
} from "../src/index";

class TestAdapter implements HttpServerAdapter {
  start(options: AdapterStartOptions): HttpServer {
    const port = options.port === 0 ? 4568 : options.port;
    return {
      hostname: options.hostname,
      port,
      stop: async () => {},
      url: new URL(`http://${options.hostname}:${port}`),
    };
  }
}

function createApp(): App {
  return new App({ adapter: new TestAdapter(), banner: false, development: false });
}

function get(app: App, path: string): Promise<Response> {
  return app.fetch(new Request(`http://localhost${path}`));
}

describe("middleware order and composition", () => {
  test("runs global middleware in order and lets it modify the response", async () => {
    const app = createApp();
    const order: string[] = [];

    app.use(async (_ctx, next) => {
      order.push("global-1");
      const response = await next();
      response.headers.set("x-global", "yes");
      return response;
    });
    app.use(async (_ctx, next) => {
      order.push("global-2");
      return next();
    });
    app.get("/", () => {
      order.push("handler");
      return { ok: true };
    });

    const response = await get(app, "/");

    expect(order).toEqual(["global-1", "global-2", "handler"]);
    expect(response.headers.get("x-global")).toBe("yes");
  });

  test("orders global, group, and route middleware before the handler", async () => {
    const app = createApp();
    const order: string[] = [];
    const mark =
      (name: string): Middleware =>
      async (_ctx, next) => {
        order.push(name);
        return next();
      };

    app.use(mark("global"));
    const api = app.group("/api", { middleware: [mark("group")] });
    api.get("/x", { middleware: [mark("route")] }, () => {
      order.push("handler");
      return "ok";
    });

    expect(await (await get(app, "/api/x")).text()).toBe("ok");
    expect(order).toEqual(["global", "group", "route", "handler"]);
  });

  test("shares one context and state between middleware and handler", async () => {
    const app = createApp();
    const key = Symbol("key");
    type StateValue = { from: string };

    app.use(async (ctx, next) => {
      ctx.state.set(key, { from: "middleware" });
      expect(ctx.params).toEqual({ id: "42" });
      return next();
    });
    app.get("/users/:id", (ctx) => ctx.state.get(key) as StateValue);

    expect(await (await get(app, "/users/42")).json()).toEqual({ from: "middleware" });
  });

  test("supports route middleware directly on a route", async () => {
    const app = createApp();
    app.get(
      "/direct",
      {
        middleware: [
          (_ctx, next) => {
            return next();
          },
        ],
      },
      () => "ok",
    );

    expect(await (await get(app, "/direct")).text()).toBe("ok");
  });
});

describe("short-circuiting and invalid middleware", () => {
  test("short-circuits when middleware does not call next", async () => {
    const app = createApp();
    let handlerCalled = false;

    app.use(() => new Response("blocked", { status: 401 }));
    app.get("/", () => {
      handlerCalled = true;
      return "handler";
    });

    const response = await get(app, "/");

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("blocked");
    expect(handlerCalled).toBe(false);
  });

  test("rejects calling next twice", async () => {
    const app = createApp();
    const errors: unknown[] = [];

    app.use(async (_ctx, next) => {
      await next();
      return next();
    });
    app.get("/", () => "ok");
    app.onError((error) => errors.push(error));

    const response = await get(app, "/");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "MIDDLEWARE_NEXT_CALLED_TWICE", message: "Internal Server Error" },
    });
    expect((errors[0] as { code?: string }).code).toBe("MIDDLEWARE_NEXT_CALLED_TWICE");
  });

  test("rejects a middleware that does not return a Response", async () => {
    const app = createApp();
    const errors: unknown[] = [];

    app.use((() => undefined) as unknown as Middleware);
    app.get("/", () => "ok");
    app.onError((error) => errors.push(error));

    const response = await get(app, "/");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_MIDDLEWARE_RESULT", message: "Internal Server Error" },
    });
    expect((errors[0] as { code?: string }).code).toBe("INVALID_MIDDLEWARE_RESULT");
  });

  test("propagates thrown HttpErrors from middleware", async () => {
    const app = createApp();
    app.use(() => {
      throw HttpError.forbidden("No access");
    });
    app.get("/", () => "ok");

    const response = await get(app, "/");

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: { code: "FORBIDDEN", message: "No access" },
    });
  });

  test("normalizes generic middleware errors without leaking details", async () => {
    const app = createApp();
    app.use(() => {
      throw new Error("private middleware detail");
    });
    app.get("/", () => "ok");

    const response = await get(app, "/");
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain("private middleware detail");
  });
});

describe("before and after hooks", () => {
  test("runs before and after hooks around the handler", async () => {
    const app = createApp();
    const order: string[] = [];

    app.before((ctx) => {
      order.push(`before:${ctx.path}`);
    });
    app.after((_ctx, response) => {
      order.push("after");
      response.headers.set("x-after", "yes");
    });
    app.get("/", () => {
      order.push("handler");
      return "ok";
    });

    const response = await get(app, "/");

    expect(order).toEqual(["before:/", "handler", "after"]);
    expect(response.headers.get("x-after")).toBe("yes");
  });

  test("lets a before hook short-circuit and an after hook replace the response", async () => {
    const app = createApp();
    let handlerCalled = false;

    app.before(() => new Response("from before", { status: 202 }));
    app.after(() => new Response("from after", { status: 203 }));
    app.get("/", () => {
      handlerCalled = true;
      return "handler";
    });

    const response = await get(app, "/");

    expect(handlerCalled).toBe(false);
    expect(response.status).toBe(203);
    expect(await response.text()).toBe("from after");
  });

  test("propagates hook errors safely", async () => {
    const app = createApp();
    app.before(() => {
      throw new Error("before failed");
    });
    app.get("/", () => "ok");

    expect((await get(app, "/")).status).toBe(500);
  });

  test("validates hook registration and rejects configuration after startup", async () => {
    const app = createApp();

    expect(() => app.before("nope" as never)).toThrow();
    expect(() => app.after("nope" as never)).toThrow();
    expect(() => app.use("nope" as never)).toThrow();

    app.get("/", () => "ok");
    await app.listen();
    expect(() => app.before(() => {})).toThrow(LifecycleError);
    expect(() => app.after(() => {})).toThrow(LifecycleError);
    expect(() => app.use(() => new Response("x"))).toThrow(LifecycleError);
    await app.stop();
  });
});

describe("error hooks", () => {
  test("calls both the option observer and registered error hooks", async () => {
    const app = createApp();
    const seen: string[] = [];

    app.onError(() => seen.push("method"));
    app.get("/", () => {
      throw new Error("boom");
    });

    // The option observer is covered by app.test; this checks the method API.
    const response = await get(app, "/");

    expect(response.status).toBe(500);
    expect(seen).toEqual(["method"]);
  });

  test("does not let a throwing error hook break the response", async () => {
    const app = createApp();
    app.onError(() => {
      throw new Error("observer failed");
    });
    app.get("/", () => {
      throw new Error("boom");
    });

    const response = await get(app, "/");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" },
    });
  });

  test("rejects invalid error hooks and late registration after stop", async () => {
    const app = createApp();
    expect(() => app.onError("nope" as never)).toThrow();
    expect(() => app.onError(() => {})).not.toThrow();

    await app.stop();
    expect(() => app.onError(() => {})).toThrow(LifecycleError);
  });
});

describe("group middleware", () => {
  test("applies group.use only to routes registered after it", async () => {
    const app = createApp();
    const hits: string[] = [];
    const group = app.group("/api");

    group.get("/before", () => "before");
    group.use(async (_ctx, next) => {
      hits.push("middleware");
      return next();
    });
    group.get("/after", () => "after");

    await get(app, "/api/before");
    expect(hits).toEqual([]);

    await get(app, "/api/after");
    expect(hits).toEqual(["middleware"]);
  });

  test("rejects invalid group middleware", () => {
    const app = createApp();
    const group = app.group("/api");

    expect(() => group.use("nope" as never)).toThrow();
  });
});
