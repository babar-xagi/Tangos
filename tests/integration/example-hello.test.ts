import { describe, expect, test } from "bun:test";
import { createApp, parsePort, startServer } from "../../examples/hello/src/server";

describe("Phase 3 example app", () => {
  test("serves the framework identity and middleware header at /", async () => {
    const app = createApp();
    const response = await app.fetch(new Request("http://localhost/"));
    const body = (await response.json()) as {
      message?: string;
      framework?: string;
      phase?: number;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-response-time-ms")).not.toBeNull();
    expect(body.message).toBe("Hello from Qutivex 👋");
    expect(body.framework).toBe("Qutivex");
    expect(body.phase).toBe(3);
  });

  test("serves a health check", async () => {
    const app = createApp();
    const response = await app.fetch(new Request("http://localhost/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ phase: 3, status: "ok" });
  });

  test("uses path and query params", async () => {
    const app = createApp();
    const response = await app.fetch(new Request("http://localhost/hello/Ada?greeting=Welcome"));
    const body = (await response.json()) as { greeting?: string; requestId?: string };

    expect(body.greeting).toBe("Welcome, Ada! 👋");
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("parses JSON bodies", async () => {
    const app = createApp();
    const response = await app.fetch(
      new Request("http://localhost/echo", {
        body: JSON.stringify({ message: "ping" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      echo: { message: "ping" },
      method: "POST",
      path: "/echo",
    });
  });

  test("serves grouped routes and SSE", async () => {
    const app = createApp();
    const version = await app.fetch(new Request("http://localhost/api/version"));
    expect(await version.json()).toEqual({ phase: 3, version: "0.0.0" });

    const events = await app.fetch(new Request("http://localhost/events"));
    expect(events.headers.get("content-type")).toContain("text/event-stream");
    expect(await events.text()).toContain("Qutivex SSE");
  });

  test("returns the standard 404 envelope and a bodyless HEAD", async () => {
    const app = createApp();
    const missing = await app.fetch(new Request("http://localhost/nope"));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Not Found" },
    });

    const head = await app.fetch(new Request("http://localhost/health", { method: "HEAD" }));
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
  });

  test("parses PORT values and rejects invalid ones", () => {
    expect(parsePort(undefined)).toBe(3000);
    expect(parsePort("")).toBe(3000);
    expect(parsePort("8080")).toBe(8080);
    expect(parsePort("0")).toBe(0);
    expect(() => parsePort("http")).toThrow(RangeError);
    expect(() => parsePort("-1")).toThrow(RangeError);
    expect(() => parsePort("65536")).toThrow(RangeError);
    expect(() => parsePort("3.5")).toThrow(RangeError);
  });

  test("starts a real Bun server on an ephemeral port and shuts down", async () => {
    const { app, info } = await startServer({ port: 0 });

    try {
      expect(app.state).toBe("running");
      expect(info.port).toBeGreaterThan(0);

      const response = await fetch(new URL("health", info.url));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ phase: 3, status: "ok" });
    } finally {
      await app.stop(true);
    }

    expect(app.state).toBe("stopped");
  });
});
