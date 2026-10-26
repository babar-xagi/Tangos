# ⚡ Qutivex

> **A Bun-first, TypeScript-native framework for APIs, full-stack applications,
> and production AI systems.**

![Bun](https://img.shields.io/badge/Bun-1.4.4-000000?logo=bun)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

**Status:** 🟢 **Phase 3 complete** — routing, middleware, request context,
body parsing, streaming/SSE, and WebSockets work.
**Next:** 🚧 Phase 4 — validation, type inference, and OpenAPI.

[Roadmap](ROADMAP.md) · [Vision](VISION.md) · [Quickstart](docs/quickstart.md) ·
[API reference](docs/api/app.md) · [Docs index](docs/README.md)

---

## ✨ What is Qutivex?

Qutivex is a framework for people who like **FastAPI's clarity**, **Django's
batteries**, and **Bun's speed**—without assembling a dozen libraries for every
project.

- 🧱 **Small core** — no ORM, admin, AI, or frontend code in a minimal API.
- 🧠 **One source of truth** — schemas will drive validation and docs.
- 🚀 **Measured speed** — Bun-native HTTP, benchmarks before claims.
- 🛡️ **Safe defaults** — redacted errors, bounded bodies, secure lifecycle.
- 🧩 **Progressive** — start with one route; add modules when you need them.

> Qutivex is pre-alpha (`0.0.0`). It is **not production-ready**. The docs are
> honest about what works and what does not.

---

## ✅ What works today

| Feature | Status |
| --- | :---: |
| `new App()` with Bun adapter wired in | ✅ |
| GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD | ✅ |
| Path params (`/users/:id`), wildcards (`/assets/*`) | ✅ |
| Static → param → wildcard route priority | ✅ |
| Route groups, prefixes, names, metadata | ✅ |
| Query, headers, cookies, params | ✅ |
| Lazy JSON, text, form-data, array-buffer bodies | ✅ |
| Body limits (default 1 MiB) + content-type checks | ✅ |
| Global, group, and route middleware | ✅ |
| Before/after hooks, error hooks, 405 + `Allow` | ✅ |
| Request IDs, request logger, request state | ✅ |
| Client-abort signal + optional request timeouts | ✅ |
| Streaming responses + Server-Sent Events | ✅ |
| WebSocket routes with params and close/error handling | ✅ |
| Lifecycle, graceful shutdown, safe errors | ✅ |
| 179 tests, 99.6% line coverage, Linux + Windows CI | ✅ |
| Validation/OpenAPI, CLI, DB, auth, admin, AI | 🚧 later phases |

See the [Phase 3 checklist](docs/phase-3-checklist.md) for scope and evidence.

---

## 🚀 Quick start

### 1. Check Bun

```sh
bun --version
# 1.4.4
```

If needed:

```sh
curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.4"
```

> 💡 On WSL, run `bun upgrade` if it still reports `1.4.2`.

### 2. Install and run

```sh
cd qutivex
bun install --frozen-lockfile
bun run example
```

```text
  Qutivex Hello
  ➜  http://127.0.0.1:3000/
  6 routes | 4ms
```

```sh
curl http://127.0.0.1:3000/
curl http://127.0.0.1:3000/hello/Ada?greeting=Welcome
curl -X POST http://127.0.0.1:3000/echo \
  -H 'content-type: application/json' \
  -d '{"message":"ping"}'
```

Press `Ctrl+C` to stop.

---

## 🧑‍💻 Hello, Qutivex

```ts
import { App, HttpError } from "qutivex";

const app = new App({ name: "My API" });

// Path params + query params
app.get("/hello/:name", (ctx) => ({
  greeting: `${ctx.query.get("greeting") ?? "Hello"}, ${ctx.params.name}! 👋`,
}));

// Lazy JSON body parsing
app.post("/echo", async (ctx) => ({
  body: await ctx.body.json(),
}));

// Middleware
app.use(async (_ctx, next) => {
  const started = performance.now();
  const response = await next();
  response.headers.set("x-response-time-ms", (performance.now() - started).toFixed(2));
  return response;
});

// Expected errors
app.get("/private", () => {
  throw HttpError.unauthorized("Sign in first");
});

await app.run({ port: 3000 });
```

Run it with `bun run your-file.ts`.

> 🏗️ There is no `qutivex create` yet; it arrives in Phase 5. Until then, copy
> [`examples/hello`](examples/hello) or start from the snippet above.

---

## 🧠 The mental model

1. **Create an app** — `const app = new App()`.
2. **Register routes before startup** — `app.get(path, handler)`.
3. **Read the request** — `ctx.params`, `ctx.query`, `ctx.body`, `ctx.headers`.
4. **Return data, not boilerplate** — objects become JSON, strings become text,
   `undefined` becomes `204`.
5. **Throw `HttpError` for expected failures** — everything else becomes a safe
   `500`.
6. **Compose with middleware** — `app.use((ctx, next) => ...)`.
7. **Stop cleanly** — `await app.stop()` runs shutdown hooks.

### Handler return values

```ts
app.get("/json", () => ({ ok: true }));            // 200 application/json
app.get("/text", () => "hello");                   // 200 text/plain
app.get("/custom", () => new Response("hi"));      // passed through
app.get("/empty", () => undefined);                // 204 No Content
```

### Error shape

```json
{ "error": { "code": "NOT_FOUND", "message": "Not Found" } }
```

Internal errors never expose stack traces or private messages.

---

## 🛣️ Routing at a glance

```ts
app.get("/users/me", () => "static wins");
app.get("/users/:id", (ctx) => ({ id: ctx.params.id }));
app.get("/assets/*", (ctx) => ({ rest: ctx.params["*"] }));

const api = app.group("/api", {
  middleware: [auth],
  metadata: { section: "api" },
});

api.get("/users/:id", {
  name: "api.users.show",
  metadata: { auth: true },
  middleware: [rateLimit],
}, (ctx) => ({ id: ctx.params.id }));
```

- Priority: **static → param → wildcard**.
- Trailing slashes are distinct.
- Wrong method on a known path → **405** with `Allow`.
- Duplicate/ambiguous route → startup error.
- Route names are unique; metadata is available via `app.routes`.

---

## 🧰 Middleware, hooks, and context

```ts
app.use(async (ctx, next) => {
  ctx.logger.info("request", { path: ctx.path });
  const response = await next();
  response.headers.set("x-request-id", ctx.requestId);
  return response;
});

app.before((ctx) => {
  // Runs after middleware, before the handler.
});

app.after((ctx, response) => {
  // Runs after the handler; may return a replacement Response.
});
```

Context highlights:

| Field / method | Purpose |
| --- | --- |
| `ctx.params` | `Record<string, string>` from the route |
| `ctx.query` | `URLSearchParams` |
| `ctx.headers` / `ctx.header(name)` | Request headers |
| `ctx.cookies` / `ctx.cookie(name)` | Parsed cookies |
| `ctx.body.json()`, `.text()`, `.formData()`, `.arrayBuffer()` | Lazy, cached, size-limited |
| `ctx.signal` | Aborts on client disconnect or request timeout |
| `ctx.requestId`, `ctx.logger`, `ctx.state` | Observability + request metadata |
| `ctx.json()`, `.text()`, `.html()`, `.redirect()`, `.stream()`, `.sse()` | Response helpers |

---

## 🌊 Streaming, SSE, and WebSockets

```ts
// Server-Sent Events
app.get("/events", (ctx) =>
  ctx.sse([
    { event: "hello", data: { message: "Qutivex SSE" } },
  ]),
);

// WebSockets
app.websocket("/ws/:room", {
  open(socket, ctx) {
    socket.send(`joined ${ctx.params.room}`);
  },
  message(socket, message) {
    socket.send(message);
  },
});
```

---

## 📚 Documentation map

| Start here | What you get |
| --- | --- |
| 🚀 [Quickstart](docs/quickstart.md) | Install → run → params → body → middleware |
| 🧩 [App API](docs/api/app.md) | Routes, context, middleware, WS, lifecycle |
| 💥 [Errors](docs/api/errors.md) | `HttpError`, status codes, safe responses |
| 🧠 [Architecture](ARCHITECTURE.md) | Package graph, request flow, design |
| 🌟 [Vision](VISION.md) | Product thesis, non-goals, success |
| 🗺️ [Roadmap](ROADMAP.md) | All phases and releases |
| 🆚 [Competitive matrix](docs/competitive-matrix.md) | Honest ecosystem comparison |
| 🏗️ [Reference apps](docs/reference-apps.md) | The three apps every phase targets |
| 🧪 [Testing](docs/testing.md) | Layers, coverage, conventions |
| 🛠️ [Development](docs/development.md) | Setup, commands, Windows/WSL |
| 🛟 [Support policy](docs/support-policy.md) | Versions, OS support, guarantees |
| 📦 [Release process](docs/release-process.md) | Manual SemVer and publishing |

Phase records: [0](docs/phase-0-checklist.md) · [1](docs/phase-1-checklist.md) ·
[2](docs/phase-2-checklist.md) · [3](docs/phase-3-checklist.md)

---

## 🛠️ Commands

| Command | What it does |
| --- | --- |
| `bun install` | Install workspace dependencies |
| `bun run validate` | 🚦 Full gate: build, quality, types, tests, smoke |
| `bun run example` | Run the Phase 3 example server |
| `bun run quality` | Format, lint, import-order check (CI gate) |
| `bun run fix` | Apply formatting, lint fixes, import sorting |
| `bun run typecheck` | Type-check with TypeScript 7 |
| `bun test` | Run all unit and integration tests |
| `bun run test:coverage` | Tests + 90% gate + LCOV |
| `bun run build` | Bundle packages into `packages/*/dist` |
| `bun run smoke` | Real-socket smoke test of the example |
| `bun run bench` | Native Bun + Qutivex benchmark harness |
| `bun run clean` | Remove build and coverage output |

---

## 🧪 Quality gate

`bun run validate` runs:

1. 📦 Build every package with Bun.
2. 🎨 Biome format, lint, and import ordering.
3. 🧠 TypeScript 7 type-check.
4. 🧪 **179 tests**, 99.6% line coverage, 90% threshold.
5. 🔌 Real-socket smoke test of the example.

CI runs the same gate on **Ubuntu** and **Windows** with the pinned Bun version.

---

## 🗂️ Repository layout

```text
qutivex/
  packages/
    core/        # App, context, middleware, body, errors, SSE, WebSockets
    router/      # Pattern compilation, matching, specificity, group prefixes
    http-bun/    # Bun.serve adapter + WebSocket bridge
    qutivex/     # Public umbrella: App with Bun adapter wired in
  examples/hello # Working Phase 3 app
  tests/         # unit, integration, type-level
  benchmarks/    # Baseline vs Qutivex harness
  docs/          # Guides, API reference, phase records, decisions
  RFC/           # Accepted design proposals
```

Core cannot import adapters or optional modules and contains no `Bun.*` calls;
a boundary test enforces it.

---

## 🤝 Contributing

- Read [CONTRIBUTING.md](CONTRIBUTING.md).
- Use **Bun 1.4.4** and **TypeScript 7.0.2**.
- Run `bun run validate` before opening a pull request.
- Security issues: follow [SECURITY.md](SECURITY.md); no public issues.
- Design changes need an [RFC](RFC/README.md) or an [ADR](docs/decisions/README.md).

---

## 📄 License

[MIT](LICENSE) — decided in [ADR 0002](docs/decisions/0002-product-scope.md).

---

<p align="center">
  <strong>Build APIs that are easy to start, safe to operate, and fast enough to
  compete.</strong><br />
  ⚡ Bun · 🟦 TypeScript · 🧠 AI-native · 🛡️ secure by default
</p>
