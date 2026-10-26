const STATUS_TEXT: Readonly<Record<number, string>> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  413: "Payload Too Large",
  415: "Unsupported Media Type",
  418: "I'm a Teapot",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

const STATUS_CODE: Readonly<Record<number, string>> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  415: "UNSUPPORTED_MEDIA_TYPE",
  418: "TEAPOT",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
  502: "BAD_GATEWAY",
  503: "SERVICE_UNAVAILABLE",
  504: "GATEWAY_TIMEOUT",
};

/** Standard reason phrase for a status code. */
export function statusTextFor(status: number): string {
  return STATUS_TEXT[status] ?? "Error";
}

function codeForStatus(status: number): string {
  return STATUS_CODE[status] ?? "HTTP_ERROR";
}

export interface QutivexErrorOptions {
  code?: string;
  status?: number;
  /** Whether `message` may be shown to an HTTP client. Defaults to false. */
  expose?: boolean;
  cause?: unknown;
}

/** Base error for framework and application errors that map to HTTP responses. */
export class QutivexError extends Error {
  readonly code: string;
  readonly status: number;
  readonly expose: boolean;

  constructor(message: string, options: QutivexErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code ?? "QUTIVEX_ERROR";
    this.status = options.status ?? 500;
    this.expose = options.expose ?? false;
  }
}

export interface HttpErrorOptions {
  status?: number;
  code?: string;
  expose?: boolean;
  cause?: unknown;
}

/** An intentional HTTP error that can be thrown from a handler. */
export class HttpError extends QutivexError {
  constructor(message: string, options: HttpErrorOptions = {}) {
    const status = options.status ?? 500;
    super(message, {
      cause: options.cause,
      code: options.code ?? codeForStatus(status),
      expose: options.expose ?? status < 500,
      status,
    });
  }

  static badRequest(message = "Bad Request"): HttpError {
    return new HttpError(message, { status: 400 });
  }

  static unauthorized(message = "Unauthorized"): HttpError {
    return new HttpError(message, { status: 401 });
  }

  static forbidden(message = "Forbidden"): HttpError {
    return new HttpError(message, { status: 403 });
  }

  static notFound(message = "Not Found"): HttpError {
    return new HttpError(message, { status: 404 });
  }

  static conflict(message = "Conflict"): HttpError {
    return new HttpError(message, { status: 409 });
  }

  static unprocessableEntity(message = "Unprocessable Entity"): HttpError {
    return new HttpError(message, { status: 422 });
  }

  static tooManyRequests(message = "Too Many Requests"): HttpError {
    return new HttpError(message, { status: 429 });
  }

  static internal(message = "Internal Server Error"): HttpError {
    return new HttpError(message, { expose: false, status: 500 });
  }

  static serviceUnavailable(message = "Service Unavailable"): HttpError {
    return new HttpError(message, { status: 503 });
  }
}

/** Invalid app configuration, detected before the server starts. */
export class ConfigurationError extends QutivexError {
  constructor(message: string, options: Omit<QutivexErrorOptions, "code" | "status"> = {}) {
    super(message, { ...options, code: "CONFIGURATION_ERROR", status: 500 });
  }
}

/** An operation is invalid for the current lifecycle state. */
export class LifecycleError extends QutivexError {
  constructor(message: string, options: Omit<QutivexErrorOptions, "code" | "status"> = {}) {
    super(message, { ...options, code: "LIFECYCLE_ERROR", status: 500 });
  }
}

/** The HTTP adapter could not start the server. */
export class ServerStartError extends QutivexError {
  constructor(message: string, options: Omit<QutivexErrorOptions, "code" | "status"> = {}) {
    super(message, { ...options, code: "SERVER_START_FAILED", status: 503 });
  }
}

/** The server or a shutdown hook failed during graceful shutdown. */
export class ServerShutdownError extends QutivexError {
  constructor(message: string, options: Omit<QutivexErrorOptions, "code" | "status"> = {}) {
    super(message, { ...options, code: "SERVER_SHUTDOWN_FAILED", status: 500 });
  }
}
