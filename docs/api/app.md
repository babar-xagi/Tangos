# 🧩 App API reference

The `App` object is the center of every Qutivex application. This page covers
**Phase 3** exactly—no future API is presented as available.

```ts
import { App } from "qutivex";
```

---

## 🏗️ `new App(options?)`

Creates an application in the `created` state.

```ts
const app = new App({
  name: "My API",
  hostname: "127.0.0.1",
  port: 3000,
  maxBodyBytes: 1024 * 1024,
});
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `adapter` | `HttpServerAdapter` | Bun adapter (public `qutivex`) | HTTP runtime bridge. |
| `hostname` | `string` | `"127.0.0.1"` | Interface to bind. |
| `port` | `number` | `3000` | Port; `0` picks an ephemeral port. |
| `name` | `string` | `"Qutivex"` | Shown in the startup banner. |
| `banner` | `boolean` | development mode | Print the startup banner. |
| `development` | `boolean` | `NODE_ENV !== "production"` | Development flag passed to the adapter. |
| `middleware` | `Middleware[]` | `[]` | Global middleware, run in order. |
| `maxBodyBytes` | `number` | `1 MiB` | Maximum request body size. |
| `requestTimeoutMs` | `number` | `0` (disabled) | Request timeout in milliseconds. |
| `logger` | `Logger` | console | Base logger; bound per request. |
| `onError` | `(error, context) => void` | none | Observes request/startup/shutdown errors. |

Invalid ports, names, limits, timeouts, middleware, or logger throw
`ConfigurationError` immediately.

> The core package (`@qutivex/core`) requires an adapter. The public `qutivex`
> package wires in the Bun adapter automatically.

---

## 🛣️ Route methods

```ts
app.get(path, handler);
app.get(path, options, handler);
// Same overloads for post, put, patch, delete, options, head.
```

| Method | Signature |
| --- | --- |
| `app.get` | `(path: string, handler: Handler) => this` |
| `app.post` | `(path: string, options: RouteOptions, handler: Handler) => this` |
| `app.put` | varies by overload |
| `app.patch` | varies by overload |
| `app.delete` | varies by overload |
| `app.options` | varies by overload |
| `app.head` | varies by overload |

### `RouteOptions`

```ts
interface RouteOptions {
  name?: string;
  middleware?: readonly Middleware[];
  metadata?: Readonly<Record<string, unknown>>;
}
```

```ts
app.get("/users/:id", {
  name: "users.show",
  metadata: { auth: true, tags: ["users"] },
  middleware: [rateLimit],
}, (ctx) => ({ id: ctx.params.id }));
```

Rules:

- Paths must start with `/`, with no query/fragment/whitespace.
- Register routes before startup; later registration throws `LifecycleError`.
- Route names are unique and cannot contain whitespace.
- Duplicate or ambiguous route shapes throw `ConfigurationError`.
- **Phase 3 matches parameters and wildcards**; see below.

### Path patterns

| Pattern | Example | Matches |
| --- | --- | --- |
| Static | `/health` | Only `/health` |
| Parameter | `/users/:id` | `/users/42` → `params.id = "42"` |
| Multi-param | `/orgs/:orgId/users/:userId` | Both params |
| Wildcard | `/assets/*` | Any remaining path → `params["*"]` |

- Priority: **static → parameter → wildcard**.
- Parameters decode percent-encoding; malformed encoding returns `400`.
- Trailing slashes are distinct: `/users` ≠ `/users/`.
- Wildcards must be the final segment.
- Regex routes are not supported.

### 405 and HEAD

- A path that exists for another method returns **405 Method Not Allowed** with
  an `Allow` header.
- `GET` implies `HEAD` in `Allow`.
- `HEAD` uses an explicit HEAD route if present, otherwise the GET route with the
  body stripped.
- Unknown paths return the standard `404`.

---

## 👥 Route groups

```ts
const api = app.group("/api", {
  middleware: [auth],
  metadata: { section: "api" },
});

api.get("/users/:id", (ctx) => ({ id: ctx.params.id }));

const admin = api.group("/admin");
admin.get("/stats", () => ({ ok: true }));
```

- Prefixes are joined and normalized.
- Group middleware runs after global middleware and before route middleware.
- Group metadata merges with route metadata (route wins on conflicts).
- `group.use(middleware)` affects only routes registered afterwards.
- Groups support every HTTP method and nested groups.
- `group.path` exposes the full prefix.

---

## 🧠 Handler context

```ts
app.get("/users/:id", (ctx) => ({
  id: ctx.params.id,
  tab: ctx.query.get("tab"),
  agent: ctx.header("user-agent"),
  session: ctx.cookie("session"),
  requestId: ctx.requestId,
}));
```

| Field / method | Type | Description |
| --- | --- | --- |
| `request` | `Request` | Native web request. |
| `url` | `URL` | Parsed URL. |
| `method` | `string` | Uppercase method. |
| `path` | `string` | `url.pathname`. |
| `params` | `Readonly<Record<string,string>>` | Route params. |
| `query` | `URLSearchParams` | Query string. |
| `headers` | `Headers` | Request headers. |
| `header(name)` | `string \| null` | Header shortcut. |
| `cookies` | `Readonly<Record<string,string>>` | Parsed cookies (first wins). |
| `cookie(name)` | `string \| undefined` | Cookie shortcut. |
| `body` | `RequestBody` | Lazy, cached body readers. |
| `signal` | `AbortSignal` | Client abort or request timeout. |
| `requestId` | `string` | Incoming safe ID or generated UUID. |
| `logger` | `Logger` | Bound to this request. |
| `state` | `Map<unknown, unknown>` | Request-scoped metadata. |

### Body readers

```ts
app.post("/json", async (ctx) => ctx.body.json());
app.post("/text", async (ctx) => ctx.body.text());
app.post("/form", async (ctx) => ctx.body.formData());
app.post("/bytes", async (ctx) => ctx.body.arrayBuffer());
```

- The body is read at most once, then cached.
- Every reader enforces `maxBodyBytes`.
- `json()` requires `application/json` or a `+json` content type.
- `formData()` requires `multipart/form-data` or
  `application/x-www-form-urlencoded`.

| Problem | Response |
| --- | --- |
| Wrong/missing JSON content type | `415 UNSUPPORTED_MEDIA_TYPE` |
| Empty/invalid JSON | `400 INVALID_JSON` |
| Body over limit | `413 PAYLOAD_TOO_LARGE` |
| Wrong/invalid form data | `415 UNSUPPORTED_MEDIA_TYPE` / `400 INVALID_FORM_DATA` |

### Response helpers

```ts
ctx.json(value, init?);       // application/json
ctx.text(value, init?);       // text/plain
ctx.html(value, init?);       // text/html
ctx.redirect(location, 303);  // 3xx + Location
ctx.stream(body, init?);      // pass-through stream
ctx.sse(events, init?);       // text/event-stream
ctx.noContent();              // 204
```

### Request state and logger

```ts
const userKey = Symbol("user");

app.use(async (ctx, next) => {
  ctx.state.set(userKey, await loadUser(ctx));
  ctx.logger.info("request", { path: ctx.path });
  return next();
});

app.get("/me", (ctx) => ctx.state.get(userKey));
```

State is isolated per request. The logger adds `requestId`, `method`, and `path`
to every call.

---

## 🧱 Return values

| Value | Response |
| --- | --- |
| `Response` | Passed through unchanged. |
| `string` | `200 text/plain; charset=utf-8`. |
| Object/array/number/boolean/`null` | `200 application/json; charset=utf-8`. |
| `undefined` | `204 No Content`. |
| Thrown `HttpError` | Its status/code; 4xx messages exposed. |
| Any other throw | `500` with a generic, non-leaking body. |

Invalid JSON serialization (circular data, `BigInt`, symbols) becomes a safe
`500`.

---

## 🌊 Middleware

```ts
app.use(async (ctx, next) => {
  const started = performance.now();
  const response = await next();
  response.headers.set("x-response-time-ms", (performance.now() - started).toFixed(2));
  return response;
});
```

- Signature: `(ctx, next) => Response | Promise<Response>`.
- `next()` returns the downstream `Response`.
- Calling `next()` twice is a `500`.
- Returning a non-`Response` is a `500`.
- Short-circuit by returning without calling `next()`.
- Thrown errors use the normal safe error path.
- Order: **global → group → route → before hooks → handler → after hooks**.
- Middleware must be registered before startup.

### Before/after hooks

```ts
app.before((ctx) => {
  // Return a Response to skip the handler.
});

app.after((ctx, response) => {
  // Mutate, or return a replacement Response.
});
```

Hooks are global in Phase 3. Route-level behavior should use middleware.

### Error hooks

```ts
const app = new App({
  onError(error, context) {
    // context.request / context.state
  },
});

app.onError((error, context) => {
  // Additional observer; can also be registered while running.
});
```

Observers never break a response, even if they throw.

---

## ✅ Lifecycle

```text
created ──route──▶ configured ──listen()──▶ starting ──▶ running
                                                    │
                                      stop() ───────┤
                                                    ▼
                                                stopping
                                                    │
                                                    ▼
                                                 stopped
```

A startup failure moves to `failed`.

| Method | Behavior |
| --- | --- |
| `app.state` | Current lifecycle state. |
| `app.name` | App name. |
| `app.url` | Bound URL while running. |
| `app.routes` | Method, path, name, metadata. |
| `app.webSockets` | Registered WebSocket paths. |
| `app.listen(options?)` | Start; resolves with address. |
| `app.run(options?)` | Alias for `listen()`. |
| `app.stop(force?)` | Idempotent graceful shutdown. |
| `app.fetch(request)` | Dispatch without a socket. |
| `app.onShutdown(hook)` | Hooks run last-registered-first. |

- `listen()` while running returns the same address.
- `stop()` while starting waits for startup, then stops.
- A failed shutdown rejects with `ServerShutdownError` and calls error hooks.

---

## ⏱️ Limits, timeouts, and cancellation

```ts
const app = new App({
  maxBodyBytes: 2 * 1024 * 1024,
  requestTimeoutMs: 10_000,
});
```

- `maxBodyBytes` defaults to 1 MiB.
- `requestTimeoutMs` defaults to 0 (disabled).
- Timeout returns `504 REQUEST_TIMEOUT` and aborts `ctx.signal`.
- Client disconnect aborts `ctx.signal`.
- The handler is not forcibly terminated by JavaScript; it should observe the
  signal and stop work.

---

## 🔌 WebSockets

```ts
app.websocket("/ws/:room", {
  open(socket, ctx) {
    socket.send(`joined ${ctx.params.room}`);
  },
  message(socket, message, ctx) {
    socket.send(`${ctx.params.room}:${message}`);
  },
  close(socket, code, reason) {
    // cleanup
  },
  drain(socket) {
    // backpressure resumed
  },
});
```

- Uses the same path-pattern rules as HTTP routes.
- Context includes `request`, `url`, `params`, `query`, `headers`, `cookies`,
  `requestId`, `logger`, and `state`.
- `socket.send`, `socket.close`, and `socket.remoteAddress` are available.
- A handler failure calls error hooks and closes with code `1011`.
- A normal HTTP request to a WebSocket path returns `426 Upgrade Required`.
- WebSocket routes are registered before startup.
- Middleware/groups for WebSockets are not part of Phase 3.

---

## 🔎 Introspection

```ts
app.routes;
// [{ method: "GET", path: "/users/:id", name: "users.show", metadata: {...} }]

app.webSockets;
// [{ path: "/ws/:room" }]
```

`routes` returns a copy; mutating it does not affect the router.

---

## 🧱 Adapter boundary

```ts
import { App, type HttpServerAdapter } from "@qutivex/core";

const fakeAdapter: HttpServerAdapter = {
  async start({ hostname, port }) {
    return {
      hostname,
      port,
      url: new URL(`http://${hostname}:${port}`),
      stop: async () => {},
    };
  },
};

const app = new App({ adapter: fakeAdapter });
```

The core never imports `Bun.*`; the Bun adapter owns the runtime details.

---

## 🧪 Complete example

```ts
import { App, HttpError } from "qutivex";

const app = new App({ name: "Notes API", requestTimeoutMs: 10_000 });

app.use(async (_ctx, next) => {
  const started = performance.now();
  const response = await next();
  response.headers.set("x-response-time-ms", (performance.now() - started).toFixed(2));
  return response;
});

app.get("/notes/:id", (ctx) => ({ id: ctx.params.id }));
app.post("/notes", async (ctx) => ({ note: await ctx.body.json() }));
app.get("/admin", () => {
  throw HttpError.forbidden("Admins only");
});
app.get("/events", (ctx) => ctx.sse([{ event: "ready", data: { ok: true } }]));

await app.run({ port: 3000 });
```

---

## 📌 Phase 3 limitations

- No validation, typed params, OpenAPI, or response schemas (Phase 4).
- No CLI/generator/settings/TOML/dev server (Phase 5).
- No DI, plugins, or test client (Phase 6).
- No database, auth, sessions, roles, CSRF, CORS, or rate limits (Phases 7–8).
- No WebSocket middleware/groups.
- No compression policy yet.
- Request timeouts cannot forcibly stop a handler that ignores the signal.
- The route matcher is custom and pending benchmark comparison with Bun native
  routing (see [ADR 0003](../decisions/0003-route-matching.md)).
