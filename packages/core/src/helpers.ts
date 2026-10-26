import { ConfigurationError } from "./errors";
import type {
  LogFields,
  Logger,
  ResponseBody,
  ServerSentEvent,
  ServerSentEventSource,
} from "./types";

const REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

const consoleLogger: Logger = {
  debug(message, fields) {
    console.debug(message, fields);
  },
  error(message, fields) {
    console.error(message, fields);
  },
  info(message, fields) {
    console.info(message, fields);
  },
  warn(message, fields) {
    console.warn(message, fields);
  },
};

/** Uses a safe incoming request ID or creates one. */
export function resolveRequestId(headers: Headers): string {
  const supplied = headers.get("x-request-id");
  if (supplied !== null && REQUEST_ID.test(supplied)) {
    return supplied;
  }
  return crypto.randomUUID();
}

/** Parses the Cookie header. First occurrence of a name wins. */
export function parseCookies(header: string | null): Readonly<Record<string, string>> {
  if (header === null || header === "") {
    return {};
  }

  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const name = part.slice(0, separator).trim();
    if (name === "" || name in cookies) {
      continue;
    }

    const rawValue = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }
  }

  return cookies;
}

/** Builds a request-bound logger that adds request metadata to every line. */
export function createRequestLogger(
  base: Logger | undefined,
  meta: Readonly<Record<string, string>>,
): Logger {
  const logger = base ?? consoleLogger;

  const write =
    (level: keyof Logger) =>
    (message: string, fields?: LogFields): void => {
      logger[level](message, { ...fields, ...meta });
    };

  return {
    debug: write("debug"),
    error: write("error"),
    info: write("info"),
    warn: write("warn"),
  };
}

function withContentType(init: ResponseInit | undefined, value: string): Headers {
  const headers = new Headers(
    init?.headers as ConstructorParameters<typeof Headers>[0] | undefined,
  );
  if (!headers.has("content-type")) {
    headers.set("content-type", value);
  }
  return headers;
}

/** JSON response helper with a predictable content type. */
export function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  return Response.json(value, {
    ...init,
    headers: withContentType(init, "application/json; charset=utf-8"),
  });
}

/** Plain-text response helper. */
export function textResponse(value: string, init: ResponseInit = {}): Response {
  return new Response(value, {
    ...init,
    headers: withContentType(init, "text/plain; charset=utf-8"),
  });
}

/** HTML response helper. */
export function htmlResponse(value: string, init: ResponseInit = {}): Response {
  return new Response(value, {
    ...init,
    headers: withContentType(init, "text/html; charset=utf-8"),
  });
}

/** Redirect helper. Only 3xx statuses are accepted. */
export function redirectResponse(location: string, status = 302): Response {
  if (!Number.isInteger(status) || status < 300 || status > 399) {
    throw new ConfigurationError(`Redirect status must be between 300 and 399, got ${status}.`);
  }

  const headers = new Headers({ location });
  return new Response(null, { headers, status });
}

/** Streaming response helper; the caller owns the stream lifecycle. */
export function streamResponse(body: ResponseBody, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

/** No-content helper. */
export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

function formatEvent(event: ServerSentEvent): string {
  const lines: string[] = [];

  if (event.comment !== undefined) {
    for (const line of event.comment.split(/\r?\n/)) {
      lines.push(`: ${line}`);
    }
  }
  if (event.event !== undefined) {
    lines.push(`event: ${event.event}`);
  }
  if (event.id !== undefined) {
    lines.push(`id: ${event.id}`);
  }
  if (event.retry !== undefined) {
    lines.push(`retry: ${event.retry}`);
  }
  if (event.data !== undefined) {
    const data =
      typeof event.data === "string" ? event.data : (JSON.stringify(event.data) ?? "null");
    for (const line of data.split(/\r?\n/)) {
      lines.push(`data: ${line}`);
    }
  }

  return `${lines.join("\n")}\n\n`;
}

/** Creates an `text/event-stream` response from sync or async events. */
export function sseResponse(events: ServerSentEventSource, init: ResponseInit = {}): Response {
  const headers = withContentType(init, "text/event-stream; charset=utf-8");
  headers.set("cache-control", "no-cache, no-transform");
  headers.set("x-accel-buffering", "no");

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encoder.encode(formatEvent(event)));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, { ...init, headers });
}
