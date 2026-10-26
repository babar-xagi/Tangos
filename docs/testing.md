# Testing guide

TypeScript is a product feature, so tests cover behavior **and** types. Every
public API added after Phase 1 needs documented behavior, unit tests, and
type-level tests where inference matters.

## Test layers

| Layer        | Location                 | Runner | Purpose |
| ------------ | ------------------------ | ------ | ------- |
| Unit         | `packages/*/test/`, `tests/unit/` | `bun test` | Pure logic, no sockets or filesystem side effects. |
| Integration  | `tests/integration/`     | `bun test` | Workspace resolution, package boundaries, repository policy, real sockets. |
| Type-level   | `tests/types/*.test-d.ts`| `tsc --noEmit` | Public inference, literal types, read-only contracts, `@ts-expect-error` cases. |
| End-to-end   | `scripts/smoke-example.ts` | `bun run smoke` | Starts the example on an ephemeral port and asserts real HTTP responses. |
| Performance  | `benchmarks/http/`       | `bun run bench` | Local harness; not a CI performance gate yet. |

## Commands

```sh
bun test                    # all unit + integration tests
bun test --watch            # watch mode
bun run test:coverage       # text + lcov, enforces 90% threshold
bun run typecheck           # includes type-level tests
bun run smoke               # real-socket example check
bun run validate            # everything CI runs
```

## Coverage

- Coverage is collected with Bun's native instrumentation.
- `bunfig.toml` sets `coverageThreshold = 0.9`; the command fails if lines,
  functions, or statements fall below it.
- Test files are excluded from coverage.
- Do not lower the threshold to land a feature. Add tests or, for genuinely
  unreachable glue code, isolate it and document the exception.
- LCOV output is written to `coverage/lcov.info` and uploaded by CI on Linux.

## Conventions

### Unit and integration tests

- Name files `*.test.ts` and use `describe`/`test` from `bun:test`.
- Test observable behavior, not implementation details.
- Prefer explicit assertions with useful failure messages.
- A regression fix includes a test that fails before the fix.
- Tests must be deterministic. No fixed ports, no sleeps, no dependency on test
  execution order.
- A test that starts a server must bind port `0` and stop it in `finally`.
- Clean up timers, sockets, and temporary files. Do not leak handles.

### Type-level tests

- Put files in `tests/types/` with a `.test-d.ts` suffix.
- They are checked by `tsc`, not executed by `bun test`.
- Use exported `type` aliases to avoid unused-local errors.
- Put `@ts-expect-error` in a function that is never called, so accidental
  execution cannot mutate state.
- Test both directions: valid usage compiles; invalid usage is rejected.

### Repository policy tests

`tests/integration/repository-policy.test.ts` turns foundational rules into
tests: required files, the single Bun pin, license consistency, private
version-locked packages, and the CI quality gate. When you change one of those
rules, update the policy test and the docs together.

### Package boundary tests

`tests/integration/workspace-boundaries.test.ts` enforces the dependency
direction. New packages must extend it rather than bypass it.

## CI

GitHub Actions runs on Linux and Windows:

1. `bun install --frozen-lockfile`
2. `bun run format:check`
3. `bun run lint`
4. `bun run typecheck`
5. `bun run test:coverage`
6. `bun run build`
7. `bun run smoke`

A failure at any step fails the job. `bun run validate` mirrors the same gate
locally, in the same order.

## What to add in later phases

- Database tests against disposable databases and a documented SQLite parity
  matrix.
- Auth/session regression tests, including CSRF, fixation, and revocation.
- OpenAPI snapshot/contract tests with an independent validator.
- Property/fuzz tests for parsers and validation boundaries.
- Agent/tool permission and prompt-injection tests using mock providers.
- Performance regression thresholds only after a stable workload baseline is
  recorded.
