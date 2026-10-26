import { type AppOptions, App as CoreApp } from "@qutivex/core";
import { bunAdapter } from "@qutivex/http-bun";

export type {
  AdapterStartOptions,
  AfterHook,
  AppOptions,
  AppState,
  BeforeHook,
  ErrorContext,
  ErrorHandler,
  GroupOptions,
  Handler,
  HandlerResult,
  HttpMethod,
  HttpServer,
  HttpServerAdapter,
  JsonObject,
  ListenOptions,
  LogFields,
  Logger,
  MaybePromise,
  Middleware,
  Next,
  RequestBody,
  RequestContext,
  ResponseBody,
  RouteInfo,
  RouteOptions,
  RunningAppInfo,
  ServerSentEvent,
  ServerSentEventSource,
  ShutdownHook,
  WebSocketConnection,
  WebSocketContext,
  WebSocketHandlers,
  WebSocketMatch,
} from "@qutivex/core";
export {
  ConfigurationError,
  HTTP_METHODS,
  HttpError,
  LifecycleError,
  QutivexError,
  RouteGroup,
  ServerShutdownError,
  ServerStartError,
  statusTextFor,
} from "@qutivex/core";

/**
 * Qutivex application with the Bun HTTP adapter wired in.
 *
 * ```ts
 * import { App } from "qutivex";
 *
 * const app = new App();
 * app.get("/", () => ({ message: "Hello, Qutivex!" }));
 * await app.run();
 * ```
 */
export class App extends CoreApp {
  constructor(options: AppOptions = {}) {
    super({ ...options, adapter: options.adapter ?? bunAdapter() });
  }
}
