import { describe, expect, test } from "bun:test";
import { App, ConfigurationError, LifecycleError, type WebSocketHandlers } from "qutivex";

interface CloseInfo {
  code: number;
  reason: string;
}

type Message = string | ArrayBuffer | Uint8Array;

function timeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}.`)), ms);
  });

  return Promise.race([promise, deadline]).finally(() => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  });
}

class SocketProbe {
  readonly socket: WebSocket;
  readonly #messages: Message[] = [];
  readonly #messageWaiters: ((message: Message) => void)[] = [];
  readonly #closeWaiters: ((close: CloseInfo) => void)[] = [];
  #closeInfo: CloseInfo | undefined;

  constructor(url: string) {
    this.socket = new WebSocket(url);
    this.socket.addEventListener("message", (event) => {
      const message = event.data as Message;
      const waiter = this.#messageWaiters.shift();
      if (waiter !== undefined) {
        waiter(message);
      } else {
        this.#messages.push(message);
      }
    });
    this.socket.addEventListener("close", (event) => {
      this.#closeInfo = { code: event.code, reason: event.reason };
      for (const waiter of this.#closeWaiters.splice(0)) {
        waiter(this.#closeInfo);
      }
    });
  }

  async open(): Promise<void> {
    if (this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    await timeout(
      new Promise<void>((resolve, reject) => {
        this.socket.addEventListener("open", () => resolve(), { once: true });
        this.socket.addEventListener("error", () => reject(new Error("WebSocket open failed")), {
          once: true,
        });
      }),
      2_000,
      "WebSocket open",
    );
  }

  async nextMessage(): Promise<Message> {
    const queued = this.#messages.shift();
    if (queued !== undefined) {
      return queued;
    }

    return timeout(
      new Promise<Message>((resolve) => {
        this.#messageWaiters.push(resolve);
      }),
      2_000,
      "WebSocket message",
    );
  }

  async nextClose(): Promise<CloseInfo> {
    if (this.#closeInfo !== undefined) {
      return this.#closeInfo;
    }

    return timeout(
      new Promise<CloseInfo>((resolve) => {
        this.#closeWaiters.push(resolve);
      }),
      2_000,
      "WebSocket close",
    );
  }
}

function socketUrl(info: { url: URL }, path: string): string {
  return `${info.url.href.replace(/^http/, "ws")}${path}`;
}

describe("WebSocket routes", () => {
  test("upgrades, exposes params/query/request ID, and echoes messages", async () => {
    const app = new App({ banner: false });
    const closed: CloseInfo[] = [];

    app.websocket("/ws/:room", {
      open(socket, ctx) {
        socket.send(
          JSON.stringify({
            code: ctx.query.get("token"),
            requestId: ctx.requestId,
            room: ctx.params.room,
          }),
        );
      },
      message(socket, message, ctx) {
        socket.send(`${ctx.params.room}:${message}`);
      },
      close(_socket, code, reason) {
        closed.push({ code, reason });
      },
    });

    const info = await app.listen({ port: 0 });
    const probe = new SocketProbe(socketUrl(info, "ws/room-a?token=abc"));

    try {
      await probe.open();
      const opened = JSON.parse((await probe.nextMessage()) as string) as {
        code: string;
        requestId: string;
        room: string;
      };

      expect(opened.room).toBe("room-a");
      expect(opened.code).toBe("abc");
      expect(opened.requestId).toMatch(/^[0-9a-f-]{36}$/);

      probe.socket.send("hello");
      expect(await probe.nextMessage()).toBe("room-a:hello");

      probe.socket.close(1000, "bye");
      const close = await probe.nextClose();
      expect(close.code).toBe(1000);

      await Bun.sleep(10);
      expect(closed[0]?.code).toBe(1000);
      expect(closed[0]?.reason).toBe("bye");
    } finally {
      probe.socket.close();
      await app.stop(true);
    }
  });

  test("supports binary messages and multiple routes", async () => {
    const app = new App({ banner: false });
    app.websocket("/ws/binary", {
      message(socket, message) {
        socket.send(typeof message === "string" ? "text" : `bytes:${message.byteLength}`);
      },
    });
    app.websocket("/ws/text", {
      message(socket, message) {
        socket.send(`text:${message}`);
      },
    });

    expect(app.webSockets.map((route) => route.path)).toEqual(["/ws/binary", "/ws/text"]);

    const info = await app.listen({ port: 0 });

    try {
      const binary = new SocketProbe(socketUrl(info, "ws/binary"));
      await binary.open();
      binary.socket.send(new Uint8Array([1, 2, 3]));
      expect(await binary.nextMessage()).toBe("bytes:3");
      binary.socket.close();

      const text = new SocketProbe(socketUrl(info, "ws/text"));
      await text.open();
      text.socket.send("hi");
      expect(await text.nextMessage()).toBe("text:hi");
      text.socket.close();
    } finally {
      await app.stop(true);
    }
  });

  test("exposes the remote address and allows server-side close", async () => {
    const app = new App({ banner: false });
    app.websocket("/ws/close", {
      message(socket) {
        socket.send(socket.remoteAddress);
        socket.close(1000, "server-close");
      },
    });

    const info = await app.listen({ port: 0 });
    const probe = new SocketProbe(socketUrl(info, "ws/close"));

    try {
      await probe.open();
      probe.socket.send("go");
      expect((await probe.nextMessage()) as string).not.toBe("");

      const close = await probe.nextClose();
      expect(close.code).toBe(1000);
    } finally {
      probe.socket.close();
      await app.stop(true);
    }
  });

  test("returns 426 when a WebSocket route receives a normal HTTP request", async () => {
    const app = new App({ banner: false });
    app.websocket("/ws/:room", {});

    const info = await app.listen({ port: 0 });

    try {
      const response = await fetch(new URL("ws/room-a", info.url));

      expect(response.status).toBe(426);
      expect(await response.json()).toEqual({
        error: { code: "UPGRADE_REQUIRED", message: "WebSocket upgrade required" },
      });

      const malformed = await fetch(new URL("ws/%E0%A4%A", info.url));
      expect(malformed.status).toBe(404);
    } finally {
      await app.stop(true);
    }
  });

  test("closes the socket and reports handler failures", async () => {
    const app = new App({ banner: false });
    const errors: unknown[] = [];
    app.onError((error) => errors.push(error));
    app.websocket("/ws/error", {
      message() {
        throw new Error("socket handler failed");
      },
    });

    const info = await app.listen({ port: 0 });
    const probe = new SocketProbe(socketUrl(info, "ws/error"));

    try {
      await probe.open();
      probe.socket.send("trigger");
      const close = await probe.nextClose();

      expect(close.code).toBe(1011);
      expect(errors).toHaveLength(1);
      expect((errors[0] as Error).message).toBe("socket handler failed");
    } finally {
      probe.socket.close();
      await app.stop(true);
    }
  });

  test("validates routes and rejects late registration", async () => {
    const app = new App({ banner: false });
    app.websocket("/ws/:room", {});

    expect(() => app.websocket("/ws/:name", {})).toThrow(ConfigurationError);
    expect(() => app.websocket("ws", {})).toThrow(ConfigurationError);
    expect(() => app.websocket("/ws/bad", { open: "nope" as unknown as () => void })).toThrow(
      ConfigurationError,
    );
    expect(() => app.websocket("/ws/null", null as unknown as WebSocketHandlers)).toThrow(
      ConfigurationError,
    );

    await app.listen({ port: 0 });
    expect(() => app.websocket("/ws/late", {})).toThrow(LifecycleError);
    await app.stop();
  });
});
