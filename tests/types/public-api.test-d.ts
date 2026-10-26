import type {
  App,
  AppState,
  Handler,
  HttpError,
  Middleware,
  RequestContext,
  RouteGroup,
  RunningAppInfo,
  WebSocketHandlers,
} from "qutivex";

/**
 * Type-level tests. This file is included in `tsc --noEmit` but is not a
 * runtime test; it verifies public types, inference, and read-only contracts.
 */

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

export type ContextRequestIsRequest = Expect<Equal<RequestContext["request"], Request>>;
export type ContextPathIsString = Expect<Equal<RequestContext["path"], string>>;
export type ContextParamsAreStrings = Expect<
  Equal<RequestContext["params"], Readonly<Record<string, string>>>
>;
export type ContextQueryIsSearchParams = Expect<Equal<RequestContext["query"], URLSearchParams>>;
export type ContextHeadersAreHeaders = Expect<Equal<RequestContext["headers"], Headers>>;
export type ContextSignalIsAbortSignal = Expect<Equal<RequestContext["signal"], AbortSignal>>;
export type BodyJsonReturnsUnknown = Expect<
  Equal<ReturnType<RequestContext["body"]["json"]>, Promise<unknown>>
>;
export type AppStateIsUnion = Expect<
  Equal<
    AppState,
    "created" | "configured" | "starting" | "running" | "stopping" | "stopped" | "failed"
  >
>;
export type GetReturnsApp = Expect<Equal<ReturnType<App["get"]>, App>>;
export type ListenReturnsPromise = Expect<
  Equal<ReturnType<App["listen"]>, Promise<RunningAppInfo>>
>;
export type GroupGetReturnsGroup = Expect<Equal<ReturnType<RouteGroup["get"]>, RouteGroup>>;
export type HttpErrorHasStatus = Expect<Equal<HttpError["status"], number>>;

export const validHandler: Handler = (context) => ({
  id: context.params.id,
  method: context.method,
  path: context.path,
});

export const validMiddleware: Middleware = async (context, next) => {
  context.state.set("seen", true);
  return next();
};

export const validWebSocketHandlers: WebSocketHandlers = {
  message(socket, message, context) {
    socket.send(`${context.params.room}:${message}`);
  },
};

export async function readTypedBody(context: RequestContext): Promise<{ name: string }> {
  return context.body.json<{ name: string }>();
}

declare function validHandlerParams(): RequestContext["params"];

/** Never executed; proves the compiler rejects invalid public usage. */
export function verifyInvalidUsage(): void {
  // @ts-expect-error — symbols are not JSON handler results.
  const invalidHandler: Handler = () => Symbol("nope");
  void invalidHandler;

  // @ts-expect-error — middleware must return a Response.
  const invalidMiddleware: Middleware = async () => "nope";
  void invalidMiddleware;

  // @ts-expect-error — params values are strings, not numbers.
  const invalidParams: Record<string, number> = validHandlerParams();
  void invalidParams;
}

/** Never executed; proves the status property is read-only. */
export function verifyReadonlyErrorStatus(error: HttpError): void {
  // @ts-expect-error — HttpError status is read-only.
  error.status = 500;
}
