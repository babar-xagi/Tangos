# 🏛️ Qutivex architecture — Phase 3

> **Scope:** implementation architecture as of Phase 3. Product scope and public
> API commitments live in [RFC 0001](RFC/0001-public-api.md) and
> [VISION.md](VISION.md).

**Status:** 🟢 Phases 0–3 complete · 🚧 Phase 4 next

---

## 🎯 Design constraints

| Constraint | Consequence |
| --- | --- |
| **Bun-first** | `Bun.serve()` is the only HTTP engine. |
| **Small core** | Core has one first-party dependency (`@qutivex/router`), no third-party runtime dependencies, and no `Bun.*` calls. |
| **Opt-in modules** | A minimal API does not load database, admin, AI, or frontend code. |
| **Explicit behavior** | Body parsing is lazy and opt-in; serialization is predictable. |
| **Safe errors** | One envelope; no internal messages, stacks, or causes in responses. |
| **Adapter boundary** | Runtime details sit behind `HttpServerAdapter`. |
| **Measured performance** | A harness exists; no performance claims are published. |

---

## 🧱 Package graph

```text
                  ┌─────────────────────────┐
                  │         qutivex         │  public umbrella
                  │  App + Bun adapter      │
                  └───────────┬─────────────┘
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
     ┌─────────────────┐              ┌──────────────────┐
     │ @qutivex/http-bun│─────────────▶│   @qutivex/core  │
     │ Bun.serve + WS   │              │ App, context,    │
     └─────────────────┘              │ middleware, SSE  │
                                      └────────┬─────────┘
                                               │
                                      ┌────────▼─────────┐
                                      │ @qutivex/router  │
                                      │ patterns, match  │
                                      └──────────────────┘
```

| Package | Responsibility | Runtime deps |
| --- | --- | --- |
| `@qutivex/router` | Path compilation, matching, specificity, conflict keys, group joins | **none** |
| `@qutivex/core` | App lifecycle, routing table, context, middleware, bodies, errors, SSE, WebSocket registry | `@qutivex/router` |
| `@qutivex/http-bun` | `Bun.serve()` adapter, WebSocket bridge, startup errors | `@qutivex/core` |
| `qutivex` | Public import; Bun adapter wired in; core contracts re-exported | `core`, `http-bun` |

Core has **no third-party runtime dependencies** and no Bun APIs. Boundaries are
enforced by
[`tests/integration/workspace-boundaries.test.ts`](tests/integration/workspace-boundaries.test.ts).

---

## 🔁 HTTP request flow

```text
Bun.serve fetch
      │
      ▼
WebSocket route? ── yes ──▶ server.upgrade(data = handlers + context)
      │ no                        │
      ▼                           ▼
App.fetch(request)          WS open/message/close/drain
      │
      ├─ request ID, URL, method
      ├─ route method (HEAD → GET fallback)
      ├─ RouteTable.match
      │     ├─ miss + other methods → 405 + Allow
      │     └─ miss → 404 envelope
      ├─ AbortController (client abort + timeout)
      ├─ RequestContext (params, query, cookies, body, logger, state)
      ├─ middleware chain (global → group → route)
      ├─ before hooks
      ├─ handler → normalize result
      ├─ after hooks
      ├─ timeout race (optional)
      └─ finalize: x-request-id + HEAD body stripping
```

Exceptions anywhere in the chain are normalized into the standard error
envelope. Error observers never break the response.

---

## 🛣️ Routing

`@qutivex/router` compiles paths into segments:

```ts
type RouteSegment =
  | { kind: "static"; value: string }
  | { kind: "param"; name: string }
  | { kind: "wildcard" };
```

Matching:

- Exact static routes use a method → path map.
- Parameterized/wildcard routes use a sorted list.
- Priority: static > param > wildcard, left to right.
- `HEAD` falls back to `GET` when no HEAD route matches.
- 405 is returned when the path matches another method; `Allow` includes implicit
  HEAD for GET.
- Malformed percent-encoding becomes `400 INVALID_PATH_ENCODING`.
- Duplicate/ambiguous shapes and duplicate names fail at startup.

`RouteTable` stores handler, method, path, name, metadata, and route middleware.
Groups merge their prefix, middleware, and metadata into route options.

Implementation decision and benchmarks pending:
[ADR 0003](docs/decisions/0003-route-matching.md).

---

## 🧠 Request context

Created per request:

| Concern | Implementation |
| --- | --- |
| Request data | `Request`, `URL`, method, path |
| Params | Router match result |
| Query | `url.searchParams` |
| Headers | Native `Headers` |
| Cookies | Parsed once; first name wins |
| Body | Lazy `RequestBody` with one cached byte buffer |
| Limits | `maxBodyBytes` (default 1 MiB) |
| Content types | JSON/`+json`, multipart, URL-encoded enforcement |
| Request ID | Safe incoming `x-request-id` or UUID |
| Logger | Bound with request ID, method, path |
| State | Per-request `Map` |
| Signal | `AbortController` fed by client abort + timeout |

The context also exposes response helpers (`json`, `text`, `html`, `redirect`,
`stream`, `sse`, `noContent`).

---

## 🧱 Middleware and hooks

```text
global middleware → group middleware → route middleware
  → before hooks → handler → after hooks → response
```

- Middleware signature: `(ctx, next) => Response | Promise<Response>`.
- `next()` may be called once; a second call is a `500`.
- Short-circuit by returning without `next()`.
- Middleware must return a `Response`.
- Errors use the same safe path as handlers.
- Before hooks can short-circuit; after hooks can replace the response.
- Error hooks are observers and cannot break responses.
- Configuration is frozen at startup (routes, middleware, hooks, WebSockets).

---

## 🌐 HTTP capabilities

| Capability | Status |
| --- | --- |
| Body limits | `maxBodyBytes`, header- and stream-enforced |
| Content types | JSON/`+json`, form types, 415 on mismatch |
| Streaming | `Response`/`ctx.stream` pass-through |
| SSE | `ctx.sse` with sync/async sources, `text/event-stream` |
| WebSockets | Bun adapter upgrade, handlers, params, close/error |
| Timeouts | `requestTimeoutMs`, 504 + aborted signal |
| Cancellation | Client abort propagates to `ctx.signal` |
| Compression | Deferred until adapter choice + measurement |

---

## 🔌 WebSockets

Core owns a `WebSocketTable` using the same path patterns as HTTP. The Bun
adapter receives a `matchWebSocket(request)` callback:

1. Match a WS route and build a `WebSocketContext`.
2. Call `server.upgrade(request, { data: match })`.
3. Dispatch Bun WebSocket events to application handlers.
4. Catch handler failures, call error hooks, close with `1011`.
5. Return `426 Upgrade Required` if an HTTP request hits a WS path.

No WebSocket groups/middleware yet. Message limits use Bun defaults.

---

## 💥 Errors and responses

```text
QutivexError (code, status, expose, cause)
├── HttpError          → intentional 4xx/5xx
├── ConfigurationError → invalid setup
├── LifecycleError     → invalid state transition
├── ServerStartError   → adapter startup failure
└── ServerShutdownError→ stop/hook failure
```

Client envelope:

```json
{ "error": { "code": "NOT_FOUND", "message": "Not Found" } }
```

Response normalization:

- `Response` unchanged.
- `string` → text/plain.
- JSON value → application/json.
- `undefined` → 204.
- Failures → safe error envelope.
- HEAD → status/headers, no body.

---

## 🔄 Lifecycle

```text
created ──route──▶ configured ──listen()──▶ starting ──▶ running
                                                    │
                                      stop() ───────┤
                                                    ▼
                                                stopping ──▶ stopped
```

- Routes/middleware/hooks freeze once startup begins.
- `stop()` is idempotent and concurrent-safe.
- Shutdown order: server stop → hooks (reverse) → terminal.
- Startup failure → `failed`; hook/stop failure → `ServerShutdownError`.

---

## 🧪 Testing

| Layer | Location | Proves |
| --- | --- | --- |
| Router unit | `packages/router/test/` | Patterns, priority, conflict keys, joins |
| Core unit | `packages/core/test/` | Routing, context, middleware, bodies, hooks, SSE |
| Adapter unit | `packages/http-bun/test/` | Real Bun server, conflicts, repeated stop |
| Integration | `tests/integration/` | Example app, 405, WebSockets, aborted clients, docs links |
| Type-level | `tests/types/` | Public types and invalid usage |
| Policy | `tests/integration/` | Boundaries, pins, required docs, CI gate |

Current result: **179 tests, 99.62% lines, 98.99% functions**.

---

## 🚧 Deferred by design

| Area | Phase |
| --- | --- |
| Validation, typed params, OpenAPI, Swagger | 4 |
| CLI, generator, settings/TOML, dev server | 5 |
| Plugins, DI, test client | 6 |
| Drizzle, migrations | 7 |
| Auth, RBAC, CSRF, CORS, security headers | 8 |
| Admin | 9 |
| Jobs, cache, storage, email | 10 |
| AI providers | 11 |
| Agents, durable workflows | 12 |
| Observability, enterprise operations | 13 |
| SSR, forms, assets, React | 14 |
| Performance/security hardening, 1.0 | 15 |

---

## 📚 Related decisions

- [ADR 0001 — Engineering foundation](docs/decisions/0001-engineering-foundation.md)
- [ADR 0002 — Product scope and support](docs/decisions/0002-product-scope.md)
- [ADR 0003 — Route matching](docs/decisions/0003-route-matching.md)
- [RFC 0001 — Public API](RFC/0001-public-api.md)
- [RFC 0002 — Routing](RFC/0002-routing.md)
- [Phase 3 checklist](docs/phase-3-checklist.md)
