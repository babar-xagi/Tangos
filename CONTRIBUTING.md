# Contributing to Qutivex

Thanks for your interest. Qutivex is currently at **Phase 3** (routing,
context, middleware, and HTTP) and is not production-ready. Contributions that
align with the current phase are welcome; large features should start as an issue
or RFC so they are not designed in a pull request.

Read [ROADMAP.md](ROADMAP.md) for phase scope and [ARCHITECTURE.md](ARCHITECTURE.md)
for package boundaries before making structural changes.

## Prerequisites

- **Bun 1.4.4** — pinned by `.bun-version`. Check with `bun --version`.
- **TypeScript 7.0.2** — installed by `bun install`; do not rely on a global
  `tsc`.
- Git.
- Node.js is not required.

CI is configured to validate the same gate on Linux and Windows. If you switch
between Windows and WSL, reinstall dependencies; native optional packages are
OS-specific (see [docs/development.md](docs/development.md)).

## Setup

```sh
bun install --frozen-lockfile
bun run validate
```

`bun run validate` is the same gate CI runs: build, the Biome quality gate
(format, lint, import order), type-check, tests with coverage, and the example
smoke test.

Run the example locally with:

```sh
bun run example
```

## Commands

| Command                 | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `bun run quality`       | Format, lint, and import-order check (CI gate)            |
| `bun run fix`           | Apply formatting, lint fixes, and import sorting          |
| `bun run format`        | Format with Biome (`--write`)                             |
| `bun run lint`          | Lint with Biome                                           |
| `bun run typecheck`     | Type-check all projects with the pinned TypeScript 7      |
| `bun test`              | Run unit and integration tests                            |
| `bun run test:coverage` | Tests with text and LCOV coverage, 90% threshold          |
| `bun run build`         | Bundle packages into `packages/*/dist`                    |
| `bun run smoke`         | Exercise the example over a real ephemeral socket         |
| `bun run bench`         | Run the baseline benchmark harness                        |
| `bun run clean`         | Remove generated build and coverage output                |

## Code conventions

- TypeScript only, with the strict settings in `tsconfig.json`. Do not weaken
  them to work around a problem without discussing it first.
- Use `import type` for type-only imports (`verbatimModuleSyntax` is on).
- Prefer small, explicit modules and named exports. Avoid default exports.
- Keep `@qutivex/core` free of runtime dependencies and Bun-specific APIs.
  Bun-specific behavior belongs in `@qutivex/http-bun`.
- No new runtime dependency without a short justification in an issue or RFC.
  Dev dependencies should be pinned exactly, and `bun.lock` committed.
- Public behavior needs a test. Bug fixes need a regression test.
- Public APIs need documentation and type-level tests where inference matters.
- Do not add performance claims or benchmark numbers without a reproducible
  methodology and recorded environment.

## Tests

The layout and rules are documented in [docs/testing.md](docs/testing.md).

- Unit tests live beside the package in `packages/<pkg>/test/`.
- Cross-package integration tests live in `tests/integration/`.
- Compile-time tests use `tests/types/*.test-d.ts` and are checked by `tsc`.
- Integration tests that need HTTP must bind port `0` (ephemeral) and close
  the server in `finally`.
- Coverage must stay at or above the 90% threshold configured in `bunfig.toml`.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, `ci:`, `build:`.
Keep commits focused. A pull request may contain multiple commits, but the
history should be reviewable.

## Pull requests

Before opening a pull request, confirm:

- [ ] `bun run validate` passes locally.
- [ ] New behavior has tests; fixed bugs have regression tests.
- [ ] Public behavior is documented.
- [ ] No secrets, credentials, generated `dist/`, `coverage/`, or
      platform-specific `node_modules` are committed.
- [ ] The change respects package boundaries (enforced by
      `tests/integration/workspace-boundaries.test.ts`).
- [ ] The PR description explains **why**, not only **what**.

Use the pull request template. Maintainers may ask for an RFC before accepting
changes that alter public API, package boundaries, or release policy.

## Security

Do not report vulnerabilities in public issues. Follow
[SECURITY.md](SECURITY.md).

## Licensing

Contributions are accepted under the repository's MIT license (inbound =
outbound), as decided in [ADR 0002](docs/decisions/0002-product-scope.md). No
contributor license agreement is required at this stage; this may change before
a public launch, and contributors will be asked to agree explicitly if it does.

## Code of conduct

Participation is covered by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
