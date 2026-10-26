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

/** Builds the example application. */
export function createApp(): App {
  const app = new App({ name: "Qutivex Hello" });

  app.get("/", () => ({
    message: "Hello from Qutivex 👋",
    framework: "Qutivex",
    phase: 2,
  }));

  app.get("/health", () => ({ status: "ok", phase: 2 }));

  return app;
}

/** Starts the example on an ephemeral or provided port and returns its handle. */
export async function startServer(options: ServerOptions = {}) {
  const app = createApp();
  const info = await app.listen(options);

  return { app, info };
}
