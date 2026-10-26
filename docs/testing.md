# 🧪 Testing guide

TypeScript is a product feature, so tests cover **behavior and types**. Every
public API needs documented behavior, unit or integration tests, and type-level
tests where inference or read-only contracts matter.

Current state: **89 tests, 100% functions, 100% lines.**

---

## 🧱 Test layers

| Layer | Location | Runner | Purpose |
| --- | --- | --- | --- |
| Unit | `packages/core/test/`, `tests/unit/` | `bun test` | Routes, response semantics, errors, lifecycle, concurrency, benchmark stats |
| Adapter | `packages/http-bun/test/` | `bun test` | Real `Bun.serve()`, request forwarding, port conflicts, repeated stop |
| Integration | `tests/integration/` | `bun test` | Real sockets, example app, aborted clients, package boundaries, repository policy |
| Type-level | `tests/types/*.test-d.ts` | `tsc --noEmit` | Public types, inference, `@ts-expect-error`, read-only members |
| End-to-end | `scripts/smoke-example.ts` | `bun run smoke` | Starts the example and asserts real HTTP responses |
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
- Current Phase 2 coverage is **100% functions and lines**. Keep it there unless
  a documented exception exists.
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
  is specifically about the HTTP stack.
- Error tests assert **status and the JSON envelope**, not only status.

### Type-level tests

- Put files in `tests/types/` with a `.test-d.ts` suffix.
- Checked by `tsc`, not executed by `bun test`.
- Use exported `type` aliases to avoid unused-local errors.
- Put `@ts-expect-error` inside a function that is never called, so accidental
  execution cannot mutate state.
- Test both directions: valid usage compiles; invalid usage is rejected.
- Keep type tests focused on public contracts, not private helpers.

### Repository policy tests

`tests/integration/repository-policy.test.ts` turns foundational rules into
tests: required docs, the single Bun pin, license consistency, package privacy
and versions, and the CI quality gate. Change the rule and the test together.

### Package boundary tests

`tests/integration/workspace-boundaries.test.ts` enforces the dependency
direction: core has zero dependencies and no `Bun.*`; the adapter depends only
on core; the umbrella depends only on core + adapter.

---

## 🔬 Key Phase 2 scenarios

| Scenario | Why it matters |
| --- | --- |
| Every HTTP method | Method registration is easy to break. |
| Return values | Explicit response semantics are a core promise. |
| Safe 500s | Internal messages must never reach clients. |
| HEAD fallback + stripping | Correct HTTP without duplicate handlers. |
| Startup failure / port conflict | Fail loudly, not silently. |
| Concurrent `listen` / `stop` | Lifecycle must not race. |
| Shutdown hook order + failures | Graceful teardown must be reliable. |
| Aborted client | One disconnect must not break the server. |
| 50 in-process / 25 socket concurrent requests | Context isolation. |

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

- Property/fuzz tests for route parsing and validation boundaries.
- OpenAPI snapshot/contract tests with an independent validator.
- Database tests against disposable databases and a SQLite parity matrix.
- Auth/session regression tests: CSRF, fixation, revocation.
- Agent/tool permission and prompt-injection tests with mock providers.
- Performance regression thresholds after a stable benchmark baseline exists.
- Multi-platform support matrix tests (macOS, database versions).
