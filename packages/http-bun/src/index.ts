import {
  type AdapterStartOptions,
  type HttpServer,
  type HttpServerAdapter,
  ServerStartError,
  type WebSocketConnection,
  type WebSocketMatch,
} from "@qutivex/core";

type BunSocket = Bun.ServerWebSocket<WebSocketMatch>;

function wrapSocket(socket: BunSocket): WebSocketConnection {
  return {
    close(code, reason) {
      socket.close(code, reason);
    },
    get remoteAddress() {
      return socket.remoteAddress;
    },
    send(data) {
      socket.send(data);
    },
  };
}

function failSocket(options: AdapterStartOptions, socket: BunSocket, error: unknown): void {
  try {
    options.onError?.(error, { request: socket.data.context.request });
  } catch {
    // Error observers must not break the socket lifecycle.
  }

  try {
    socket.close(1011, "Internal error");
  } catch {
    // The socket may already be closed.
  }
}

function runSocketAction(
  options: AdapterStartOptions,
  socket: BunSocket,
  action: () => void | Promise<void>,
): void {
  void (async () => {
    try {
      await action();
    } catch (error) {
      failSocket(options, socket, error);
    }
  })();
}

/**
 * Bun implementation of the Qutivex HTTP adapter.
 *
 * All `Bun.serve()` details stay in this package so core remains free of
 * runtime-specific APIs.
 */
export class BunHttpAdapter implements HttpServerAdapter {
  start(options: AdapterStartOptions): HttpServer {
    try {
      const server = Bun.serve<WebSocketMatch>({
        development: options.development,
        fetch: async (request, bunServer) => {
          if (options.matchWebSocket !== undefined) {
            const match = options.matchWebSocket(request);
            if (match !== undefined) {
              const upgraded = (bunServer as Bun.Server<WebSocketMatch>).upgrade(request, {
                data: match,
                headers: { "x-request-id": match.context.requestId },
              });
              if (upgraded) {
                return undefined;
              }

              return new Response(
                JSON.stringify({
                  error: {
                    code: "UPGRADE_REQUIRED",
                    message: "WebSocket upgrade required",
                  },
                }),
                {
                  headers: {
                    "cache-control": "no-store",
                    "content-type": "application/json; charset=utf-8",
                  },
                  status: 426,
                },
              );
            }
          }

          return options.fetch(request);
        },
        hostname: options.hostname,
        port: options.port,
        reusePort: false,
        websocket: {
          close(socket, code, reason) {
            runSocketAction(options, socket, () =>
              socket.data.handlers.close?.(wrapSocket(socket), code, reason, socket.data.context),
            );
          },
          drain(socket) {
            runSocketAction(options, socket, () =>
              socket.data.handlers.drain?.(wrapSocket(socket), socket.data.context),
            );
          },
          message(socket, message) {
            const data = typeof message === "string" ? message : new Uint8Array(message);
            runSocketAction(options, socket, () =>
              socket.data.handlers.message?.(wrapSocket(socket), data, socket.data.context),
            );
          },
          open(socket) {
            runSocketAction(options, socket, () =>
              socket.data.handlers.open?.(wrapSocket(socket), socket.data.context),
            );
          },
        },
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
