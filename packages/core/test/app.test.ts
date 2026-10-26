import { describe, expect, spyOn, test } from "bun:test";
import {
  type AdapterStartOptions,
  App,
  type AppOptions,
  ConfigurationError,
  type Handler,
  type HandlerResult,
  HTTP_METHODS,
  HttpError,
  type HttpServer,
  type HttpServerAdapter,
  LifecycleError,
  QutivexError,
  ServerShutdownError,
  ServerStartError,
  type ShutdownHook,
  statusTextFor,
} from "../src/index";

class FakeAdapter implements HttpServerAdapter {
  starts = 0;
  stopCalls = 0;
  force: boolean | undefined;
  lastOptions: AdapterStartOptions | undefined;
  failStart: Error | undefined;
  failStop: Error | undefined;
  gate: Promise<void> | undefined;
  stopGate: Promise<void> | undefined;

  async start(options: AdapterStartOptions): Promise<HttpServer> {
    this.starts += 1;
    this.lastOptions = options;

    if (this.gate !== undefined) {
      await this.gate;
    }
    if (this.failStart !== undefined) {
      throw this.failStart;
    }

    const actualPort = options.port === 0 ? 4321 : options.port;

    return {
      hostname: options.hostname,
      port: actualPort,
      url: new URL(`http://${options.hostname}:${actualPort}`),
      stop: async (force = false) => {
        this.stopCalls += 1;
        this.force = force;

        if (this.stopGate !== undefined) {
          await this.stopGate;
        }
        if (this.failStop !== undefined) {
          throw this.failStop;
        }
      },
    };
  }
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function setup(options: AppOptions = {}): { adapter: FakeAdapter; app: App } {
  const adapter = new FakeAdapter();
  const app = new App({ adapter, banner: false, development: false, ...options });
  return { adapter, app };
}

function request(path: string, method = "GET"): Request {
  return new Request(`http://localhost${path}`, { method });
}

describe("App construction", () => {
  test("starts in the created state with defaults", () => {
    const { app } = setup();

    expect(app.state).toBe("created");
    expect(app.name).toBe("Qutivex");
    expect(app.routes).toEqual([]);
    expect(app.url).toBeUndefined();
  });

  test("accepts custom name, hostname, and port", async () => {
    const { adapter, app } = setup({ hostname: "0.0.0.0", name: "My API", port: 0 });
    const info = await app.listen();

    expect(app.name).toBe("My API");
    expect(info.hostname).toBe("0.0.0.0");
    expect(info.port).toBe(4321);
    expect(adapter.lastOptions?.hostname).toBe("0.0.0.0");
  });

  test("rejects invalid ports", () => {
    for (const port of [-1, 65_536, 1.5, Number.NaN]) {
      expect(() => new App({ adapter: new FakeAdapter(), port })).toThrow(ConfigurationError);
    }
  });

  test("rejects invalid hostnames and names", () => {
    expect(() => new App({ adapter: new FakeAdapter(), hostname: " " })).toThrow(
      ConfigurationError,
    );
    expect(() => new App({ adapter: new FakeAdapter(), name: "" })).toThrow(ConfigurationError);
  });

  test("accepts port 0 for an ephemeral port", () => {
    expect(() => new App({ adapter: new FakeAdapter(), port: 0 })).not.toThrow();
  });
});

describe("route registration", () => {
  test("registers every supported method and returns the app for chaining", async () => {
    const { app } = setup();

    const chained = app
      .get("/methods", () => "GET")
      .post("/methods", () => "POST")
      .put("/methods", () => "PUT")
      .patch("/methods", () => "PATCH")
      .delete("/methods", () => "DELETE")
      .options("/methods", () => "OPTIONS")
      .head("/methods", () => "HEAD");

    expect(chained).toBe(app);
    expect(app.routes).toHaveLength(7);
    expect(new Set(app.routes.map((route) => route.method))).toEqual(new Set(HTTP_METHODS));

    for (const method of HTTP_METHODS) {
      const response = await app.fetch(request("/methods", method));
      expect(response.status).toBe(200);

      if (method === "HEAD") {
        expect(await response.text()).toBe("");
      } else {
        expect(await response.text()).toBe(method);
      }
    }
  });

  test("moves from created to configured on the first route", () => {
    const { app } = setup();

    expect(app.state).toBe("created");
    app.get("/", () => "ok");
    expect(app.state).toBe("configured");
    app.get("/second", () => "ok");
    expect(app.state).toBe("configured");
  });

  test("rejects duplicate routes", () => {
    const { app } = setup();
    app.get("/users", () => "ok");

    expect(() => app.get("/users", () => "again")).toThrow(ConfigurationError);
  });

  test("rejects invalid route paths", () => {
    const { app } = setup();

    for (const path of ["", "users", "/users?active=true", "/users#top", "/has space"]) {
      expect(() => app.get(path, () => "ok")).toThrow(ConfigurationError);
    }
  });

  test("rejects a non-function handler", () => {
    const { app } = setup();

    expect(() => app.get("/", "nope" as unknown as Handler)).toThrow(ConfigurationError);
  });

  test("rejects registration after startup and after stop", async () => {
    const { app } = setup();
    app.get("/", () => "ok");
    await app.listen();

    expect(() => app.get("/late", () => "late")).toThrow(LifecycleError);

    await app.stop();
    expect(() => app.get("/later", () => "later")).toThrow(LifecycleError);
  });
});

describe("handler results", () => {
  test("returns a JSON object with the right headers", async () => {
    const { app } = setup();
    app.get("/json", () => ({ message: "hello", count: 2 }));

    const response = await app.fetch(request("/json"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ count: 2, message: "hello" });
  });

  test("returns strings as plain text", async () => {
    const { app } = setup();
    app.get("/text", () => "hello");

    const response = await app.fetch(request("/text"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe("hello");
  });

  test("returns numbers, booleans, nulls, and arrays as JSON", async () => {
    const { app } = setup();
    app.get("/number", () => 42);
    app.get("/boolean", () => true);
    app.get("/null", () => null);
    app.get("/array", () => [1, "two", false]);

    expect(await (await app.fetch(request("/number"))).json()).toBe(42);
    expect(await (await app.fetch(request("/boolean"))).json()).toBe(true);
    expect(await (await app.fetch(request("/null"))).text()).toBe("null");
    expect(await (await app.fetch(request("/array"))).json()).toEqual([1, "two", false]);
  });

  test("returns 204 for undefined", async () => {
    const { app } = setup();
    app.get("/empty", () => {});

    const response = await app.fetch(request("/empty"));

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("content-type")).toBeNull();
  });

  test("passes a returned Response through unchanged", async () => {
    const { app } = setup();
    app.get(
      "/created",
      () => new Response("created", { headers: { "x-custom": "yes" }, status: 201 }),
    );

    const response = await app.fetch(request("/created"));

    expect(response.status).toBe(201);
    expect(response.headers.get("x-custom")).toBe("yes");
    expect(await response.text()).toBe("created");
  });

  test("supports async handlers", async () => {
    const { app } = setup();
    app.get("/async", async () => {
      await Bun.sleep(1);
      return { ok: true };
    });

    expect(await (await app.fetch(request("/async"))).json()).toEqual({ ok: true });
  });

  test("provides the request context", async () => {
    const { app } = setup();
    app.get("/ctx", (ctx) => ({
      href: ctx.url.href,
      isRequest: ctx.request instanceof Request,
      method: ctx.method,
      path: ctx.path,
    }));

    const body = (await (await app.fetch(request("/ctx"))).json()) as Record<string, unknown>;

    expect(body).toEqual({
      href: "http://localhost/ctx",
      isRequest: true,
      method: "GET",
      path: "/ctx",
    });
  });

  test("returns the default 404 envelope", async () => {
    const { app } = setup();
    const response = await app.fetch(request("/missing"));

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Not Found" },
    });
  });

  test("handles HEAD by reusing GET and stripping the body", async () => {
    const { app } = setup();
    app.get("/hello", () => "hello");

    const response = await app.fetch(request("/hello", "HEAD"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(response.headers.get("content-type")).toContain("text/plain");
  });

  test("prefers an explicit HEAD route and leaves GET unchanged", async () => {
    const { app } = setup();
    app.get("/head", () => "get body");
    app.head("/head", () => "head body");

    expect(await (await app.fetch(request("/head", "HEAD"))).text()).toBe("");
    expect(await (await app.fetch(request("/head"))).text()).toBe("get body");
  });

  test("returns a bodyless 404 for HEAD", async () => {
    const { app } = setup();
    const response = await app.fetch(request("/missing", "HEAD"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });
});

describe("error handling", () => {
  test("maps intentional HttpErrors to their status and envelope", async () => {
    const { app } = setup();
    app.get("/unauthorized", () => {
      throw HttpError.unauthorized("Sign in first");
    });

    const response = await app.fetch(request("/unauthorized"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Sign in first" },
    });
  });

  test("does not expose internal error messages", async () => {
    const { app } = setup();
    app.get("/secret", () => {
      throw HttpError.internal("database password is hunter2");
    });

    const response = await app.fetch(request("/secret"));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain("hunter2");
    expect(JSON.parse(text)).toEqual({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" },
    });
  });

  test("normalizes unknown thrown values to a safe 500", async () => {
    const { app } = setup();
    app.get("/boom", () => {
      throw new Error("private detail");
    });

    const response = await app.fetch(request("/boom"));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain("private detail");
    expect(text).not.toContain("stack");
  });

  test("normalizes a thrown non-Error value", async () => {
    const { app } = setup();
    app.get("/string-throw", () => {
      throw "nope";
    });

    const response = await app.fetch(request("/string-throw"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" },
    });
  });

  test("sanitizes out-of-range HttpError statuses", async () => {
    const { app } = setup();
    app.get("/bad-status", () => {
      throw new HttpError("bad status", { status: 200 });
    });

    const response = await app.fetch(request("/bad-status"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" },
    });
  });

  test("maps unknown status texts and codes safely", async () => {
    expect(statusTextFor(499)).toBe("Error");

    const { app } = setup();
    app.get("/unknown-status", () => {
      throw new HttpError("custom", { expose: false, status: 499 });
    });

    const response = await app.fetch(request("/unknown-status"));

    expect(response.status).toBe(499);
    expect(await response.json()).toEqual({
      error: { code: "HTTP_ERROR", message: "Error" },
    });
  });

  test("maps a base QutivexError without exposing details", async () => {
    const { app } = setup();
    app.get("/qutivex-error", () => {
      throw new QutivexError("internal only");
    });

    const response = await app.fetch(request("/qutivex-error"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "QUTIVEX_ERROR", message: "Internal Server Error" },
    });
  });

  test("covers the static HttpError factories", async () => {
    const { app } = setup();
    app.get("/bad-request", () => {
      throw HttpError.badRequest();
    });
    app.get("/forbidden", () => {
      throw HttpError.forbidden();
    });
    app.get("/not-found", () => {
      throw HttpError.notFound();
    });
    app.get("/conflict", () => {
      throw HttpError.conflict();
    });
    app.get("/unprocessable", () => {
      throw HttpError.unprocessableEntity();
    });
    app.get("/too-many", () => {
      throw HttpError.tooManyRequests();
    });
    app.get("/unavailable", () => {
      throw HttpError.serviceUnavailable();
    });

    expect((await app.fetch(request("/bad-request"))).status).toBe(400);
    expect((await app.fetch(request("/forbidden"))).status).toBe(403);
    expect((await app.fetch(request("/not-found"))).status).toBe(404);
    expect((await app.fetch(request("/conflict"))).status).toBe(409);
    expect((await app.fetch(request("/unprocessable"))).status).toBe(422);
    expect((await app.fetch(request("/too-many"))).status).toBe(429);
    expect((await app.fetch(request("/unavailable"))).status).toBe(503);
  });

  test("turns serialization failures into a safe 500", async () => {
    const { app } = setup();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    app.get("/circular", () => circular);

    const response = await app.fetch(request("/circular"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "RESPONSE_SERIALIZATION_FAILED", message: "Internal Server Error" },
    });
  });

  test("rejects handler values that JSON.stringify drops", async () => {
    const { app } = setup();
    app.get("/symbol", () => Symbol("nope") as unknown as HandlerResult);

    const response = await app.fetch(request("/symbol"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "RESPONSE_SERIALIZATION_FAILED", message: "Internal Server Error" },
    });
  });

  test("calls onError without letting a broken observer hide the response", async () => {
    const errors: unknown[] = [];
    const { app } = setup({
      onError: (error) => {
        errors.push(error);
        throw new Error("observer failed");
      },
    });
    app.get("/boom", () => {
      throw new Error("boom");
    });

    const response = await app.fetch(request("/boom"));

    expect(response.status).toBe(500);
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe("boom");
  });

  test("returns a bodyless 500 for HEAD", async () => {
    const { app } = setup();
    app.get("/boom", () => {
      throw new Error("boom");
    });

    const response = await app.fetch(request("/boom", "HEAD"));

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");
  });
});

describe("lifecycle", () => {
  test("requires an adapter to listen", async () => {
    const app = new App({ banner: false });
    app.get("/", () => "ok");

    await expect(app.listen()).rejects.toBeInstanceOf(ConfigurationError);
    expect(app.state).toBe("configured");
  });

  test("starts, reports the address, and returns the same info when already running", async () => {
    const { adapter, app } = setup();
    app.get("/", () => "ok");

    const first = await app.listen();
    const second = await app.listen();

    expect(app.state).toBe("running");
    expect(app.url).toBe(first.url);
    expect(second).toBe(first);
    expect(adapter.starts).toBe(1);
    expect(adapter.lastOptions?.development).toBe(false);

    await app.stop();
  });

  test("passes listen overrides to the adapter", async () => {
    const { adapter, app } = setup();
    const info = await app.listen({ hostname: "127.0.0.2", port: 0 });

    expect(info.hostname).toBe("127.0.0.2");
    expect(adapter.lastOptions?.hostname).toBe("127.0.0.2");
    expect(adapter.lastOptions?.port).toBe(0);

    await app.stop();
  });

  test("exposes starting, running, stopping, and stopped states", async () => {
    const { adapter, app } = setup();
    app.get("/", () => "ok");
    const gate = deferred();
    adapter.gate = gate.promise;

    expect(app.state).toBe("configured");

    const listening = app.listen();
    expect(app.state).toBe("starting");

    gate.resolve();
    await listening;
    expect(app.state).toBe("running");

    const stopping = app.stop();
    expect(app.state).toBe("stopping");

    await stopping;
    expect(app.state).toBe("stopped");
  });

  test("deduplicates concurrent listen calls while starting", async () => {
    const { adapter, app } = setup();
    const gate = deferred();
    adapter.gate = gate.promise;

    const first = app.listen();
    const second = app.listen();
    gate.resolve();

    const [firstInfo, secondInfo] = await Promise.all([first, second]);

    expect(adapter.starts).toBe(1);
    expect(secondInfo).toBe(firstInfo);

    await app.stop();
  });

  test("marks startup failures and wraps them in ServerStartError", async () => {
    const errors: unknown[] = [];
    const { adapter, app } = setup({ onError: (error) => errors.push(error) });
    adapter.failStart = new Error("bind failed");

    await expect(app.listen()).rejects.toBeInstanceOf(ServerStartError);
    expect(app.state).toBe("failed");
    expect(errors).toHaveLength(1);
    await expect(app.listen()).rejects.toBeInstanceOf(LifecycleError);
  });

  test("passes through a QutivexError from the adapter", async () => {
    const { adapter, app } = setup();
    const original = new ServerStartError("adapter said no");
    adapter.failStart = original;

    await expect(app.listen()).rejects.toBe(original);
    expect(app.state).toBe("failed");
  });

  test("rejects invalid listen overrides without starting", async () => {
    const { adapter, app } = setup();

    await expect(app.listen({ port: -1 })).rejects.toBeInstanceOf(ConfigurationError);
    await expect(app.listen({ hostname: " " })).rejects.toBeInstanceOf(ConfigurationError);
    expect(app.state).toBe("created");
    expect(adapter.starts).toBe(0);
  });

  test("runs shutdown hooks in reverse order and stops the server", async () => {
    const { adapter, app } = setup();
    const order: string[] = [];

    app.onShutdown(() => {
      order.push("first");
    });
    app.onShutdown(async () => {
      await Bun.sleep(1);
      order.push("second");
    });

    await app.listen();
    await app.stop(true);

    expect(order).toEqual(["second", "first"]);
    expect(adapter.stopCalls).toBe(1);
    expect(adapter.force).toBe(true);
    expect(app.state).toBe("stopped");
  });

  test("stops cleanly without starting and is idempotent", async () => {
    const { adapter, app } = setup();
    let hookCalls = 0;
    app.onShutdown(() => {
      hookCalls += 1;
    });

    await app.stop();
    await app.stop();

    expect(app.state).toBe("stopped");
    expect(hookCalls).toBe(1);
    expect(adapter.stopCalls).toBe(0);

    await expect(app.listen()).rejects.toBeInstanceOf(LifecycleError);
  });

  test("stops while starting without leaking a running server", async () => {
    const { adapter, app } = setup();
    const gate = deferred();
    adapter.gate = gate.promise;

    const listening = app.listen();
    const stopping = app.stop();
    expect(app.state).toBe("starting");

    gate.resolve();
    await listening;
    await stopping;

    expect(app.state).toBe("stopped");
    expect(adapter.stopCalls).toBe(1);
  });

  test("stops while starting when startup fails", async () => {
    const { adapter, app } = setup();
    const gate = deferred();
    adapter.gate = gate.promise;

    const listening = app.listen();
    const stopping = app.stop();
    adapter.failStart = new Error("startup failed after stop began");

    gate.resolve();
    await expect(listening).rejects.toBeInstanceOf(ServerStartError);
    await stopping;

    expect(app.state).toBe("stopped");
    expect(adapter.stopCalls).toBe(0);
  });

  test("deduplicates concurrent stop calls", async () => {
    const { adapter, app } = setup();
    await app.listen();
    const gate = deferred();
    adapter.stopGate = gate.promise;

    const first = app.stop();
    const second = app.stop();
    gate.resolve();
    await Promise.all([first, second]);

    expect(adapter.stopCalls).toBe(1);
    expect(app.state).toBe("stopped");
  });

  test("reports shutdown hook failures and marks the app failed", async () => {
    const errors: unknown[] = [];
    const { adapter, app } = setup({ onError: (error) => errors.push(error) });
    await app.listen();
    app.onShutdown(() => {
      throw new Error("hook failed");
    });

    await expect(app.stop()).rejects.toBeInstanceOf(ServerShutdownError);
    expect(app.state).toBe("failed");
    expect(errors).toHaveLength(1);
    expect(adapter.stopCalls).toBe(1);
  });

  test("reports server stop failures and marks the app failed", async () => {
    const errors: unknown[] = [];
    const { adapter, app } = setup({ onError: (error) => errors.push(error) });
    await app.listen();
    adapter.failStop = new Error("stop failed");

    await expect(app.stop()).rejects.toBeInstanceOf(ServerShutdownError);
    expect(app.state).toBe("failed");
    expect(errors).toHaveLength(1);
  });

  test("runs hooks after a failed startup and then reaches stopped", async () => {
    const { adapter, app } = setup();
    let hookCalls = 0;
    app.onShutdown(() => {
      hookCalls += 1;
    });
    adapter.failStart = new Error("no port");

    await expect(app.listen()).rejects.toBeInstanceOf(ServerStartError);
    await app.stop();

    expect(hookCalls).toBe(1);
    expect(app.state).toBe("stopped");
  });

  test("rejects listen while stopping", async () => {
    const { adapter, app } = setup();
    await app.listen();
    const gate = deferred();
    adapter.stopGate = gate.promise;

    const stopping = app.stop();
    await expect(app.listen()).rejects.toBeInstanceOf(LifecycleError);

    gate.resolve();
    await stopping;
  });

  test("validates shutdown hooks and their registration window", async () => {
    const { app } = setup();

    expect(() => app.onShutdown("nope" as unknown as ShutdownHook)).toThrow(ConfigurationError);

    await app.stop();
    expect(() => app.onShutdown(() => {})).toThrow(LifecycleError);
  });

  test("run is an alias for listen", async () => {
    const { app } = setup();
    const info = await app.run({ port: 0 });

    expect(info.port).toBe(4321);
    expect(app.state).toBe("running");
    await app.stop();
  });

  test("prints a banner in development and hides it when disabled", async () => {
    const log = spyOn(console, "log").mockImplementation(() => {});

    try {
      const { app: withBanner } = setup({ banner: true });
      await withBanner.listen();
      expect(log).toHaveBeenCalledTimes(1);
      await withBanner.stop();

      const { app: withoutBanner } = setup();
      await withoutBanner.listen();
      expect(log).toHaveBeenCalledTimes(1);
      await withoutBanner.stop();
    } finally {
      log.mockRestore();
    }
  });

  test("disables the banner by default in production", async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const log = spyOn(console, "log").mockImplementation(() => {});
    const adapter = new FakeAdapter();
    const app = new App({ adapter });

    try {
      await app.listen();
      expect(log).not.toHaveBeenCalled();
    } finally {
      await app.stop();
      log.mockRestore();

      if (original === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = original;
      }
    }
  });
});

describe("request concurrency", () => {
  test("handles many concurrent in-process requests independently", async () => {
    const { app } = setup();
    app.get("/items", (ctx) => ({
      id: ctx.url.searchParams.get("id"),
    }));

    const responses = await Promise.all(
      Array.from({ length: 50 }, (_, index) => app.fetch(request(`/items?id=${index}`))),
    );

    const bodies = (await Promise.all(responses.map((response) => response.json()))) as {
      id: string;
    }[];

    expect(bodies).toHaveLength(50);
    expect(bodies.map((body) => body.id)).toEqual(
      Array.from({ length: 50 }, (_, index) => String(index)),
    );
  });
});
