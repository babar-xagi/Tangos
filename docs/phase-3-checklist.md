# ✅ Phase 3 — Routing, context, lifecycle, and middleware

> **Status:** Complete · **Completed:** 2026-10-26
> Qutivex now has the essential HTTP application model: patterns, groups,
> middleware, rich context, bounded bodies, timeouts, streaming/SSE, and
> WebSockets.

## 🎯 Goal

Provide a complete request pipeline—routing, context, middleware, lifecycle,
and HTTP capabilities—that stays small, typed, testable, and honest about what
is deferred.

---

## 🛣️ Routing

| Work item | Status | Evidence |
| --- | :---: | --- |
| Static routes | ✅ | `RouteTable`, tests |
| Path parameters | ✅ | `/users/:id`, decoding tests |
| Wildcard routes | ✅ | `/assets/*`, empty/rest captures |
| Query parameter access | ✅ | `ctx.query`, tests |
| Header and cookie access | ✅ | `ctx.headers`, `ctx.header`, `ctx.cookies`, `ctx.cookie` |
| Route grouping/prefixes | ✅ | `app.group`, nested groups, normalized prefixes |
| Route names and metadata | ✅ | `RouteOptions`, `app.routes` |
| Route listing/introspection | ✅ | `app.routes`, `app.webSockets` |
| Route conflict detection | ✅ | Duplicate path shapes, names, middleware validation |
| Method-not-allowed behavior | ✅ | 405 + `Allow`, tests |
| Static → param → wildcard priority | ✅ | Deterministic matcher, priority tests |
| Malformed path encoding | ✅ | Safe 400 `INVALID_PATH_ENCODING` |

---

## 🧠 Request context

| Work item | Status | Evidence |
| --- | :---: | --- |
| Request and parsed URL | ✅ | `ctx.request`, `ctx.url` |
| Path params | ✅ | `ctx.params`, isolated per request |
| Query params | ✅ | `ctx.query` |
| Headers and cookies | ✅ | `ctx.headers`, `ctx.header`, `ctx.cookies`, `ctx.cookie` |
| Lazy body parsing | ✅ | `ctx.body.json/text/formData/arrayBuffer`, cached |
| Response helpers | ✅ | `ctx.json/text/html/redirect/stream/sse/noContent` |
| Request ID and logger | ✅ | `ctx.requestId`, `ctx.logger`, `x-request-id` |
| Dependency access | ⏳ Phase 6 | DI not implemented |
| Authenticated principal | ⏳ Phase 8 | Auth not implemented |
| Abort signal | ✅ | Client disconnect + request timeout |
| Request-scoped metadata | ✅ | `ctx.state` Map, isolation test |

---

## 🧱 Middleware and hooks

| Work item | Status | Evidence |
| --- | :---: | --- |
| Global middleware | ✅ | `app.use`, ordered tests |
| Route-level middleware | ✅ | `RouteOptions.middleware` |
| Group-level middleware | ✅ | `group.use`, `group(..., { middleware })` |
| Before/after handler hooks | ✅ | `app.before`, `app.after` |
| Error hooks | ✅ | `onError` option + `app.onError()` method |
| Order and short-circuit behavior | ✅ | global → group → route → before → handler → after |
| Prevent multiple `next()` | ✅ | `MIDDLEWARE_NEXT_CALLED_TWICE` |
| Consistent middleware errors | ✅ | Same safe error path; tests |

---

## 🌐 HTTP capabilities

| Work item | Status | Evidence |
| --- | :---: | --- |
| Request body size limits | ✅ | `maxBodyBytes` (1 MiB default), 413 tests |
| Content-type handling | ✅ | JSON `+json`, form types, 415 tests |
| Streaming responses | ✅ | `ctx.stream`, real-socket/body tests |
| Server-Sent Events | ✅ | `ctx.sse`, formatting + stream-error tests |
| WebSocket integration | ✅ | `app.websocket`, Bun bridge, params/close/error tests |
| Request timeouts and cancellation | ✅ | `requestTimeoutMs`, 504 + signal test |
| Compression policy | ⏸️ Deferred | No compression until adapter choice + measurement (roadmap §3) |

---

## 🧪 Test coverage

| Area | Tests |
| --- | --- |
| Routing | Params, wildcards, priority, trailing slash, 404/405, HEAD, malformed encoding |
| Groups/metadata | Prefixes, nesting, all methods, metadata merge, names |
| Middleware | Ordering, short-circuit, double next, invalid result, errors |
| Hooks | Before/after ordering, replacement, errors, registration windows |
| Context | Query/headers/cookies, request IDs, logger, state isolation |
| Bodies | JSON/text/form/array-buffer, cache, content types, header + stream limits |
| Limits/timeouts | Header vs stream limits, 413, 504, client abort signal |
| Helpers | JSON/text/HTML/redirect/no-content/stream/SSE |
| WebSockets | Upgrade, params/query, binary, 426, close, handler failure |
| Example | Params, body, middleware header, group, SSE, real socket |

Validation command:

```sh
bun run test:coverage
```

Result at completion:

```text
179 pass, 0 fail
594 expect() calls
99.62% lines / 98.99% functions
```

---

## 🚪 Exit criteria

| Criterion | Evidence |
| --- | --- |
| Multi-route service with logging middleware | Example adds timing middleware; middleware tests |
| Route groups | Nested group tests |
| Path params | Params/decoding tests |
| Query params | Context tests |
| Streamed responses | `ctx.stream` + SSE tests |
| Core works without optional modules | Boundary test: only first-party router dependency, no `Bun.*`, no DB/admin/AI/frontend |
| Lifecycle still tested | Phase 2 lifecycle suite remains green |

**Result:** ✅ met.

---

## 🧾 Known Phase 3 limitations

- No validation, typed params, OpenAPI, or response schemas (Phase 4).
- No CLI/generator/settings/dev server (Phase 5).
- No DI, plugins, or test client (Phase 6).
- No database, auth, sessions, RBAC, CSRF, CORS, security headers, or rate
  limits (Phases 7–8).
- WebSockets do not support middleware/groups yet.
- Compression is intentionally deferred.
- Request timeouts abort a signal but cannot forcibly stop a handler.
- The route matcher is custom and pending benchmark comparison with Bun native
  routing ([ADR 0003](decisions/0003-route-matching.md)).
- WebSocket message size/backpressure policy uses Bun defaults; no Qutivex-level
  limits yet.
- No request body streaming API; body readers are buffered within the limit.

---

## 📸 Verification snapshot

| Fact | Value |
| --- | --- |
| Date | 2026-10-26 |
| Bun | 1.4.4 |
| TypeScript | 7.0.2 |
| Tests | 179 pass / 0 fail |
| Coverage | 99.62% lines, 98.99% functions (90% gate) |
| CI | quality, typecheck, coverage, build, smoke on Linux + Windows |
| Example | params, body, middleware, group, SSE verified over a real socket |
| WebSockets | upgrade, params, binary, 426, close, failure verified |

---

## ➡️ Next phase

Phase 4 adds Standard Schema validation, body/params/query/header/cookie
schemas, inferred types, consistent 422 errors, response validation, and
OpenAPI 3.1 + interactive docs. See [RFC 0003](../RFC/0003-validation-openapi.md).
