import { describe, expect, spyOn, test } from "bun:test";
import {
  App,
  type AppOptions,
  ConfigurationError,
  type LogFields,
  type Logger,
  type Middleware,
} from "../src/index";

function createApp(options: AppOptions = {}): App {
  return new App({ banner: false, development: false, ...options });
}

function request(app: App, path: string, init: RequestInit = {}): Promise<Response> {
  return app.fetch(new Request(`http://localhost${path}`, init));
}

function postJson(app: App, path: string, body: string): Promise<Response> {
  return request(app, path, {
    body,
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("request context access", () => {
  test("exposes params, query, headers, and cookies", async () => {
    const app = createApp();
    app.get("/users/:id", (ctx) => ({
      cookie: ctx.cookie("session"),
      cookies: ctx.cookies,
      header: ctx.header("x-test"),
      id: ctx.params.id,
      query: ctx.query.get("q"),
      queryAll: ctx.query.getAll("tag"),
    }));

    const response = await request(app, "/users/42?q=hello&tag=a&tag=b", {
      headers: {
        cookie: "session=abc%20def; theme=dark; theme=light; broken; bad=%E0%A4%A",
        "x-test": "value",
      },
    });

    expect(await response.json()).toEqual({
      cookie: "abc def",
      cookies: { bad: "%E0%A4%A", session: "abc def", theme: "dark" },
      header: "value",
      id: "42",
      query: "hello",
      queryAll: ["a", "b"],
    });
  });

  test("uses a supplied request ID and rejects unsafe ones", async () => {
    const app = createApp();
    app.get("/id", (ctx) => ({ requestId: ctx.requestId }));

    const supplied = await request(app, "/id", { headers: { "x-request-id": "req-123" } });
    expect(await supplied.json()).toEqual({ requestId: "req-123" });
    expect(supplied.headers.get("x-request-id")).toBe("req-123");

    const generated = await request(app, "/id", { headers: { "x-request-id": "bad id" } });
    const generatedBody = (await generated.json()) as { requestId: string };
    expect(generatedBody.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(generated.headers.get("x-request-id")).toBe(generatedBody.requestId);

    const tooLong = await request(app, "/id", {
      headers: { "x-request-id": "x".repeat(129) },
    });
    expect((await tooLong.json()) as { requestId: string }).not.toEqual({
      requestId: "x".repeat(129),
    });
  });

  test("keeps request state isolated between concurrent requests", async () => {
    const app = createApp();
    const blockers = new Map<string, () => void>();

    app.get("/state", async (ctx) => {
      const id = ctx.query.get("id") ?? "";
      ctx.state.set("id", id);
      await new Promise<void>((resolve) => blockers.set(id, resolve));
      return { id, state: ctx.state.get("id") };
    });

    const first = request(app, "/state?id=one");
    const second = request(app, "/state?id=two");

    while (blockers.size < 2) {
      await Bun.sleep(1);
    }
    blockers.get("one")?.();
    blockers.get("two")?.();

    expect(await (await first).json()).toEqual({ id: "one", state: "one" });
    expect(await (await second).json()).toEqual({ id: "two", state: "two" });
  });

  test("exposes a request-bound logger", async () => {
    const entries: { fields: LogFields | undefined; level: string; message: string }[] = [];
    const logger: Logger = {
      debug(message, fields) {
        entries.push({ fields, level: "debug", message });
      },
      error(message, fields) {
        entries.push({ fields, level: "error", message });
      },
      info(message, fields) {
        entries.push({ fields, level: "info", message });
      },
      warn(message, fields) {
        entries.push({ fields, level: "warn", message });
      },
    };
    const app = createApp({ logger });
    app.get("/log", (ctx) => {
      ctx.logger.debug("debugging");
      ctx.logger.info("hello", { extra: true });
      ctx.logger.warn("warning");
      ctx.logger.error("failure");
      return "ok";
    });

    await request(app, "/log", { headers: { "x-request-id": "log-1" } });

    expect(entries.map((entry) => entry.level)).toEqual(["debug", "info", "warn", "error"]);
    expect(entries[1]?.fields).toEqual({
      extra: true,
      method: "GET",
      path: "/log",
      requestId: "log-1",
    });
  });

  test("uses the console logger by default", async () => {
    const spies = [
      spyOn(console, "debug").mockImplementation(() => {}),
      spyOn(console, "info").mockImplementation(() => {}),
      spyOn(console, "warn").mockImplementation(() => {}),
      spyOn(console, "error").mockImplementation(() => {}),
    ];
    const app = createApp();
    app.get("/log", (ctx) => {
      ctx.logger.debug("d");
      ctx.logger.info("i");
      ctx.logger.warn("w");
      ctx.logger.error("e");
      return "ok";
    });

    try {
      await request(app, "/log");
      for (const spy of spies) {
        expect(spy).toHaveBeenCalled();
      }
    } finally {
      for (const spy of spies) {
        spy.mockRestore();
      }
    }
  });

  test("accepts constructor middleware", async () => {
    const hits: string[] = [];
    const app = new App({
      banner: false,
      middleware: [
        async (_ctx, next) => {
          hits.push("constructor-middleware");
          return next();
        },
      ],
    });
    app.get("/", () => "ok");

    expect(await (await request(app, "/")).text()).toBe("ok");
    expect(hits).toEqual(["constructor-middleware"]);
  });

  test("validates logger, body limit, and timeout options", () => {
    expect(() => new App({ logger: {} as Logger })).toThrow(ConfigurationError);
    expect(() => new App({ maxBodyBytes: -1 })).toThrow(ConfigurationError);
    expect(() => new App({ maxBodyBytes: 1.5 })).toThrow(ConfigurationError);
    expect(() => new App({ requestTimeoutMs: -1 })).toThrow(ConfigurationError);
    expect(() => new App({ requestTimeoutMs: 1.5 })).toThrow(ConfigurationError);
    expect(
      () =>
        new App({
          middleware: ["nope" as unknown as Middleware],
        }),
    ).toThrow(ConfigurationError);
  });
});

describe("request bodies", () => {
  test("parses and caches JSON bodies", async () => {
    const app = createApp();
    app.post("/json", async (ctx) => {
      const first = await ctx.body.json<{ name: string }>();
      const second = await ctx.body.json<{ name: string }>();
      const text = await ctx.body.text();
      return { first, second, text };
    });

    const response = await postJson(app, "/json", '{"name":"Ada"}');

    expect(await response.json()).toEqual({
      first: { name: "Ada" },
      second: { name: "Ada" },
      text: '{"name":"Ada"}',
    });
  });

  test("accepts +json content types", async () => {
    const app = createApp();
    app.post("/vendor-json", async (ctx) => ctx.body.json());

    const response = await request(app, "/vendor-json", {
      body: '{"ok":true}',
      headers: { "content-type": "application/vnd.api+json" },
      method: "POST",
    });

    expect(await response.json()).toEqual({ ok: true });
  });

  test("rejects missing or non-JSON content types", async () => {
    const app = createApp();
    app.post("/json", async (ctx) => ctx.body.json());

    const missing = await request(app, "/json", {
      body: "{}",
      method: "POST",
    });
    missing.headers.delete("content-type");

    const wrong = await request(app, "/json", {
      body: "{}",
      headers: { "content-type": "text/plain" },
      method: "POST",
    });

    expect(missing.status).toBe(415);
    expect(wrong.status).toBe(415);
    expect(await wrong.json()).toEqual({
      error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Expected a JSON content type." },
    });
  });

  test("rejects empty and invalid JSON", async () => {
    const app = createApp();
    app.post("/json", async (ctx) => ctx.body.json());

    const empty = await request(app, "/json", {
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const invalid = await postJson(app, "/json", "{not json");

    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({
      error: { code: "INVALID_JSON", message: "Request body is empty." },
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      error: { code: "INVALID_JSON", message: "Request body is not valid JSON." },
    });
  });

  test("enforces the body limit from Content-Length", async () => {
    const app = createApp({ maxBodyBytes: 4 });
    app.post("/json", async (ctx) => ctx.body.json());

    const response = await request(app, "/json", {
      body: '{"name":"Ada"}',
      headers: {
        "content-length": "999",
        "content-type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: { code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds the 4 byte limit." },
    });
  });

  test("enforces the body limit from the actual stream", async () => {
    const app = createApp({ maxBodyBytes: 4 });
    app.post("/json", async (ctx) => ctx.body.json());

    const response = await postJson(app, "/json", '{"name":"Ada"}');

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: { code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds the 4 byte limit." },
    });
  });

  test("enforces the body limit on streamed bodies without Content-Length", async () => {
    const app = createApp({ maxBodyBytes: 4 });
    app.post("/stream", async (ctx) => {
      await ctx.body.arrayBuffer();
      return "ok";
    });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("12345"));
        controller.close();
      },
    });
    const response = await request(app, "/stream", {
      body: stream,
      headers: { "content-type": "application/octet-stream" },
      method: "POST",
    } as RequestInit);

    expect(response.status).toBe(413);
  });

  test("reads text and array buffers with no body", async () => {
    const app = createApp();
    app.post("/text", async (ctx) => {
      const buffer = await ctx.body.arrayBuffer();
      const text = await ctx.body.text();
      return { bytes: buffer.byteLength, text };
    });

    const response = await request(app, "/text", { method: "POST" });

    expect(await response.json()).toEqual({ bytes: 0, text: "" });
  });

  test("parses URL-encoded and multipart form data", async () => {
    const app = createApp();
    app.post("/form", async (ctx) => {
      const form = await ctx.body.formData();
      const second = await ctx.body.formData();
      return {
        a: form.get("a"),
        b: form.get("b"),
        cached: second === form,
      };
    });

    const urlEncoded = await request(app, "/form", {
      body: "a=1&b=two",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    });
    expect(await urlEncoded.json()).toEqual({ a: "1", b: "two", cached: true });

    const formData = new FormData();
    formData.append("a", "one");
    formData.append("b", "two");
    const multipart = await request(app, "/form", {
      body: formData,
      method: "POST",
    });
    expect(await multipart.json()).toEqual({ a: "one", b: "two", cached: true });
  });

  test("rejects wrong and malformed form content", async () => {
    const app = createApp();
    app.post("/form", async (ctx) => {
      const form = await ctx.body.formData();
      return { hasA: form.has("a") };
    });

    const wrong = await request(app, "/form", {
      body: "{}",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const malformed = await request(app, "/form", {
      body: "not a form",
      headers: { "content-type": "multipart/form-data; boundary=missing" },
      method: "POST",
    });

    expect(wrong.status).toBe(415);
    expect(malformed.status).toBe(400);
    expect((await malformed.json()) as { error: { code: string; message: string } }).toEqual({
      error: { code: "INVALID_FORM_DATA", message: "Request body is not valid form data." },
    });
  });
});

describe("request signals and timeouts", () => {
  test("propagates a client abort to ctx.signal", async () => {
    const app = createApp();
    app.get("/signal", async (ctx) => {
      await new Promise<void>((resolve) => {
        if (ctx.signal.aborted) {
          resolve();
        } else {
          ctx.signal.addEventListener("abort", () => resolve(), { once: true });
        }
      });
      return { aborted: ctx.signal.aborted };
    });

    const controller = new AbortController();
    const pending = request(app, "/signal", { signal: controller.signal });
    controller.abort();

    expect(await (await pending).json()).toEqual({ aborted: true });
  });

  test("handles an already-aborted request signal", async () => {
    const app = createApp();
    app.get("/signal", (ctx) => ({ aborted: ctx.signal.aborted }));

    const controller = new AbortController();
    controller.abort();
    const response = await request(app, "/signal", { signal: controller.signal });

    expect(await response.json()).toEqual({ aborted: true });
  });

  test("returns a normal response when a timeout is configured but not reached", async () => {
    const app = createApp({ requestTimeoutMs: 1_000 });
    app.get("/fast", () => "fast");

    const response = await request(app, "/fast");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("fast");
  });

  test("returns 504 and aborts the signal on timeout", async () => {
    const app = createApp({ requestTimeoutMs: 10 });
    let signalAborted = false;

    app.get("/slow", async (ctx) => {
      await Bun.sleep(40);
      signalAborted = ctx.signal.aborted;
      return "late";
    });

    const response = await request(app, "/slow");

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({
      error: { code: "REQUEST_TIMEOUT", message: "Request Timeout" },
    });

    await Bun.sleep(50);
    expect(signalAborted).toBe(true);
  });
});

describe("response helpers and SSE", () => {
  test("provides JSON, text, HTML, redirect, and no-content helpers", async () => {
    const app = createApp();
    app.get("/json", (ctx) => ctx.json({ ok: true }, { status: 201 }));
    app.get("/text", (ctx) => ctx.text("hello", { status: 202 }));
    app.get("/html", (ctx) => ctx.html("<h1>Hi</h1>"));
    app.get("/redirect", (ctx) => ctx.redirect("/login", 303));
    app.get("/empty", (ctx) => ctx.noContent());

    const json = await request(app, "/json");
    expect(json.status).toBe(201);
    expect(json.headers.get("content-type")).toContain("application/json");

    const text = await request(app, "/text");
    expect(text.status).toBe(202);
    expect(text.headers.get("content-type")).toContain("text/plain");

    const html = await request(app, "/html");
    expect(html.headers.get("content-type")).toContain("text/html");
    expect(await html.text()).toBe("<h1>Hi</h1>");

    const redirect = await request(app, "/redirect");
    expect(redirect.status).toBe(303);
    expect(redirect.headers.get("location")).toBe("/login");

    const empty = await request(app, "/empty");
    expect(empty.status).toBe(204);
    expect(await empty.text()).toBe("");
  });

  test("rejects invalid redirect statuses", async () => {
    const app = createApp();
    app.get("/redirect", (ctx) => ctx.redirect("/login", 200));

    expect((await request(app, "/redirect")).status).toBe(500);
  });

  test("streams a response body", async () => {
    const app = createApp();
    app.get("/stream", (ctx) => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("a"));
          controller.enqueue(encoder.encode("b"));
          controller.close();
        },
      });
      return ctx.stream(stream, { headers: { "content-type": "text/plain" } });
    });

    expect(await (await request(app, "/stream")).text()).toBe("ab");
  });

  test("formats sync SSE events with comments, event, id, retry, and data", async () => {
    const app = createApp();
    app.get("/sse", (ctx) =>
      ctx.sse([
        {
          comment: "hello",
          data: { ok: true },
          event: "ping",
          id: "1",
          retry: 1000,
        },
      ]),
    );

    const response = await request(app, "/sse");

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(await response.text()).toBe(
      ': hello\nevent: ping\nid: 1\nretry: 1000\ndata: {"ok":true}\n\n',
    );
  });

  test("formats async SSE events and multiline string data", async () => {
    const app = createApp();
    app.get("/sse", (ctx) =>
      ctx.sse(
        (async function* () {
          yield { data: "line one\nline two" };
          yield { data: "two" };
        })(),
      ),
    );

    expect(await (await request(app, "/sse")).text()).toBe(
      "data: line one\ndata: line two\n\ndata: two\n\n",
    );
  });

  test("propagates SSE generator failures to the stream consumer", async () => {
    const app = createApp();
    app.get("/sse", (ctx) =>
      ctx.sse(
        (async function* () {
          yield { data: "first" };
          throw new Error("stream failed");
        })(),
      ),
    );

    const response = await request(app, "/sse");

    expect(response.status).toBe(200);
    await expect(response.text()).rejects.toThrow();
  });
});
