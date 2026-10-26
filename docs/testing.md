# 🧪 Testing guide

TypeScript is a product feature, so tests cover **behavior and types**. Every
public API needs documented behavior, unit or integration tests, and type-level
tests where inference or read-only contracts matter.

Current state: **179 tests, 99.62% lines, 98.99% functions.**

---

## 🧱 Test layers

| Layer | Location | Runner | Purpose |
| --- | --- | --- | --- |
| Router unit | `packages/router/test/` | `bun test` | Patterns, priority, conflict keys, group joins |
| Core unit | `packages/core/test/` | `bun test` | Routing, context, middleware, bodies, hooks, SSE |
| Adapter unit | `packages/http-bun/test/` | `bun test` | Real `Bun.serve()`, request forwarding, port conflicts |
| Integration | `tests/integration/` | `bun test` | Example app, 405, WebSockets, aborted clients, docs links |
| Type-level | `tests/types/*.test-d.ts` | `tsc --noEmit` | Public types, inference, read-only members |
| End-to-end | `scripts/smoke-example.ts` | `bun run smoke` | Real HTTP + params + body + SSE smoke test |
| Performance | `benchmarks/http/` | `bun run bench` | Local harness; not a CI performance gate yet |

---

## ⌨️ Commands

```sh
bun run quality             # format + lint + import order (CI gate)
bun run fix                 # apply formatting, lint fixes, import sorting
bun test                    # all unit + integration tests
bun test --watch            # watch mode
bun test path/to/file.ts    # one test file
bun run test:coverage       # text + lcov, enforces 90% threshold
bun run typecheck           # includes type-level tests
bun run smoke               # real-socket example check
bun run validate            # everything CI runs
```

---

## 📈 Coverage

- Bun's native instrumentation; LCOV at `coverage/lcov.info`.
- `bunfig.toml` sets `coverageThreshold = 0.9`; failing function or line
  coverage fails the command.
- Test files are excluded from coverage.
- Do not lower the threshold to land a feature. Add tests or isolate genuinely
  unreachable glue and document it.
- Current Phase 3 coverage: **99.62% lines, 98.99% functions**. Keep it above
  90% and prefer improving it with real behavior tests.
- CI uploads the LCOV report on Linux.

---

## 📝 Conventions

### Unit and integration tests

- Name files `*.test.ts`; use `describe`/`test` from `bun:test`.
- Test observable behavior, not private implementation details.
- A regression fix includes a test that fails before the fix.
- Tests must be deterministic. No fixed public ports, no arbitrary sleeps, no
  dependency on execution order.
- A test that starts a server binds `127.0.0.1:0` and stops it in `finally`.
- Clean up timers, sockets, and temporary files. Do not leak handles.
- Prefer `app.fetch()` for in-process behavior; use a real socket when the test
  is specifically about HTTP or WebSockets.
- Error tests assert **status and the JSON envelope**, not only status.
- Body tests cover content-type, limits, malformed input, and caching.
- WebSocket tests use the real client and assert close codes/handler errors.

### Type-level tests

- Put files in `tests/types/` with a `.test-d.ts` suffix.
- Checked by `tsc`, not executed by `bun test`.
- Use exported `type` aliases to avoid unused-local errors.
- Put `@ts-expect-error` inside a function that is never called.
- Test both directions: valid usage compiles; invalid usage is rejected.
- Keep type tests focused on public contracts.

### Repository policy tests

`tests/integration/repository-policy.test.ts` turns foundational rules into
tests: required docs, the single Bun pin, license consistency, package privacy
and versions, and the CI quality gate.

### Package boundary tests

`tests/integration/workspace-boundaries.test.ts` enforces the dependency
direction: core may depend only on router; the adapter depends only on core; the
umbrella depends only on core + adapter; core has no `Bun.*`.

---

## 🔬 Key Phase 3 scenarios

| Scenario | Why it matters |
| --- | --- |
| Static/param/wildcard priority | Wrong precedence breaks every router. |
| 405 + Allow | Correct HTTP semantics. |
| Malformed percent-encoding | Safe 400, no crash. |
| Group prefix + metadata merge | Large apps depend on predictable composition. |
| Middleware order + short-circuit | Auth/logging correctness. |
| Double `next()` / invalid result | Prevent silent pipeline bugs. |
| Body limits + content types | Resource safety and clear errors. |
| Client abort + timeout | Lifecycle correctness under stress. |
| SSE formatting + stream errors | Streaming clients depend on the wire format. |
| WebSocket upgrade/426/close/error | Real-time behavior is not optional. |
| Request state isolation | No cross-request leakage. |

---

## 🔄 CI

GitHub Actions runs on Linux and Windows:

1. `bun install --frozen-lockfile`
2. `bun run quality`
3. `bun run typecheck`
4. `bun run test:coverage`
5. `bun run build`
6. `bun run smoke`

A failure at any step fails the job. `bun run validate` mirrors the gate locally.

---

## 🔭 What to add in later phases

- Validation/OpenAPI snapshots with an independent validator.
- Property/fuzz tests for route parsing and body limits.
- Database tests against disposable databases and a SQLite parity matrix.
- Auth/session regression tests: CSRF, fixation, revocation.
- Agent/tool permission and prompt-injection tests with mock providers.
- Performance regression thresholds after a stable benchmark baseline exists.
- WebSocket backpressure/message-limit tests.
- Multi-platform support matrix tests (macOS, database versions).
