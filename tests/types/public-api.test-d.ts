import type { App, AppState, Handler, HttpError, RequestContext, RunningAppInfo } from "qutivex";

/**
 * Type-level tests. This file is included in `tsc --noEmit` but is not a
 * runtime test; it verifies public types, inference, and read-only contracts.
 */

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

export type ContextRequestIsRequest = Expect<Equal<RequestContext["request"], Request>>;
export type ContextPathIsString = Expect<Equal<RequestContext["path"], string>>;
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
export type HttpErrorHasStatus = Expect<Equal<HttpError["status"], number>>;

export const validHandler: Handler = (context) => ({
  method: context.method,
  path: context.path,
});

/** Never executed; proves the compiler rejects invalid handler results. */
export function verifyHandlerTypes(): void {
  // @ts-expect-error — symbols are not JSON handler results.
  const invalid: Handler = () => Symbol("nope");
  void invalid;
}

/** Never executed; proves the status property is read-only. */
export function verifyReadonlyErrorStatus(error: HttpError): void {
  // @ts-expect-error — HttpError status is read-only.
  error.status = 500;
}
