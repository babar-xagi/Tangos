# Qutivex architecture — Phase 1 snapshot

> **Scope:** this document describes the repository architecture at the end of
> Phase 1. It is not the Phase 0 system specification, and it does not freeze
> the public API. Route, validation, plugin/DI, database, and AI RFCs are still
> pending in [RFC/](RFC/).

## Design constraints carried into the repository

From [ROADMAP.md](ROADMAP.md) §1.3 and §3.5:

- **Small core.** `@qutivex/core` must not import adapters or optional modules.
- **Opt-in capabilities.** A simple API must not load database, admin, AI, or
  frontend code.
- **One direction of dependency.** Optional modules depend on core contracts,
  never the reverse.
- **Explicit behavior.** No hidden network calls, database queries, or agent
  permissions.
- **Measured performance.** No claims before a reproducible harness exists.

## Current package graph

```text
examples/hello ──────────────► @qutivex/core
                                   ▲
                                   │ (future)
                    @qutivex/router│ @qutivex/http-bun
                                   │
                              Bun.serve()
```

At the end of Phase 1 the packages contain only package identity and phase
ownership documentation. No HTTP behavior exists in them yet.

| Package             | Responsibility                                      | Phase |
| ------------------- | --------------------------------------------------- | ----: |
| `@qutivex/core`     | App lifecycle, route registry, errors, hooks        |     2 |
| `@qutivex/router`   | Public route definitions and registration           |     3 |
| `@qutivex/http-bun` | `Bun.serve()` adapter and request/response bridge   |     2 |

`examples/hello` does **not** use the framework API yet. It is a plain
`Bun.serve()` handler that proves the workspace, toolchain, build, and test
harness work. Phase 2 replaces it with the minimal `App`.

## Boundary rules (enforced)

`tests/integration/workspace-boundaries.test.ts` enforces the rules that can be
checked mechanically today:

1. `@qutivex/core` has no dependencies and no peer dependencies.
2. Core imports no other `@qutivex/*` package and no optional module.
3. Core source contains no `Bun.*` API usage; Bun-specific behavior belongs in
   `@qutivex/http-bun`.
4. Every package exposes a `types` and `import` condition pointing at its
   source entry point.
5. Packages are private and version-locked at `0.0.0` until a release exists.

As packages grow, the same test should gain import-graph checks for every
boundary, not only core.

## Naming and distribution

- Workspace packages use the `@qutivex/*` scope.
- The public umbrella import `qutivex` (for example `import { App } from
  "qutivex"`) is planned but not created yet. Creating it now would commit to
  an export surface before the Phase 0 public API RFC exists.
- Packages export TypeScript source via `types`/`import` during development, so
  Bun can consume the workspace without a build step.
- `bun run build` bundles each package to `packages/*/dist` with Bun's bundler
  and externalizes declared dependencies. Declaration-file emission and final
  publish `exports` are deferred until the packaging decision is revisited;
  `tsc` remains the source of type truth.
- `private: true` prevents accidental publication. Flipping it is part of the
  release checklist, not a side effect of setting a version.

## Runtime and toolchain

| Concern      | Choice                                    | Why |
| ------------ | ----------------------------------------- | --- |
| Runtime      | Bun 1.4.4 only                            | Bun-first by design; no cross-runtime abstraction before the API stabilizes. |
| HTTP server  | `Bun.serve()` (Phase 2)                   | Native server and route table; no custom router yet. |
| Type checker | TypeScript 7.0.2, `tsc --noEmit`          | Reference checker, editor parity, and future declaration emission. `bun check` is available but is not the CI gate. |
| Tests        | `bun test`                                | Native runner, built-in coverage, no extra runner dependency. |
| Format/lint  | Biome 2.6.3                               | One pinned tool for both; fast on CI. |
| Versions     | Exact pins + `bun.lock`                   | Deliberate upgrades. |
| Publish      | Manual process                            | Roadmap allows manual versioning; no release automation until a release exists. |

## Configuration files

| File            | Owns |
| --------------- | ---- |
| `package.json`  | Workspaces, scripts, pinned dev dependencies, `packageManager`. |
| `bunfig.toml`   | Exact installs, hoisted linker, test coverage threshold. |
| `tsconfig.json` | Strict type-checking for every workspace project. |
| `biome.json`    | Format and lint rules; Markdown is excluded to keep prose diffs intentional. |
| `.bun-version`  | The one Bun version used by CI, local setup, and examples. |
| `bun.lock`      | Reproducible dependency graph. |

## Testing layers

```text
tests/types/          compile-time assertions (tsc)
packages/*/test/      package unit tests (bun test)
tests/unit/           cross-cutting pure logic (bun test)
tests/integration/    workspace, policy, and real-socket integration (bun test)
scripts/smoke-example.ts  end-to-end example check used by CI
```

Details and conventions are in [docs/development.md](docs/development.md) and
[docs/testing.md](docs/testing.md).

## Deliberate Phase 1 non-features

- No `App`, router, context, middleware, validation, OpenAPI, CLI, DI, plugins,
  settings/TOML, database, auth, admin, jobs, AI, agents, observability, or
  full-stack code.
- No custom router, serializer, ORM, crypto, queue, or LLM client.
- No performance claims, published benchmark numbers, or comparisons.
- No changesets/release automation; the manual process is documented.

## Related decisions

- [ADR 0001 — Engineering foundation](docs/decisions/0001-engineering-foundation.md)
- [Phase 1 delivery checklist](docs/phase-1-checklist.md)
- [Roadmap](ROADMAP.md)
