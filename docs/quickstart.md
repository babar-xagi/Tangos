# 🚀 Quickstart

Get a Qutivex app running in about **five minutes**.

> **You are here:** Phase 3. Routing, middleware, the request context, body
> parsing, streaming/SSE, and WebSockets work. Validation/OpenAPI, the CLI,
> database, auth, admin, and AI arrive in later phases.

---

## 0️⃣ What you need

| Requirement | Version |
| --- | --- |
| Bun | **1.4.4** |
| TypeScript | installed by `bun install` (**7.0.2**) |
| Git | any recent version |
| Node.js | ❌ not required |

```sh
bun --version
# 1.4.4
```

---

## 1️⃣ Install and run

```sh
cd qutivex
bun install --frozen-lockfile
bun run example
```

You should see:

```text
  Qutivex Hello
  ➜  http://127.0.0.1:3000/
  6 routes | 4ms
```

### Try the example

```sh
curl http://127.0.0.1:3000/
curl "http://127.0.0.1:3000/hello/Ada?greeting=Welcome"
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/api/version
curl http://127.0.0.1:3000/events

curl -X POST http://127.0.0.1:3000/echo \
  -H 'content-type: application/json' \
  -d '{"message":"ping"}'
```

| Route | Shows |
| --- | --- |
| `GET /` | JSON + a middleware timing header |
| `GET /hello/:name` | Path params + query params |
| `POST /echo` | Lazy JSON body parsing |
| `GET /api/version` | Route groups |
| `GET /events` | Server-Sent Events |
| `GET /health` | A health check |

Stop with `Ctrl+C`.

---

## 2️⃣ Your first app

Create `my-app.ts`:

```ts
import { App } from "qutivex";

const app = new App({ name: "My API" });

app.get("/", () => ({ message: "Hello, Qutivex! 👋" }));
app.get("/health", () => ({ status: "ok" }));

await app.run({ port: 3000 });
```

Run it:

```sh
bun run my-app.ts
```

No decorators, no config file, no boilerplate.

---

## 3️⃣ Path params and query strings

```ts
app.get("/users/:id", (ctx) => ({
  id: ctx.params.id,
  tab: ctx.query.get("tab") ?? "profile",
}));
```

```sh
curl "http://127.0.0.1:3000/users/42?tab=settings"
# {"id":"42","tab":"settings"}
```

Wildcards capture the rest of the path:

```ts
app.get("/assets/*", (ctx) => ({
  path: ctx.params["*"],
}));
```

Priority is **static → param → wildcard**:

```ts
app.get("/users/me", () => "static");
app.get("/users/:id", (ctx) => `param:${ctx.params.id}`);
app.get("/users/*", (ctx) => `wildcard:${ctx.params["*"]}`);
```

Wrong method on a known path returns **405** with an `Allow` header. Trailing
slashes are distinct.

---

## 4️⃣ Read headers and cookies

```ts
app.get("/whoami", (ctx) => ({
  userAgent: ctx.header("user-agent"),
  session: ctx.cookie("session"),
  allCookies: ctx.cookies,
  requestId: ctx.requestId,
}));
```

`x-request-id` is reused when safe, otherwise generated. Every response includes
one.

---

## 5️⃣ Parse a body

Body parsing is **lazy** and **cached**. The default limit is **1 MiB**.

```ts
app.post("/echo", async (ctx) => ({
  body: await ctx.body.json(),
}));
```

```sh
curl -X POST http://127.0.0.1:3000/echo \
  -H 'content-type: application/json' \
  -d '{"message":"ping"}'
```

Other readers:

```ts
await ctx.body.text();
await ctx.body.formData();
await ctx.body.arrayBuffer();
```

Errors are precise:

| Problem | Status |
| --- | ---: |
| Wrong/missing JSON content type | `415` |
| Empty or invalid JSON | `400` |
| Body over the limit | `413` |
| Wrong/invalid form data | `415` / `400` |

Change the limit when creating the app:

```ts
const app = new App({ maxBodyBytes: 2 * 1024 * 1024 });
```

---

## 6️⃣ Add middleware

```ts
app.use(async (ctx, next) => {
  const started = performance.now();
  const response = await next();
  response.headers.set("x-response-time-ms", (performance.now() - started).toFixed(2));
  return response;
});
```

Rules:

- Global middleware runs in registration order.
- Call `next()` once. Calling it twice is a `500`.
- Return a `Response` to short-circuit (auth, caching, etc.).
- Middleware must return a `Response`.
- Errors thrown in middleware use the same safe error handling.

Group middleware:

```ts
const api = app.group("/api", {
  middleware: [auth],
  metadata: { section: "api" },
});

api.get("/users/:id", {
  name: "api.users.show",
  middleware: [rateLimit],
}, (ctx) => ({ id: ctx.params.id }));
```

Order: **global → group → route → before hooks → handler → after hooks**.

---

## 7️⃣ Hooks

```ts
app.before((ctx) => {
  // Runs before the handler. Return a Response to short-circuit.
});

app.after((ctx, response) => {
  response.headers.set("x-powered-by", "Qutivex");
  // Return a replacement Response if needed.
});
```

Error observers:

```ts
app.onError((error, context) => {
  // context.request and context.state when available.
});
```

---

## 8️⃣ Stream, SSE, and WebSockets

### Streamed response

```ts
app.get("/stream", (ctx) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode("hello "));
      controller.enqueue(encoder.encode("world"));
      controller.close();
    },
  });
  return ctx.stream(stream, { headers: { "content-type": "text/plain" } });
});
```

### Server-Sent Events

```ts
app.get("/events", (ctx) =>
  ctx.sse([
    { event: "hello", data: { message: "Qutivex SSE" } },
    { event: "done", data: "bye" },
  ]),
);
```

### WebSockets

```ts
app.websocket("/ws/:room", {
  open(socket, ctx) {
    socket.send(`joined ${ctx.params.room}`);
  },
  message(socket, message) {
    socket.send(message);
  },
  close(socket, code, reason) {
    // cleanup
  },
});
```

Normal HTTP requests to a WebSocket path receive `426 Upgrade Required`.

---

## 9️⃣ Cancellation and timeouts

`ctx.signal` aborts when the client disconnects. Add a request timeout if you
need one:

```ts
const app = new App({ requestTimeoutMs: 10_000 });

app.get("/slow", async (ctx) => {
  await doWork(ctx.signal);
  return { done: true };
});
```

A timed-out request returns `504 REQUEST_TIMEOUT` and aborts the signal.

---

## 🔟 Response helpers

```ts
app.get("/json", (ctx) => ctx.json({ ok: true }, { status: 201 }));
app.get("/text", (ctx) => ctx.text("hello"));
app.get("/html", (ctx) => ctx.html("<h1>Hello</h1>"));
app.get("/go", (ctx) => ctx.redirect("/login", 303));
app.get("/empty", (ctx) => ctx.noContent());
```

---

## 1️⃣1️⃣ Test without a socket

```ts
import { expect, test } from "bun:test";
import { App } from "qutivex";

test("user route", async () => {
  const app = new App();
  app.get("/users/:id", (ctx) => ({ id: ctx.params.id }));

  const response = await app.fetch(new Request("http://localhost/users/42"));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: "42" });
});
```

`app.fetch()` uses the same routing, middleware, body, and error behavior as the
live server.

---

## 1️⃣2️⃣ Next steps

- Read the full [App API](api/app.md).
- Learn the [error model](api/errors.md).
- See the [Phase 3 checklist](phase-3-checklist.md).
- Check the [roadmap](../ROADMAP.md) for what is coming.
- Run the quality gate: `bun run validate`.

---

## 🆘 Common problems

### `bun: command not found`

```sh
curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.4"
```

### Port 3000 is busy

```sh
PORT=8080 bun run example
```

The example binds `127.0.0.1` by default.

### Biome cannot find its native binary

A Windows `node_modules` tree is being used from WSL (or the reverse). Reinstall:

```sh
rm -rf node_modules
bun install --frozen-lockfile
```

### A route returns 405

The path exists but not for that method. Check the `Allow` response header.

### A body returns 413

The request exceeded `maxBodyBytes` (default 1 MiB). Raise the limit deliberately
or send less data.

### Type errors in the editor

```sh
bun run typecheck
```

The repo pins TypeScript 7.0.2; make sure your editor uses the workspace version.
