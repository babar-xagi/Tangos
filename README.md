# Qutivex

> **Status: Phase 1 — engineering foundation.**
> The repository is buildable, type-checked, tested, and CI-gated. The Qutivex
> framework API itself does not exist yet; Phase 2 begins the minimal HTTP core.
> Nothing here is production-ready, and no performance claims are made.

Qutivex is a Bun-first, TypeScript-native application framework with a
FastAPI-like developer experience, Django-inspired batteries, built-in AI/agent
primitives, and measurable performance goals. See [ROADMAP.md](ROADMAP.md) for
the full product plan and [ARCHITECTURE.md](ARCHITECTURE.md) for the current
repository architecture.

## What exists today

- A Bun workspace monorepo with the three initial packages needed for the core
  prototype: `@qutivex/core`, `@qutivex/router`, and `@qutivex/http-bun`.
- Strict TypeScript configuration and a pinned compiler.
- Biome formatting and linting for TypeScript, JavaScript, and JSON.
- `bun test` unit, integration, and type-level tests with a coverage threshold.
- GitHub Actions that install, format-check, lint, type-check, test, build, and
  smoke-test the example on Linux and Windows.
- A manual, documented release process and pinned toolchain.
- A minimal example server that proves workspace linking and the test harness.
- A baseline-only benchmark harness, intentionally publishing no numbers.

## What does not exist yet

The `App` API, routing, request context, middleware, validation, OpenAPI,
CLI/generator, settings/TOML, DI, plugins, testing client, database, auth,
admin, jobs, AI, agents/workflows, observability, and full-stack features are
all later phases. The Phase 1 example is a plain `Bun.serve()` handler, not a
Qutivex application. See [docs/phase-1-checklist.md](docs/phase-1-checklist.md)
for exactly what Phase 1 delivered.

## Requirements

- **Bun 1.4.4**, pinned by [.bun-version](.bun-version) and `packageManager`.
- **TypeScript 7.0.2**, installed locally as a dev dependency.
- Git.
- Node.js is not required.

The repository is tested on Linux and Windows in CI. macOS should work but is
not yet part of the CI matrix.

### Windows and WSL

Bun's platform packages (for example Biome's native binary) are OS-specific.
Do not share `node_modules` between a Windows checkout and a WSL checkout of
the same directory. Install dependencies again after switching environments:

```sh
rm -rf node_modules && bun install --frozen-lockfile
```

Your WSL installation must report `bun --version` = `1.4.4` to match CI and
`.bun-version`. Upgrade it with `bun upgrade` if it still reports `1.4.2`.

## Quick start

From the repository root:

```sh
bun install --frozen-lockfile
bun run validate
bun run example
```

Then open <http://127.0.0.1:3000/>. Stop the example with `Ctrl+C`.

`bun run validate` builds the packages, checks formatting, lints, type-checks,
runs the tests with coverage, and smoke-tests the example.

## Commands

| Command                  | Purpose                                                    |
| ------------------------ | ---------------------------------------------------------- |
| `bun install`            | Install workspace dependencies from `bun.lock`             |
| `bun run validate`       | Full local quality gate (build, checks, tests, smoke)      |
| `bun run format`         | Format TypeScript/JavaScript/JSON with Biome (`--write`)   |
| `bun run format:check`   | Verify formatting without writing                          |
| `bun run lint`           | Lint with Biome                                            |
| `bun run typecheck`      | Type-check every workspace project with TypeScript 7       |
| `bun test`               | Run unit and integration tests                             |
| `bun run test:coverage`  | Run tests with text and LCOV coverage reports              |
| `bun run build`          | Bundle each package into `packages/*/dist`                 |
| `bun run example`        | Run the Phase 1 example server                             |
| `bun run smoke`          | Start the example on an ephemeral port and assert responses |
| `bun run bench`          | Run the baseline-only benchmark harness                    |
| `bun run clean`          | Remove build output and coverage reports                   |

## Repository layout

```text
qutivex/
  packages/
    core/            # lifecycle, route registry, errors, hooks (Phase 2)
    router/          # public route definitions (Phase 3)
    http-bun/        # Bun.serve adapter (Phase 2)
  examples/
    hello/           # Phase 1 toolchain example
  tests/
    unit/            # cross-package unit tests
    integration/     # workspace, policy, and example integration tests
    types/           # compile-time tests (`*.test-d.ts`)
  benchmarks/http/   # baseline-only HTTP benchmark harness
  scripts/           # build, clean, and smoke helpers
  docs/              # development, testing, release, and decision records
  RFC/               # design proposals
  .github/           # CI, issue templates, PR template
  ROADMAP.md         # product and engineering roadmap
  ARCHITECTURE.md    # current repository architecture
  BENCHMARKS.md      # benchmark methodology (no published claims yet)
```

## Documentation

- [Development setup and troubleshooting](docs/development.md)
- [Testing strategy and conventions](docs/testing.md)
- [Release process](docs/release-process.md)
- [Phase 1 delivery checklist](docs/phase-1-checklist.md)
- [Architecture decision records](docs/decisions/0001-engineering-foundation.md)
- [Benchmark methodology](BENCHMARKS.md)

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Security
issues must follow [SECURITY.md](SECURITY.md), not the public issue tracker.

## License

[MIT](LICENSE). The license choice is provisional until the Phase 0 license and
contribution-model decision is finalized.
