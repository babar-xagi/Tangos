# ✅ Phase 1 — Repository and engineering foundation

> **Status:** Complete · **Completed:** 2026-10-26
> Phase 1 built the buildable, tested monorepo. Phase 2 has since replaced the
> placeholder example with the real `App`.

Phase 1 of [ROADMAP.md](../ROADMAP.md) is **repository and engineering
foundation**. This file maps every Phase 1 work item to its implementation and
records the exit-criteria evidence. The Phase 2 record is
[here](phase-2-checklist.md).

## Work items

| Roadmap item | Status | Evidence |
| ------------ | :----: | -------- |
| Create a Git repository with a clear license | ✅ | `.git`, [LICENSE](../LICENSE) (MIT, decided in [ADR 0002](decisions/0002-product-scope.md)) |
| Initialize Bun workspaces/monorepo | ✅ | [package.json](../package.json), [bunfig.toml](../bunfig.toml), [bun.lock](../bun.lock) |
| Create only the initial packages needed for the core prototype | ✅ | `packages/core`, `packages/router`, `packages/http-bun` |
| Configure TypeScript with strict settings | ✅ | [tsconfig.json](../tsconfig.json) (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, …) |
| Configure a supported type-check command in CI | ✅ | TypeScript 7.0.2, `bun run typecheck`; see [ADR 0001](decisions/0001-engineering-foundation.md) |
| Configure formatter and lint rules | ✅ | [biome.json](../biome.json), `bun run quality` (format, lint, import order) |
| Configure `bun test` and test coverage reporting | ✅ | `bun run test:coverage`, [bunfig.toml](../bunfig.toml) 90% threshold, LCOV upload |
| Add unit-test and integration-test directory conventions | ✅ | `packages/*/test`, `tests/unit`, `tests/integration`, `tests/types`; [testing guide](testing.md) |
| Add GitHub Actions for install, type-check, tests, lint, build | ✅ | [.github/workflows/ci.yml](../.github/workflows/ci.yml) |
| Add changeset/release automation or a documented manual versioning process | ✅ | [release process](release-process.md) (manual by design at this stage) |
| Add contribution guide, code of conduct, issue templates, PR template | ✅ | [CONTRIBUTING.md](../CONTRIBUTING.md), [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md), `.github/ISSUE_TEMPLATE/*`, `.github/pull_request_template.md` |
| Pin the Bun version used by CI and examples | ✅ | [.bun-version](../.bun-version) = `1.4.4`, `packageManager`, `engines.bun`, CI `bun-version-file` |
| Add a basic benchmark harness without performance claims | ✅ | `bun run bench`, [BENCHMARKS.md](../BENCHMARKS.md) |

## Deliverables

- **Reproducible local setup** — pinned Bun/TypeScript/Biome, exact installs,
  committed lockfile, documented in [development guide](development.md).
- **CI that fails on broken types/tests** — quality gate, type-check,
  coverage-gated tests, build, and example smoke test on Linux and Windows.
- **Package boundary conventions** — [ARCHITECTURE.md](../ARCHITECTURE.md) plus
  executable checks in `tests/integration/workspace-boundaries.test.ts`.
- **First minimal example** — Phase 1 used a plain Bun server to prove the
  toolchain. Phase 2 replaced it with a real Qutivex `App`; `bun run smoke`
  still exercises it over a real socket.

## Exit criteria

> A clean clone can install dependencies, type-check, run tests, and execute
> the example using documented commands.

Verified with:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test:coverage
bun run example
```

The same flow is automated in CI and in `bun run validate`. The example is
started by `bun run example` and by the smoke test; both are documented in the
README and example README.

## Validation record

| Fact | Value |
| ---- | ----- |
| Date | 2026-10-26 |
| Bun | 1.4.4 |
| TypeScript | 7.0.2 |
| Biome | 2.6.3 |
| Host | Windows (x64) |
| CI targets | `ubuntu-latest`, `windows-latest` |
| Example smoke | ephemeral `127.0.0.1:0` socket |
| Coverage threshold | 90% (functions and lines) |
| Test result | 23 pass, 0 fail, 100% functions/lines (Phase 1 snapshot) |
| Clean checkout | `git archive HEAD` → `bun install --frozen-lockfile` → `bun run validate`: passed |

The current test and coverage record lives in the
[Phase 2 checklist](phase-2-checklist.md).

Run `bun run validate` to reproduce the local gate. Exact pass/fail output is
not frozen in this document; CI is the source of truth for a given commit.

## Known limitations and deviations

- **Type-checking uses the pinned reference compiler, not `bun check`.**
  TypeScript 7.0.2 is the gate for inference correctness and editor parity;
  `bun check` remains an optional local command. Recorded in
  [ADR 0001](decisions/0001-engineering-foundation.md).
- **WSL was not executed by the scaffolding agent.** The sandbox blocked `wsl`
  access. The repository pins Bun `1.4.4`; upgrade the WSL installation from
  `1.4.2` with `bun upgrade` before validating there. Linux is covered by CI.
- **macOS is not in the CI matrix yet.** Roadmap Phase 15 covers the full
  supported-platform matrix.
- **No automated release.** Manual versioning is intentional until the first
  public release.
- **No performance claims.** The harness now includes a Qutivex route, but no
  number has been published or compared externally.

## Next phase

Phase 2 is complete: see the [Phase 2 checklist](phase-2-checklist.md). Phase 3
is also complete; Phase 4 begins validation, type inference, and OpenAPI.
