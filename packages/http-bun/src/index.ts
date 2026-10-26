import {
  type AdapterStartOptions,
  type HttpServer,
  type HttpServerAdapter,
  ServerStartError,
} from "@qutivex/core";

/**
 * Bun implementation of the Qutivex HTTP adapter contract.
 *
 * All `Bun.serve()` details stay in this package so core remains free of
 * runtime-specific APIs.
 */
export class BunHttpAdapter implements HttpServerAdapter {
  start(options: AdapterStartOptions): HttpServer {
    try {
      const server = Bun.serve({
        development: options.development,
        fetch: options.fetch,
        hostname: options.hostname,
        port: options.port,
        reusePort: false,
      });

      return {
        get hostname() {
          return server.hostname ?? options.hostname;
        },
        get port() {
          return server.port ?? options.port;
        },
        get url() {
          return server.url;
        },
        async stop(force = false) {
          await server.stop(force);
        },
      };
    } catch (error) {
      throw new ServerStartError(
        `Could not start the Bun HTTP server on ${options.hostname}:${options.port}.`,
        { cause: error },
      );
    }
  }
}

/** Creates a fresh Bun HTTP adapter for an app. */
export function bunAdapter(): HttpServerAdapter {
  return new BunHttpAdapter();
}
