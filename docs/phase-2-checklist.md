# ✅ Phase 2 — Minimal HTTP core

> **Status:** Complete · **Completed:** 2026-10-26
> The smallest useful Qutivex application now runs on `Bun.serve()`.

## 🎯 Goal

Create a minimal, typed application object with a real server lifecycle, explicit
response semantics, safe errors, and graceful shutdown—without loading any
optional module.

---

## 📋 Work items

| Work item | Status | Where |
| --- | :---: | --- |
| Implement `App` construction | ✅ | `packages/core/src/app.ts` |
| Lifecycle states: created, configured, starting, running, stopping, stopped, failed | ✅ | `app.ts`, tests |
| Server startup/shutdown around `Bun.serve()` | ✅ | `packages/http-bun/src/index.ts` |
| GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD registration | ✅ | `app.ts` |
| `Response`, string, JSON object, and `void` return semantics | ✅ | `response.ts`, tests |
| Default 404 and 500 responses | ✅ | `response.ts`, tests |
| Normalize thrown errors into safe HTTP responses | ✅ | `errors.ts`, `response.ts`, tests |
| Configurable host and port | ✅ | `AppOptions`, `listen()` |
| Graceful shutdown hooks | ✅ | `onShutdown()`, `stop()` |
| Minimal startup banner, disabled in production by default | ✅ | `App#printBanner`, tests |
| `app.run()` / `app.listen()` decision | ✅ | `run()` is an alias; documented in RFC 0001 |

---

## 🧱 Design constraints

| Constraint | Result |
| --- | --- |
| Don't wrap every `Response` unnecessarily | Returned `Response` is passed through. |
| Don't parse JSON unless needed | No body parsing in Phase 2. |
| Avoid loading optional modules in core | At Phase 2 completion core had zero dependencies and no `Bun.*`. |
| No custom router yet | Exact-match table; native routing in Phase 3. |
| Registration before startup only | Late registration throws `LifecycleError`. |

---

## 🧪 Test coverage

| Area | Tests |
| --- | --- |
| Every HTTP method | All seven methods, bodyless HEAD, explicit HEAD |
| Return values | JSON, text, number, boolean, `null`, array, `undefined`, `Response`, async |
| 404 / thrown errors / malformed output | Envelope, hidden messages, circular/BigInt/symbol, out-of-range status |
| Port conflict / startup failure | Real socket conflict, fake adapter failure, QutivexError passthrough |
| Graceful shutdown / repeated shutdown | Hook order, idempotency, concurrent stop, hook/server failures |
| Concurrent requests / aborted clients | 50 in-process, 25 real-socket, aborted fetch + recovery |
| Lifecycle | All seven states, late registration, listen while starting/stopping |
| Adapter | Real Bun server, request forwarding, repeated stop, conflict wrapping |

Test command:

```sh
bun run test:coverage
```

Result at completion:

```text
89 pass, 0 fail
330 expect() calls
100% functions / 100% lines
```

88 tests exercise the HTTP core; one verifies Markdown links across the docs.

---

## 📦 Public surface

```ts
import { App, HttpError, type RequestContext } from "qutivex";

const app = new App({ name: "My API" });

app.get("/", () => ({ message: "Hello" }));
app.get("/private", () => {
  throw HttpError.unauthorized("Sign in first");
});

await app.run({ port: 3000 });
```

Package split:

- `@qutivex/core` — lifecycle, routes, responses, errors.
- `@qutivex/http-bun` — `Bun.serve()` adapter.
- `qutivex` — public umbrella with Bun wired in.
- `@qutivex/router` — Phase 3 replaced the placeholder with the pattern matcher.

---

## 🚪 Exit criteria

| Criterion | Evidence |
| --- | --- |
| Core works without database, admin, AI, or frontend imports | Boundary test: first-party router only, no forbidden imports, no `Bun.*` |
| All lifecycle states are tested | `packages/core/test/app.test.ts` |
| A real "Hello World" serves over HTTP | `examples/hello`, smoke test |
| Graceful shutdown is safe and repeatable | Hook/idempotency tests |
| Errors never leak internal details | Error tests + integration tests |

**Result:** ✅ met.

---

## 🧾 Known Phase 2 limitations

- Exact paths only; no params, wildcards, groups, or middleware (Phase 3).
- No body parsing, query/cookie helpers, or typed params (Phase 3/4).
- No 405 with `Allow` header (Phase 3).
- No streaming helpers, SSE, or WebSockets (Phase 3).
- No request ID, logger, timeout, or abort signal in context (Phase 3/13).
- No automatic process signal handling; `run()` is a server lifecycle call, not a
  CLI.
- No validation/OpenAPI (Phase 4) and no CLI/generator (Phase 5).

---

## 📸 Verification snapshot

| Fact | Value |
| --- | --- |
| Date | 2026-10-26 |
| Bun | 1.4.4 |
| TypeScript | 7.0.2 |
| Tests | 89 pass / 0 fail (88 HTTP core + 1 docs link policy) |
| Coverage | 100% functions, 100% lines (90% gate) |
| Example | `/`, `/health`, 404, HEAD verified over a real socket |
| CI gate | quality, typecheck, coverage, build, smoke on Linux + Windows |

---

## ➡️ Next phase

Phase 3 added path params, wildcards, query/header/cookie access, middleware,
route groups, 405 behavior, request IDs, streaming/SSE/WebSockets, and the full
request context. See the [Phase 3 checklist](phase-3-checklist.md). Phase 4 adds
validation/OpenAPI.
