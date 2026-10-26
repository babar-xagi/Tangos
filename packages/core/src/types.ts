/** HTTP methods supported by Qutivex. */
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

export type LogFields = Readonly<Record<string, unknown>>;

/** Body types accepted by the stream response helper. */
export type ResponseBody =
  | ReadableStream<Uint8Array>
  | Blob
  | ArrayBuffer
  | Uint8Array
  | string
  | null;

/** Minimal structured logger available on every request and WebSocket context. */
export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

/** Lazy, cached request-body readers. Each method enforces the app body limit. */
export interface RequestBody {
  arrayBuffer(): Promise<ArrayBuffer>;
  formData(): Promise<FormData>;
  json<T = unknown>(): Promise<T>;
  text(): Promise<string>;
}

/** One Server-Sent Event. `data` is JSON-stringified unless it is a string. */
export interface ServerSentEvent {
  comment?: string;
  data?: unknown;
  event?: string;
  id?: string;
  retry?: number;
}

export type ServerSentEventSource = Iterable<ServerSentEvent> | AsyncIterable<ServerSentEvent>;

/** The request context passed to middleware, before hooks, and handlers. */
export interface RequestContext {
  readonly request: Request;
  readonly url: URL;
  readonly method: string;
  readonly path: string;
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
  readonly headers: Headers;
  readonly cookies: Readonly<Record<string, string>>;
  readonly signal: AbortSignal;
  readonly requestId: string;
  readonly logger: Logger;
  readonly state: Map<unknown, unknown>;
  readonly body: RequestBody;

  header(name: string): string | null;
  cookie(name: string): string | undefined;

  // Response helpers -------------------------------------------------------
  json(value: unknown, init?: ResponseInit): Response;
  text(value: string, init?: ResponseInit): Response;
  html(value: string, init?: ResponseInit): Response;
  redirect(location: string, status?: number): Response;
  stream(body: ResponseBody, init?: ResponseInit): Response;
  sse(events: ServerSentEventSource, init?: ResponseInit): Response;
  noContent(): Response;
}

export type Handler = (context: RequestContext) => MaybePromise<HandlerResult>;

export type Next = () => Promise<Response>;

export type Middleware = (context: RequestContext, next: Next) => MaybePromise<Response>;

export type BeforeHook = (context: RequestContext) => MaybePromise<Response | undefined>;

export type AfterHook = (
  context: RequestContext,
  response: Response,
) => MaybePromise<Response | undefined>;

export interface RouteOptions {
  name?: string;
  middleware?: readonly Middleware[];
  metadata?: Readonly<Record<string, unknown>>;
}

export interface RouteInfo {
  readonly method: HttpMethod;
  readonly path: string;
  readonly name?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
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
  /** Global middleware, run in registration order. */
  middleware?: readonly Middleware[];
  /** Maximum request body size in bytes. Defaults to 1 MiB. */
  maxBodyBytes?: number;
  /** Request timeout in milliseconds. Defaults to 0 (disabled). */
  requestTimeoutMs?: number;
  /** Base logger. Defaults to console. */
  logger?: Logger;
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
  /** Resolves an upgrade request to a WebSocket route, if one matches. */
  readonly matchWebSocket?: (request: Request) => WebSocketMatch | undefined;
  /** Reports WebSocket handler failures. */
  readonly onError?: ErrorHandler;
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

/** The subset of a WebSocket connection exposed to application handlers. */
export interface WebSocketConnection {
  readonly remoteAddress: string;
  send(data: string | Uint8Array): void;
  close(code?: number, reason?: string): void;
}

/** Per-connection context captured at upgrade time. */
export interface WebSocketContext {
  readonly request: Request;
  readonly url: URL;
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
  readonly headers: Headers;
  readonly cookies: Readonly<Record<string, string>>;
  readonly requestId: string;
  readonly logger: Logger;
  readonly state: Map<unknown, unknown>;
}

export interface WebSocketHandlers {
  open?(socket: WebSocketConnection, context: WebSocketContext): MaybePromise<void>;
  message?(
    socket: WebSocketConnection,
    message: string | Uint8Array,
    context: WebSocketContext,
  ): MaybePromise<void>;
  close?(
    socket: WebSocketConnection,
    code: number,
    reason: string,
    context: WebSocketContext,
  ): MaybePromise<void>;
  drain?(socket: WebSocketConnection, context: WebSocketContext): MaybePromise<void>;
}

export interface WebSocketMatch {
  readonly handlers: WebSocketHandlers;
  readonly context: WebSocketContext;
}
