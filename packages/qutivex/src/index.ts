import { type AppOptions, App as CoreApp } from "@qutivex/core";
import { bunAdapter } from "@qutivex/http-bun";

export type {
  AdapterStartOptions,
  AppOptions,
  AppState,
  ErrorContext,
  ErrorHandler,
  Handler,
  HandlerResult,
  HttpMethod,
  HttpServer,
  HttpServerAdapter,
  JsonObject,
  ListenOptions,
  MaybePromise,
  RequestContext,
  RouteInfo,
  RunningAppInfo,
  ShutdownHook,
} from "@qutivex/core";
export {
  ConfigurationError,
  HTTP_METHODS,
  HttpError,
  LifecycleError,
  QutivexError,
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
