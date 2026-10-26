import { FRAMEWORK, PACKAGE as CORE_PACKAGE } from "@qutivex/core";

/**
 * Phase 1 example server.
 *
 * This is deliberately a plain `Bun.serve()` handler, not the Qutivex `App`
 * API. Phase 1 only has to prove that the repository, workspace links, scripts,
 * and test harness work end to end. Phase 2 replaces this with the real
 * minimal HTTP core.
 */

const DEFAULT_PORT = 3000;
const DEFAULT_HOSTNAME = "127.0.0.1";

/** Options accepted by the example server. */
export interface ServerOptions {
  /** Interface to bind. Defaults to 127.0.0.1 so examples do not expose ports. */
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

/** Handles one example request. Exported so tests can exercise it without a socket. */
export function handleRequest(request: Request): Response {
  const url = new URL(request.url);

  switch (url.pathname) {
    case "/":
      return Response.json({
        message: `Hello from ${FRAMEWORK.name}`,
        framework: FRAMEWORK.name,
        phase: FRAMEWORK.phase,
        core: CORE_PACKAGE.name,
        note: "Phase 1 foundation example. The Qutivex App API arrives in Phase 2.",
      });

    case "/health":
      return Response.json({ status: "ok", phase: FRAMEWORK.phase });

    default:
      return Response.json({ error: "Not Found", path: url.pathname }, { status: 404 });
  }
}

/** Starts the example server and returns the Bun server handle. */
export function startServer(options: ServerOptions = {}) {
  return Bun.serve({
    hostname: options.hostname ?? DEFAULT_HOSTNAME,
    port: options.port ?? DEFAULT_PORT,
    fetch: handleRequest,
  });
}
