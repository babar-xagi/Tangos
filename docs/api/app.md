# 🧩 App API reference

The `App` object is the center of every Qutivex application. This page covers
**Phase 2** exactly—no future APIs are presented as available.

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
});
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `adapter` | `HttpServerAdapter` | Bun adapter (public `qutivex` package) | HTTP runtime bridge. |
| `hostname` | `string` | `"127.0.0.1"` | Interface to bind. |
| `port` | `number` | `3000` | Port; `0` picks an ephemeral port. |
| `name` | `string` | `"Qutivex"` | Shown in the startup banner. |
| `banner` | `boolean` | development mode | Print the startup banner. |
| `development` | `boolean` | `NODE_ENV !== "production"` | Development flag passed to the adapter. |
| `onError` | `(error, context) => void` | none | Observes request/startup/shutdown errors. |

Invalid ports, empty hostnames, and empty names throw `ConfigurationError`
immediately.

> The core package (`@qutivex/core`) requires an adapter. The public `qutivex`
> package wires in the Bun adapter automatically.

---

## 🛣️ Route methods

| Method | Signature |
| --- | --- |
| `app.get` | `(path: string, handler: Handler) => this` |
| `app.post` | `(path: string, handler: Handler) => this` |
| `app.put` | `(path: string, handler: Handler) => this` |
| `app.patch` | `(path: string, handler: Handler) => this` |
| `app.delete` | `(path: string, handler: Handler) => this` |
| `app.options` | `(path: string, handler: Handler) => this` |
| `app.head` | `(path: string, handler: Handler) => this` |

```ts
app
  .get("/", () => ({ message: "Hello!" }))
  .post("/users", () => ({ created: true }))
  .delete("/users", () => undefined);
```

Rules:

- Paths must start with `/`, contain no query/fragment/whitespace.
- Routes must be registered before startup.
- Registering after startup throws `LifecycleError`.
- Duplicate method + path throws `ConfigurationError`.
- **Phase 2 uses exact path matching.** `/users/:id` is not implemented yet.

---

## 🧠 Handler context

```ts
app.get("/whoami", (ctx) => ({
  method: ctx.method,
  path: ctx.path,
  url: ctx.url.href,
  hasRequest: ctx.request instanceof Request,
}));
```

| Field | Type | Description |
| --- | --- | --- |
| `request` | `Request` | Native web request. |
| `url` | `URL` | Parsed request URL. |
| `method` | `string` | Uppercase HTTP method. |
| `path` | `string` | `url.pathname`. |

Handlers may be synchronous or asynchronous.

```ts
app.get("/async", async () => {
  const data = await loadSomething();
  return { data };
});
```

---

## ↩️ Return values

| Value | Response |
| --- | --- |
| `Response` | Passed through unchanged (status, headers, body). |
| `string` | `200 text/plain; charset=utf-8`. |
| Object, array, number, boolean, `null` | `200 application/json; charset=utf-8`. |
| `undefined` | `204 No Content` with no body. |
| Thrown `HttpError` | Its status/code; message exposed for 4xx. |
| Any other throw | `500` with a generic, non-leaking body. |

```ts
app.get("/json", () => ({ ok: true }));
app.get("/text", () => "hello");
app.get("/created", () => new Response("created", { status: 201 }));
app.get("/empty", () => undefined);
```

Invalid JSON serialization (circular data, `BigInt`, symbols) produces a safe
`500`.

### HEAD behavior

- An explicit `app.head(path, handler)` wins.
- Otherwise Qutivex runs the `GET` handler and strips the body.
- If neither exists, the standard `404` is returned without a body.

```ts
app.get("/report", () => ({ rows: 3 }));
// HEAD /report → 200, headers from GET, no body
```

---

## 📡 Request lifecycle

```text
created ──first route──▶ configured ──listen()──▶ starting
                                                    │
                                                    ▼
                                                 running
                                                    │
                                    stop() ─────────┤
                                                    ▼
                                                stopping
                                                    │
                                                    ▼
                                                 stopped
```

A startup failure moves to `failed`. `app.state` always reflects the current
state.

| State | Meaning |
| --- | --- |
| `created` | Constructed, no routes yet. |
| `configured` | At least one route is registered. |
| `starting` | Adapter is starting the server. |
| `running` | Server accepts requests. |
| `stopping` | Shutdown in progress. |
| `stopped` | Terminal state; cannot restart. |
| `failed` | Startup or shutdown failure. |

---

## ▶️ `await app.listen(options?)`

Starts the server and resolves with its address.

```ts
const info = await app.listen({ port: 0 });

info.hostname; // "127.0.0.1"
info.port;     // actual port
info.url;      // URL
```

- `options.hostname` and `options.port` override constructor values.
- Calling `listen()` while running returns the same info.
- Calling `listen()` while starting shares the in-flight start.
- Calling `listen()` after stop/failed throws `LifecycleError`.
- Missing adapter throws `ConfigurationError`.

### ▶️ `app.run(options?)`

An **alias** for `listen()`. Use whichever reads better:

```ts
await app.run();                 // common
const info = await app.listen(); // explicit
```

Neither installs process signal handlers. The CLI/dev server owns signals in
Phase 5.

---

## ⏹️ `await app.stop(force?)`

Stops accepting connections, runs shutdown hooks, and resolves when done.

```ts
await app.stop();      // graceful
await app.stop(true);  // force-close active connections
```

Guarantees:

- Idempotent: repeated calls resolve without re-running hooks.
- Concurrent calls share the same shutdown.
- Hooks run **last-registered-first**.
- Hooks run even if startup failed (after a stop request).
- A hook or server-stop failure calls `onError` and rejects with
  `ServerShutdownError`.
- After `stop()`, `listen()` is rejected.

---

## 🪝 `onShutdown(hook)`

```ts
app.onShutdown(async () => {
  await mailer.close();
});

app.onShutdown(() => {
  cache.clear();
});
```

- Hooks may be sync or async.
- Registration is rejected once the app is stopping/stopped/failed.
- Hook order: reverse registration order.
- A throwing hook does not prevent later hooks from running; failures are
  reported together.

---

## 🔌 `await app.fetch(request)`

Dispatches a request without binding a socket. Uses the same routes, response
normalization, and error handling.

```ts
const response = await app.fetch(new Request("http://localhost/health"));
```

Useful for unit tests and the future test client. It works before or after
`listen()` and does not change lifecycle state.

---

## 🔎 Read-only introspection

```ts
app.name;   // string
app.state;  // AppState
app.url;    // URL | undefined
app.routes; // readonly { method, path }[]
```

`routes` returns a copy; mutating it does not affect the router.

---

## 🧱 Adapter boundary

For tests or alternate runtimes, pass an adapter to the core `App`:

```ts
import { App, type HttpServerAdapter } from "@qutivex/core";

const fakeAdapter: HttpServerAdapter = {
  async start({ hostname, port, fetch }) {
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

The public `qutivex` package defaults to `BunHttpAdapter`.

---

## 🧪 Complete example

```ts
import { App, HttpError } from "qutivex";

const app = new App({ name: "Notes API" });

app.get("/", () => ({ name: "Notes API", status: "ok" }));
app.get("/health", () => ({ status: "ok" }));

app.post("/notes", () => {
  // Phase 2 has no body parsing; validation/body access arrive in Phase 4.
  return new Response(null, { status: 201 });
});

app.get("/admin", () => {
  throw HttpError.forbidden("Admins only");
});

app.onShutdown(() => {
  console.log("bye 👋");
});

await app.run({ port: 3000 });
```

---

## 📌 Phase 2 limitations

- Exact route paths only; no params, wildcards, groups, or middleware.
- No body parsing, query helper, cookies helper, or typed params.
- No 405 response; unmatched paths are `404`.
- No streaming helpers, WebSockets, or SSE.
- No request ID, logger, or timeout context.
- No automatic signal handling.
- No route-level options (validation, metadata).

These are planned, not forgotten. See [ROADMAP.md](../../ROADMAP.md) and
[RFC 0002](../../RFC/0002-routing.md).
