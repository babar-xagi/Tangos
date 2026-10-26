# RFC 0001: Public API

- **Status:** Accepted ✅ (implemented in Phase 2)
- **Target:** Phase 2, extended in later phases
- **Author:** Qutivex maintainers
- **Created:** 2026-10-26

## Summary

Qutivex exposes a **fluent, typed application object** from the public `qutivex`
package. Route registration is explicit; handlers receive a small request
context and may return a `Response`, a string, JSON-compatible data, or
`undefined`.

The design avoids decorators, reflection metadata, and class controllers.

## Goals

- `new App()` works without configuration.
- A hello-world route fits in one line.
- Types infer without annotation for normal handlers.
- Runtime behavior is explicit: no hidden body parsing, serialization magic, or
  global state.
- The core stays runtime-agnostic behind an HTTP adapter.
- Errors produce one consistent JSON shape.
- The same API can grow to support middleware, validation, and typed responses.

## Non-goals (v1)

- Decorator/controller APIs.
- Automatic request body parsing.
- A custom serializer or code generator.
- Implicit dependency injection through globals.
- Multiple runtimes.

## Public package

```ts
import { App, HttpError, type RequestContext } from "qutivex";
```

Internally:

- `@qutivex/core` — lifecycle, route table, response semantics, errors.
- `@qutivex/http-bun` — `Bun.serve()` adapter.
- `qutivex` — public umbrella with the Bun adapter wired in.

`@qutivex/*` packages are implementation packages. Public API changes are
recorded here first.

## Creating an app

```ts
const app = new App({
  name: "My API",      // optional, default "Qutivex"
  hostname: "127.0.0.1",
  port: 3000,
  development: true,   // defaults to NODE_ENV !== "production"
  banner: true,        // defaults to development
  onError(error, context) {},
});
```

`adapter` may be supplied for tests or custom runtimes. The public `App`
defaults to the Bun adapter.

## Routes

```ts
app
  .get("/", () => ({ message: "Hello, Qutivex!" }))
  .post("/users", (ctx) => ({ created: true }))
  .put("/users/:id", (ctx) => ({ id: ctx.path }))
  .patch("/users/:id", () => ({ updated: true }))
  .delete("/users/:id", () => undefined)
  .options("/users", () => undefined)
  .head("/users", () => undefined);
```

Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`.

Routes register **before** startup. Registering after startup or stop throws a
`LifecycleError`. Duplicate method/path pairs throw a `ConfigurationError`.

### Phase 2 route matching

Exact paths only. Parameters, wildcards, groups, and middleware are Phase 3 and
specified in [RFC 0002](0002-routing.md).

## Handler context

```ts
app.get("/me", (ctx) => ({
  method: ctx.method,
  path: ctx.path,
  url: ctx.url.href,
  request: ctx.request,
}));
```

Phase 2 context:

| Field | Type | Notes |
| --- | --- | --- |
| `request` | `Request` | Native web request |
| `url` | `URL` | Parsed URL |
| `method` | `string` | Uppercase HTTP method |
| `path` | `string` | `url.pathname` |

Phase 3 adds `params`, `query`, `headers`, `cookies`, lazy body access, request
ID, and middleware state. Later phases add `principal`, `dependencies`, and
`signal`. Additions are optional or backwards-compatible.

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
- `HEAD` runs the explicit HEAD route if present, otherwise the GET route, and
  strips the response body.
- Error body shape is always:

```json
{ "error": { "code": "NOT_FOUND", "message": "Not Found" } }
```

## Errors

```ts
import { HttpError } from "qutivex";

app.get("/private", () => {
  throw HttpError.unauthorized("Sign in first");
});
```

Factories: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`,
`unprocessableEntity`, `tooManyRequests`, `internal`, `serviceUnavailable`.

Rules:

- 4xx messages are exposed by default.
- 5xx messages are hidden by default; the client sees the standard reason
  phrase.
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
- Calling `listen()` while running returns the same info.
- `app.stop(force?)` is idempotent; repeated calls resolve.
- Shutdown hooks run last-registered-first after the server stops accepting
  requests.
- A hook or server-stop failure calls `onError` and rejects with
  `ServerShutdownError`.

## Testing without a socket

```ts
const response = await app.fetch(new Request("http://localhost/health"));
```

`fetch` uses the same dispatch and error normalization as the live server. This
is the foundation for the Phase 6 test client.

## Adapter boundary

```ts
interface HttpServerAdapter {
  start(options: {
    hostname: string;
    port: number;
    development: boolean;
    fetch: (request: Request) => Promise<Response>;
  }): HttpServer | Promise<HttpServer>;
}
```

Core never references `Bun.*`. This keeps the Phase 2 core testable with a fake
adapter and leaves room for another runtime later without rewriting `App`.

## Compatibility

- Phase 2 established the above API. Later phases may add fields, overloads,
  and route options.
- Changes that remove or rename public members require a new RFC and a
  deprecation path.
- The `qutivex` umbrella is the stable import; internal `@qutivex/*` imports may
  change before 1.0.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Decorators/controllers | Requires reflection, metadata, and heavier onboarding. |
| Per-route `Response` only | Verbose for JSON APIs; loses the simplicity promise. |
| Router-first API (`router.get`) | More concepts before hello world. |
| Implicit JSON parsing | Hides I/O and error cases; later phases make it explicit. |
| Global app singleton | Hostile to tests and multi-app processes. |

## Open questions

- Should `run()` also install process signal handlers, or stay a pure alias?
  Current answer: pure alias; CLI/dev server owns signals in Phase 5.
- Should `listen()` accept a full `Bun.serve` option bag? No—adapter options
  would leak runtime details into core.
- How much of `RequestContext` should be lazy in Phase 3? Deferred to RFC 0002.
