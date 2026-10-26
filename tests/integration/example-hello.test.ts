import { describe, expect, test } from "bun:test";
import { handleRequest, parsePort, startServer } from "../../examples/hello/src/server";

describe("Phase 1 example server", () => {
  test("serves the framework identity at /", async () => {
    const response = handleRequest(new Request("http://localhost/"));
    const body = (await response.json()) as {
      message?: string;
      framework?: string;
      phase?: number;
      core?: string;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body.message).toBe("Hello from Qutivex");
    expect(body.framework).toBe("Qutivex");
    expect(body.phase).toBe(1);
    expect(body.core).toBe("@qutivex/core");
  });

  test("serves a health check", async () => {
    const response = handleRequest(new Request("http://localhost/health"));
    const body = (await response.json()) as { status?: string; phase?: number };

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok", phase: 1 });
  });

  test("returns JSON 404 for an unknown route", async () => {
    const response = handleRequest(new Request("http://localhost/nope"));
    const body = (await response.json()) as { error?: string; path?: string };

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Not Found", path: "/nope" });
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

  test("binds a real ephemeral port and shuts down", async () => {
    const server = startServer({ port: 0 });

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/health`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "ok", phase: 1 });
    } finally {
      await server.stop(true);
    }
  });
});
