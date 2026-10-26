import { createRequestBody } from "./body";
import {
  htmlResponse,
  jsonResponse,
  noContentResponse,
  parseCookies,
  redirectResponse,
  sseResponse,
  streamResponse,
  textResponse,
} from "./helpers";
import type { Logger, RequestContext } from "./types";

export interface CreateContextOptions {
  readonly request: Request;
  readonly url: URL;
  readonly method: string;
  readonly path: string;
  readonly params: Readonly<Record<string, string>>;
  readonly requestId: string;
  readonly signal: AbortSignal;
  readonly logger: Logger;
  readonly maxBodyBytes: number;
}

/** Builds the per-request context. Every request gets fresh state and body cache. */
export function createRequestContext(options: CreateContextOptions): RequestContext {
  const headers = options.request.headers;
  const cookies = parseCookies(headers.get("cookie"));
  const state = new Map<unknown, unknown>();

  return {
    body: createRequestBody(options.request, options.maxBodyBytes),
    cookie(name) {
      return cookies[name];
    },
    cookies,
    header(name) {
      return headers.get(name);
    },
    headers,
    html(value, init) {
      return htmlResponse(value, init);
    },
    json(value, init) {
      return jsonResponse(value, init);
    },
    logger: options.logger,
    method: options.method,
    noContent() {
      return noContentResponse();
    },
    params: options.params,
    path: options.path,
    query: options.url.searchParams,
    redirect(location, status) {
      return redirectResponse(location, status);
    },
    request: options.request,
    requestId: options.requestId,
    signal: options.signal,
    sse(events, init) {
      return sseResponse(events, init);
    },
    state,
    stream(body, init) {
      return streamResponse(body, init);
    },
    text(value, init) {
      return textResponse(value, init);
    },
    url: options.url,
  };
}
