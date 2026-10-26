# Changelog

All notable changes to this repository are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
intends to follow [Semantic Versioning](https://semver.org/) once it has a
published release.

## [Unreleased]

### Added

- Bun workspace monorepo pinned to Bun 1.4.4.
- Initial packages `@qutivex/core`, `@qutivex/router`, and `@qutivex/http-bun`
  as empty Phase 1 scaffolds with documented phase ownership.
- Strict TypeScript 7.0.2 configuration and `bun run typecheck`.
- Biome 2.6.3 formatting and linting for TypeScript, JavaScript, and JSON.
- `bun test` unit, integration, and type-level tests with a 90% coverage
  threshold.
- GitHub Actions CI for Linux and Windows: install, format, lint, type-check,
  test with coverage, build, and example smoke test.
- Minimal Phase 1 example (`examples/hello`) and a real-socket smoke test.
- Baseline-only HTTP benchmark harness, explicitly publishing no performance
  claims.
- Manual release process, architecture decision record, testing guide, phase 1
  delivery checklist, and repository policy tests.
- Contributor guide, code of conduct, security policy, issue templates, pull
  request template, and provisional MIT license.
