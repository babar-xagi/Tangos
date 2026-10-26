# RFC 0001: Public API

- **Status:** Accepted ✅ (Phase 2, extended in Phase 3)
- **Target:** Phase 2 onward
- **Author:** Qutivex maintainers
- **Created:** 2026-10-26

## Summary

Qutivex exposes a **fluent, typed application object** from the public `qutivex`
package. Route registration is explicit; handlers receive a request context and
may return a `Response`, a string, JSON-compatible data, or `undefined`.

The design avoids decorators, reflection metadata, and class controllers.

## Goals

- `new App()` works without configuration.
- A hello-world route fits in one line.
- Types infer without annotation for normal handlers.
- Runtime behavior is explicit: no hidden body parsing, serialization magic, or
  global state.
- The core stays runtime-agnostic behind an HTTP adapter.
- Errors produce one consistent JSON shape.
- The API can grow to support middleware, validation, and typed responses.

## Non-goals (v1)

- Decorator/controller APIs.
- A custom serializer or code generator.
- Implicit dependency injection through globals.
- Multiple runtimes.

## Public package

```ts
import { App, HttpError, type RequestContext } from "qutivex";
```

Internally:

- `@qutivex/core` — lifecycle, routing, context, middleware, errors.
- `@qutivex/router` — path patterns and matching.
- `@qutivex/http-bun` — `Bun.serve()` adapter and WebSocket bridge.
- `qutivex` — public umbrella with the Bun adapter wired in.

## Creating an app

```ts
const app = new App({
  name: "My API",
  hostname: "127.0.0.1",
  port: 3000,
  maxBodyBytes: 1024 * 1024,
  requestTimeoutMs: 0,
  development: true,
  banner: true,
  middleware: [],
  onError(error, context) {},
});
```

## Routes

```ts
app
  .get("/", () => ({ message: "Hello, Qutivex!" }))
  .post("/users", (ctx) => ({ created: true }))
  .put("/users/:id", (ctx) => ({ id: ctx.params.id }))
  .patch("/users/:id", () => ({ updated: true }))
  .delete("/users/:id", () => undefined)
  .options("/users", () => undefined)
  .head("/users", () => undefined);
```

Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`.

Routes register **before** startup. Registering after startup or stop throws a
`LifecycleError`. Duplicate/ambiguous routes throw `ConfigurationError`.

### Route options

```ts
app.get("/users/:id", {
  name: "users.show",
  metadata: { auth: true },
  middleware: [rateLimit],
}, handler);
```

### Groups

```ts
const api = app.group("/api", { middleware: [auth], metadata: { section: "api" } });
api.get("/users/:id", handler);
```

## Handler context (Phase 3)

| Field / method | Type |
| --- | --- |
| `request`, `url`, `method`, `path` | request basics |
| `params` | `Readonly<Record<string, string>>` |
| `query` | `URLSearchParams` |
| `headers`, `header(name)` | `Headers` |
| `cookies`, `cookie(name)` | parsed cookie record |
| `body.json/text/formData/arrayBuffer` | lazy, cached, size-limited |
| `signal` | client abort + timeout |
| `requestId`, `logger`, `state` | observability and request metadata |
| `json/text/html/redirect/stream/sse/noContent` | response helpers |

Phase 4 adds schemas and typed params; Phase 6 adds DI; Phase 8 adds the
authenticated principal. Additions must remain backwards-compatible.

## Handler results

| Returned value | Response |
| --- | --- |
| `Response` | Passed through unchanged |
| `string` | `200 text/plain; charset=utf-8` |
| JSON object/array/number/boolean/null | `200 application/json; charset=utf-8` |
| `undefined` | `204 No Content` |
| Thrown `HttpError` | Its status, code, and (unless internal) message |
| Any other thrown value | `500` with a generic, non-leaking body |

- No double-wrapping of `Response`.
- JSON serialization failure becomes a safe `500`.
- `HEAD` runs the explicit HEAD route if present, otherwise GET, and strips the
  body.
- 405 includes `Allow`; GET implies HEAD.
- Error body shape is always:

```json
{ "error": { "code": "NOT_FOUND", "message": "Not Found" } }
```

## Middleware and hooks (Phase 3)

```ts
app.use(async (ctx, next) => {
  const response = await next();
  response.headers.set("x-request-id", ctx.requestId);
  return response;
});

app.before((ctx) => { /* optional Response */ });
app.after((ctx, response) => { /* optional replacement */ });
```

- Middleware signature: `(ctx, next) => Response | Promise<Response>`.
- Calling `next()` twice is a `500`.
- Return a `Response` to short-circuit.
- Order: global → group → route → before → handler → after.
- Error hooks: `AppOptions.onError` plus `app.onError()`.
- Error observers never break the response.

## Errors

```ts
import { HttpError } from "qutivex";

app.get("/private", () => {
  throw HttpError.unauthorized("Sign in first");
});
```

Factories: `badRequest`, `unauthorized`, `forbidden`, `notFound`,
`methodNotAllowed`, `conflict`, `payloadTooLarge`, `unsupportedMediaType`,
`unprocessableEntity`, `tooManyRequests`, `internal`, `serviceUnavailable`,
`requestTimeout`.

Rules:

- 4xx messages are exposed by default.
- 5xx messages are hidden by default; the client sees the standard reason.
- Stack traces and causes are never serialized.
- Custom errors extend `QutivexError` with a code, status, and `expose` flag.

## Lifecycle

```text
created ──route──▶ configured ──listen()──▶ starting ──▶ running
                                                    │
                                      stop() ────────┘
                                        │
                                    stopping ──▶ stopped
                                        │
                                    failure ──▶ failed
```

- `app.state` exposes the current state.
- `app.listen()` resolves with `{ hostname, port, url }`.
- `app.run()` is an alias for `listen()`.
- `app.stop(force?)` is idempotent; repeated calls resolve.
- Hooks run last-registered-first after the server stops accepting requests.
- Shutdown failures call error hooks and reject with `ServerShutdownError`.

## Testing without a socket

```ts
const response = await app.fetch(new Request("http://localhost/health"));
```

`fetch` uses the same routing, middleware, body, response, and error behavior as
the live server.

## WebSockets (Phase 3)

```ts
app.websocket("/ws/:room", {
  open(socket, ctx) {},
  message(socket, message, ctx) {},
  close(socket, code, reason, ctx) {},
});
```

WebSocket routes share the HTTP path-pattern rules and expose a context with
params, query, headers, cookies, request ID, logger, and state.

## Adapter boundary

```ts
interface HttpServerAdapter {
  start(options: {
    hostname: string;
    port: number;
    development: boolean;
    fetch: (request: Request) => Promise<Response>;
    matchWebSocket?: (request: Request) => WebSocketMatch | undefined;
    onError?: ErrorHandler;
  }): HttpServer | Promise<HttpServer>;
}
```

Core never references `Bun.*`.

## Compatibility

- Phase 3 added fields, overloads, groups, middleware, hooks, and WebSockets.
- Removing or renaming public members requires a new RFC and deprecation path.
- The `qutivex` umbrella is the stable import; internal packages may change.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Decorators/controllers | Reflection, metadata, heavier onboarding. |
| Per-route `Response` only | Verbose; loses simplicity. |
| Router-first API | More concepts before hello world. |
| Implicit JSON parsing | Hides I/O and errors. |
| Global app singleton | Hostile to tests. |

## Open questions

- Should `run()` install process signal handlers, or stay a pure alias? Current:
  pure alias.
- Exact middleware API for typed context augmentation (Phase 6).
- Whether route middleware can add per-route before/after hooks in v1.
