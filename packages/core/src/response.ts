import { HttpError, QutivexError, statusTextFor } from "./errors";
import type { HandlerResult, HttpMethod } from "./types";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
} as const;

const TEXT_HEADERS = {
  "content-type": "text/plain; charset=utf-8",
} as const;

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}

function errorEnvelope(code: string, message: string): ErrorEnvelope {
  return { error: { code, message } };
}

/** Converts a thrown value into a safe JSON error response. */
export function errorResponse(error: unknown): Response {
  let status = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message = statusTextFor(500);

  if (error instanceof HttpError) {
    status = error.status;
    code = error.code;
    message = error.expose ? error.message : statusTextFor(error.status);
  } else if (error instanceof QutivexError) {
    status = error.status;
    code = error.code;
    message = error.expose ? error.message : statusTextFor(error.status);
  }

  if (!Number.isInteger(status) || status < 400 || status > 599) {
    status = 500;
    code = "INTERNAL_SERVER_ERROR";
    message = statusTextFor(500);
  }

  return new Response(JSON.stringify(errorEnvelope(code, message)), {
    headers: JSON_HEADERS,
    status,
  });
}

/** The default 404 response for unmatched routes. */
export function notFoundResponse(): Response {
  return errorResponse(HttpError.notFound());
}

/** 405 response with an Allow header. */
export function methodNotAllowedResponse(allowed: readonly HttpMethod[]): Response {
  const response = errorResponse(HttpError.methodNotAllowed());
  response.headers.set("allow", allowed.join(", "));
  return response;
}

/** Converts a handler return value to an HTTP response. */
export function toResponse(result: HandlerResult): Response {
  if (result instanceof Response) {
    return result;
  }

  if (result === undefined) {
    return new Response(null, { status: 204 });
  }

  if (typeof result === "string") {
    return new Response(result, { headers: TEXT_HEADERS, status: 200 });
  }

  let body: string | undefined;
  try {
    body = JSON.stringify(result);
  } catch (error) {
    throw new QutivexError("The handler returned a value that cannot be serialized as JSON.", {
      cause: error,
      code: "RESPONSE_SERIALIZATION_FAILED",
    });
  }

  if (body === undefined) {
    throw new QutivexError("The handler returned a value that cannot be serialized as JSON.", {
      code: "RESPONSE_SERIALIZATION_FAILED",
    });
  }

  return new Response(body, { headers: JSON_HEADERS, status: 200 });
}
