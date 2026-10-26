/** HTTP methods supported by the Phase 2 core. */
export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export type MaybePromise<T> = T | Promise<T>;

/** Values a handler may return. */
export type JsonObject = { readonly [key: string]: unknown };

export type HandlerResult =
  | Response
  | string
  | number
  | boolean
  | null
  | JsonObject
  | readonly unknown[]
  | undefined;

/** The minimal request context available in Phase 2. */
export interface RequestContext {
  readonly request: Request;
  readonly url: URL;
  readonly method: string;
  readonly path: string;
}

export type Handler = (context: RequestContext) => MaybePromise<HandlerResult>;

export interface RouteInfo {
  readonly method: HttpMethod;
  readonly path: string;
}

export type AppState =
  | "created"
  | "configured"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "failed";

export interface ErrorContext {
  readonly request?: Request;
  readonly state?: AppState;
}

export type ErrorHandler = (error: unknown, context: ErrorContext) => void;

export interface AppOptions {
  /** HTTP adapter. The public `qutivex` package wires in Bun automatically. */
  adapter?: HttpServerAdapter;
  /** Interface to bind. Defaults to 127.0.0.1. */
  hostname?: string;
  /** Port to bind. Defaults to 3000. Use 0 for an ephemeral port. */
  port?: number;
  /** Human-readable app name used in the startup banner. */
  name?: string;
  /** Force the startup banner on or off. Defaults to development mode. */
  banner?: boolean;
  /** Development mode. Defaults to NODE_ENV !== "production". */
  development?: boolean;
  /** Observes request, startup, and shutdown errors. Never breaks a response. */
  onError?: ErrorHandler;
}

export interface ListenOptions {
  hostname?: string;
  port?: number;
}

export interface RunningAppInfo {
  readonly hostname: string;
  readonly port: number;
  readonly url: URL;
}

export interface AdapterStartOptions {
  readonly hostname: string;
  readonly port: number;
  readonly development: boolean;
  readonly fetch: (request: Request) => Promise<Response>;
}

export interface HttpServer {
  readonly hostname: string;
  readonly port: number;
  readonly url: URL;
  stop(force?: boolean): Promise<void>;
}

export interface HttpServerAdapter {
  start(options: AdapterStartOptions): MaybePromise<HttpServer>;
}

export type ShutdownHook = () => MaybePromise<void>;
