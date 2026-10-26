import { describe, expect, test } from "bun:test";
import { type AdapterStartOptions, ServerStartError } from "@qutivex/core";
import { BunHttpAdapter, bunAdapter } from "../src/index";

function startOptions(overrides: Partial<AdapterStartOptions> = {}): AdapterStartOptions {
  return {
    development: false,
    fetch: async () => new Response("ok"),
    hostname: "127.0.0.1",
    port: 0,
    ...overrides,
  };
}

describe("BunHttpAdapter", () => {
  test("returns a working Bun server handle", async () => {
    const server = await bunAdapter().start(startOptions());

    try {
      expect(server.hostname).toBe("127.0.0.1");
      expect(server.port).toBeGreaterThan(0);
      expect(server.url.port).toBe(String(server.port));

      const response = await fetch(server.url);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("ok");
    } finally {
      await server.stop(true);
    }
  });

  test("passes requests to the provided fetch function", async () => {
    let seenPath = "";
    const server = await bunAdapter().start(
      startOptions({
        fetch: async (request) => {
          seenPath = new URL(request.url).pathname;
          return Response.json({ seen: true });
        },
      }),
    );

    try {
      const response = await fetch(new URL("/hello", server.url));
      expect(await response.json()).toEqual({ seen: true });
      expect(seenPath).toBe("/hello");
    } finally {
      await server.stop(true);
    }
  });

  test("creates distinct adapter instances", () => {
    expect(bunAdapter()).toBeInstanceOf(BunHttpAdapter);
    expect(bunAdapter()).not.toBe(bunAdapter());
  });

  test("wraps port conflicts in ServerStartError", async () => {
    const first = await bunAdapter().start(startOptions());

    try {
      expect(() => bunAdapter().start(startOptions({ port: first.port }))).toThrow(
        ServerStartError,
      );
    } finally {
      await first.stop(true);
    }
  });

  test("supports repeated forced stops", async () => {
    const server = await bunAdapter().start(startOptions());

    await server.stop(true);
    await server.stop(true);
  });
});
