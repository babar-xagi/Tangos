import { App } from "qutivex";

const DEFAULT_PORT = 3000;

/** Options accepted by the example server. */
export interface ServerOptions {
  /** Interface to bind. Defaults to 127.0.0.1. */
  hostname?: string;
  /** Port to bind. Defaults to 3000; use 0 for an ephemeral test port. */
  port?: number;
}

/**
 * Parses a `PORT` environment value.
 *
 * @throws RangeError when the value is not an integer between 0 and 65535.
 */
export function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError(`Invalid PORT "${value}": expected an integer between 0 and 65535.`);
  }

  return port;
}

/** Builds the Phase 3 example application. */
export function createApp(): App {
  const app = new App({ name: "Qutivex Hello" });

  // Global middleware: add a timing header to every response.
  app.use(async (_ctx, next) => {
    const startedAt = performance.now();
    const response = await next();
    response.headers.set("x-response-time-ms", (performance.now() - startedAt).toFixed(2));
    return response;
  });

  app.get("/", () => ({
    message: "Hello from Qutivex 👋",
    framework: "Qutivex",
    phase: 3,
  }));

  app.get("/health", () => ({ status: "ok", phase: 3 }));

  // Path params + query params.
  app.get("/hello/:name", (ctx) => ({
    greeting: `${ctx.query.get("greeting") ?? "Hello"}, ${ctx.params.name}! 👋`,
    requestId: ctx.requestId,
  }));

  // Lazy JSON body parsing.
  app.post("/echo", async (ctx) => ({
    echo: await ctx.body.json<{ message?: string }>(),
    method: ctx.method,
    path: ctx.path,
  }));

  // Route group with a shared prefix.
  const api = app.group("/api");
  api.get("/version", () => ({ phase: 3, version: "0.0.0" }));

  // Server-Sent Events.
  app.get("/events", (ctx) =>
    ctx.sse([
      { event: "hello", data: { message: "Qutivex SSE" } },
      { event: "done", data: "bye" },
    ]),
  );

  return app;
}

/** Starts the example on an ephemeral or provided port and returns its handle. */
export async function startServer(options: ServerOptions = {}) {
  const app = createApp();
  const info = await app.listen(options);

  return { app, info };
}
