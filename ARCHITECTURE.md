# 🏛️ Qutivex architecture — Phase 2

> **Scope:** implementation architecture as of Phase 2. Product scope and public
> API commitments live in [RFC 0001](RFC/0001-public-api.md) and
> [VISION.md](VISION.md). This document describes what exists now, not the full
> future system.

**Status:** 🟢 Phase 0, 1, and 2 complete · 🚧 Phase 3 next

---

## 🎯 Design constraints

| Constraint | Consequence |
| --- | --- |
| **Bun-first** | `Bun.serve()` is the only HTTP engine. No cross-runtime abstraction. |
| **Small core** | `@qutivex/core` has zero dependencies and never imports `Bun.*`. |
| **Opt-in modules** | A minimal API does not load database, admin, AI, or frontend code. |
| **Explicit behavior** | No hidden body parsing, serialization magic, or global state. |
| **Safe errors** | One envelope; no internal messages, stacks, or causes in responses. |
| **Adapter boundary** | Runtime details sit behind `HttpServerAdapter`. |
| **Measured performance** | A harness exists before any claim is published. |

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
     │ Bun.serve bridge │              │ App, routes,     │
     └─────────────────┘              │ errors, types    │
                                      └──────────────────┘
                                                ▲
                                                │ Phase 3
                                      ┌─────────────────┐
                                      │ @qutivex/router │
                                      └─────────────────┘
```

| Package | Responsibility | Runtime deps |
| --- | --- | --- |
| `@qutivex/core` | App lifecycle, exact-match route table, response normalization, errors, shutdown hooks, adapter contract | **none** |
| `@qutivex/http-bun` | `Bun.serve()` adapter, server handle, startup error wrapping | `@qutivex/core` |
| `qutivex` | Public import; `App` with Bun adapter wired in; re-exports core contracts | `core`, `http-bun` |
| `@qutivex/router` | Phase 3 route params, groups, introspection | none yet (placeholder) |

Boundaries are enforced by
[`tests/integration/workspace-boundaries.test.ts`](tests/integration/workspace-boundaries.test.ts):
core cannot import another package or use `Bun.*`; the adapter may import core;
the umbrella may import core and the adapter.

---

## 🔁 Request flow

```text
Bun.serve(fetch)
      │
      ▼
http-bun adapter ──▶ App.fetch(request)
                         │
                         ├─ parse URL, uppercase method
                         ├─ HEAD? use explicit HEAD or fall back to GET
                         ├─ RouteTable.match(method, path)
                         │     └─ miss ──▶ 404 envelope
                         ├─ build RequestContext
                         ├─ await handler(ctx)
                         ├─ toResponse(result)
                         │     ├─ Response passthrough
                         │     ├─ string  → text/plain
                         │     ├─ undefined → 204
                         │     └─ JSON value → application/json
                         ├─ HEAD? strip body
                         └─ catch ──▶ onError? → safe error envelope
```

There is **no middleware layer, body parser, or serializer** in Phase 2. Those
are deliberately later phases.

---

## 🔄 Lifecycle state machine

```text
                  register route
created ─────────────────────────▶ configured
   │                                   │
   │            listen()/run()          │
   └──────────────┬────────────────────┘
                  ▼
               starting
                  │ success            ┌─────────────┐
                  ├───────────────────▶│   running   │
                  │ failure            └──────┬──────┘
                  ▼                           │ stop()
               failed                         ▼
                  │                      stopping
                  │                           │ success
                  │                           ▼
                  │                       stopped
                  │ failure
                  └──────────────────▶ failed

stop() before start ──────────────────▶ stopped
```

- `state` is publicly readable.
- Routes are frozen once startup begins.
- `stop()` is idempotent; concurrent stops share one shutdown.
- Shutdown order: stop accepting → server stop → hooks (reverse) → terminal.
- A hook/server-stop error is reported via `onError` and rejects with
  `ServerShutdownError`.
- Apps cannot be restarted after `stopped`/`failed`.

---

## 📤 Response semantics

| Handler returns | Result |
| --- | --- |
| `Response` | Unchanged |
| `string` | `200 text/plain; charset=utf-8` |
| JSON value | `200 application/json; charset=utf-8` |
| `undefined` | `204 No Content` |
| Throws `HttpError` | Status/code; 4xx messages exposed |
| Throws anything else | `500` generic; original passed to `onError` |

- JSON serialization failures become `RESPONSE_SERIALIZATION_FAILED` (`500`).
- HEAD responses preserve status/headers but have no body.
- Error responses use `Cache-Control: no-store`.

---

## 💥 Error model

```text
QutivexError (code, status, expose, cause)
├── HttpError          → intentional 4xx/5xx
├── ConfigurationError → invalid app/route/adapter setup
├── LifecycleError     → invalid operation for current state
├── ServerStartError   → adapter failed to start
└── ServerShutdownError→ stop/hook failure
```

Client envelope:

```json
{ "error": { "code": "NOT_FOUND", "message": "Not Found" } }
```

`expose: false` replaces the message with the standard status phrase. Causes and
stacks never reach clients.

---

## 🔌 Adapter contract

```ts
interface HttpServerAdapter {
  start(options: {
    hostname: string;
    port: number;
    development: boolean;
    fetch: (request: Request) => Promise<Response>;
  }): HttpServer | Promise<HttpServer>;
}

interface HttpServer {
  readonly hostname: string;
  readonly port: number;
  readonly url: URL;
  stop(force?: boolean): Promise<void>;
}
```

The Bun adapter:

- Calls `Bun.serve({ hostname, port, fetch, development, reusePort: false })`.
- Exposes the bound address and a stop function.
- Wraps startup failures in `ServerStartError` with the original cause.

The core can be tested with a fake adapter, and a future runtime can implement the
same contract without changing routes or handlers.

---

## 🗃️ Route table (Phase 2)

- Map of method → path → handler.
- Exact path matching on `URL.pathname`.
- Path validation: leading `/`, no query/fragment/whitespace.
- Duplicate method + path rejected.
- HEAD fallback to GET when no explicit HEAD route exists.
- Unknown method/path → 404 (405 is Phase 3).
- Registration only in `created`/`configured`.

Seed for Phase 3:
[RFC 0002](RFC/0002-routing.md) adds params, wildcards, groups, metadata, and
Bun-native route registration.

---

## 🧪 Testing architecture

| Layer | Location | Proves |
| --- | --- | --- |
| Unit | `packages/core/test/` | Routes, responses, errors, lifecycle, concurrency |
| Adapter | `packages/http-bun/test/` | Real `Bun.serve()`, port conflicts, repeated stop |
| Integration | `tests/integration/` | Example app, real sockets, aborted clients, port conflicts |
| Type-level | `tests/types/` | Public types, handler results, read-only fields |
| Policy | `tests/integration/` | Boundaries, pins, required docs, CI gate |

CI runs the same gate on Linux and Windows:
install → quality → typecheck → coverage → build → smoke.

---

## 📦 Packaging and build

- Workspace packages export TypeScript source through `types`/`import`
  conditions; Bun consumes them without a build step.
- `bun run build` bundles each package to `dist` with declared dependencies
  externalized.
- `private: true` prevents accidental publication before the release checklist.
- Declaration emission and final publish metadata remain open (Phase 15).

---

## 🚧 Deferred by design

| Area | Phase |
| --- | --- |
| Path params, query/header/cookie helpers, groups, middleware, SSE, WebSockets | 3 |
| Validation, body parsing, OpenAPI, Swagger | 4 |
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
- [RFC 0001 — Public API](RFC/0001-public-api.md)
- [Phase 2 checklist](docs/phase-2-checklist.md)
