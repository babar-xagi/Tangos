import { describe, expect, test } from "bun:test";
import { createApp, parsePort, startServer } from "../../examples/hello/src/server";

describe("Phase 2 example app", () => {
  test("serves the framework identity at /", async () => {
    const app = createApp();
    const response = await app.fetch(new Request("http://localhost/"));
    const body = (await response.json()) as {
      message?: string;
      framework?: string;
      phase?: number;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body.message).toBe("Hello from Qutivex 👋");
    expect(body.framework).toBe("Qutivex");
    expect(body.phase).toBe(2);
  });

  test("serves a health check", async () => {
    const app = createApp();
    const response = await app.fetch(new Request("http://localhost/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", phase: 2 });
  });

  test("returns the standard 404 envelope", async () => {
    const app = createApp();
    const response = await app.fetch(new Request("http://localhost/nope"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Not Found" },
    });
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
      expect(await response.json()).toEqual({ status: "ok", phase: 2 });
    } finally {
      await app.stop(true);
    }

    expect(app.state).toBe("stopped");
  });
});
