import { describe, expect, test } from "bun:test";
import { App, HttpError, ServerStartError } from "qutivex";

describe("Qutivex over a real Bun socket", () => {
  test("serves JSON, HEAD, 404, and shuts down repeatedly", async () => {
    const app = new App({ banner: false, name: "Integration" });
    app.get("/", () => ({ hello: "world" }));
    app.get("/health", () => ({ status: "ok" }));

    const info = await app.listen({ port: 0 });

    try {
      expect(app.state).toBe("running");
      expect(info.url.hostname).toBe("127.0.0.1");

      const home = await fetch(info.url);
      expect(home.status).toBe(200);
      expect(await home.json()).toEqual({ hello: "world" });

      const health = await fetch(new URL("health", info.url));
      expect(health.status).toBe(200);
      expect(await health.json()).toEqual({ status: "ok" });

      const missing = await fetch(new URL("missing", info.url));
      expect(missing.status).toBe(404);
      expect(await missing.json()).toEqual({
        error: { code: "NOT_FOUND", message: "Not Found" },
      });

      const head = await fetch(new URL("health", info.url), { method: "HEAD" });
      expect(head.status).toBe(200);
      expect(await head.text()).toBe("");
    } finally {
      await app.stop(true);
      await app.stop(true);
    }

    expect(app.state).toBe("stopped");
  });

  test("maps thrown errors to safe statuses", async () => {
    const app = new App({ banner: false });
    app.get("/boom", () => {
      throw new Error("do not leak this");
    });
    app.get("/teapot", () => {
      throw new HttpError("short and stout", { code: "TEAPOT", status: 418 });
    });

    const info = await app.listen({ port: 0 });

    try {
      const boom = await fetch(new URL("boom", info.url));
      const boomText = await boom.text();
      expect(boom.status).toBe(500);
      expect(boomText).not.toContain("do not leak this");

      const teapot = await fetch(new URL("teapot", info.url));
      expect(teapot.status).toBe(418);
      expect(await teapot.json()).toEqual({
        error: { code: "TEAPOT", message: "short and stout" },
      });
    } finally {
      await app.stop(true);
    }
  });

  test("handles concurrent requests over a real socket", async () => {
    const app = new App({ banner: false });
    app.get("/echo", (context) => ({ id: context.url.searchParams.get("id") }));
    const info = await app.listen({ port: 0 });

    try {
      const responses = await Promise.all(
        Array.from({ length: 25 }, (_, index) => fetch(new URL(`echo?id=${index}`, info.url))),
      );
      const bodies = (await Promise.all(responses.map((response) => response.json()))) as {
        id: string;
      }[];

      expect(bodies.map((body) => body.id)).toEqual(
        Array.from({ length: 25 }, (_, index) => String(index)),
      );
    } finally {
      await app.stop(true);
    }
  });

  test("fails cleanly when the port is already in use", async () => {
    const first = new App({ banner: false });
    first.get("/", () => "first");
    const firstInfo = await first.listen({ port: 0 });

    const second = new App({ banner: false });
    second.get("/", () => "second");

    try {
      await expect(second.listen({ port: firstInfo.port })).rejects.toBeInstanceOf(
        ServerStartError,
      );
      expect(second.state).toBe("failed");
    } finally {
      await second.stop(true);
      await first.stop(true);
    }
  });

  test("survives an aborted client connection", async () => {
    const app = new App({ banner: false });
    let release!: () => void;
    const slowGate = new Promise<void>((resolve) => {
      release = resolve;
    });

    app.get("/slow", async () => {
      await slowGate;
      return "slow";
    });
    app.get("/health", () => ({ status: "ok" }));

    const info = await app.listen({ port: 0 });

    try {
      const controller = new AbortController();
      const aborted = fetch(new URL("slow", info.url), { signal: controller.signal }).catch(
        (error: unknown) => error,
      );

      controller.abort();
      release();

      expect(await aborted).toBeInstanceOf(Error);

      const health = await fetch(new URL("health", info.url));
      expect(health.status).toBe(200);
      expect(await health.json()).toEqual({ status: "ok" });
    } finally {
      await app.stop(true);
    }
  });
});
