# Changelog

All notable changes to this repository are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
intends to follow [Semantic Versioning](https://semver.org/) once it has a
published release.

## [Unreleased]

### Added

#### Phase 2 — Minimal HTTP core

- Public `qutivex` package: `new App()` with the Bun adapter wired in.
- `@qutivex/core` application core:
  - lifecycle states (`created`, `configured`, `starting`, `running`,
    `stopping`, `stopped`, `failed`),
  - exact-match route table for GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD,
  - JSON, string, `Response`, and `204` return semantics,
  - consistent error envelope and safe 500s,
  - graceful shutdown hooks with idempotent, concurrent-safe stop,
  - configurable host/port and ephemeral ports,
  - development banner, disabled in production by default.
- `@qutivex/http-bun` adapter around `Bun.serve()`, including startup error
  wrapping and `reusePort: false`.
- `app.fetch()` for socket-free testing and future test-client use.
- Real-socket integration tests: port conflicts, concurrent requests, aborted
  clients, HEAD behavior, and repeated shutdown.
- Benchmark harness now compares native Bun JSON and a Qutivex JSON route
  (still no published performance claims).
- 89 tests, 100% function/line coverage.

#### Phase 0 — Product definition and technical specification

- [`VISION.md`](VISION.md): product thesis, personas, principles, non-goals,
  success criteria, and build/integrate/defer decisions.
- [`docs/competitive-matrix.md`](docs/competitive-matrix.md): capability
  comparison, explicitly not a benchmark.
- [`docs/reference-apps.md`](docs/reference-apps.md): the three applications
  every phase targets.
- [`docs/support-policy.md`](docs/support-policy.md): Bun/TypeScript/OS support
  and future integration policy.
- RFCs 0001–0007: public API, routing, validation/OpenAPI, plugins/DI,
  database, AI/agents, and configuration.
- [ADR 0002](docs/decisions/0002-product-scope.md): MIT license, support policy,
  build-vs-integrate scope.
- Phase checklists for Phases 0, 1, and 2.

#### Phase 1 — Engineering foundation

- Bun workspace monorepo pinned to Bun 1.4.4.
- Strict TypeScript 7.0.2 configuration and `bun run typecheck`.
- Biome 2.6.3 quality gate (format, lint, import ordering).
- `bun test` unit, integration, and type-level tests with a 90% coverage
  threshold.
- GitHub Actions CI for Linux and Windows: frozen install, quality, type-check,
  coverage, build, and example smoke test.
- Benchmark harness, release process, ADRs, testing guide, and policy tests.
- Contributor guide, code of conduct, security policy, issue/PR templates, and
  MIT license.

### Changed

- `examples/hello` now uses the real `App` API instead of a plain `Bun.serve()`
  handler.
- The public umbrella package `qutivex` is the recommended import; internal
  `@qutivex/*` packages remain implementation details.
- Quality gate consolidated on `biome ci` via `bun run quality`.

### Security

- Internal error messages, stacks, and causes are never serialized to clients.
- Error responses use `Cache-Control: no-store`.
- Bun's `SO_REUSEPORT` is explicitly disabled to make port conflicts visible.
- MIT license finalized, replacing the provisional Phase 1 note.

### Notes

- No performance numbers are claimed. See [BENCHMARKS.md](BENCHMARKS.md).
- No npm release exists yet; all packages are private at `0.0.0`.
