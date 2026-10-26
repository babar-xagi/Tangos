# 🛟 Support policy

> **Status:** pre-release (`0.0.0`). No version is production-supported yet.

This policy exists so users and contributors know what is tested and what is
best-effort. It will become stricter before the first public release.

## Version support

| Component | Supported now | Notes |
| --- | --- | --- |
| **Qutivex** | `0.0.x` development only | No security support, no API stability guarantee. |
| **Bun** | `1.4.4` (pinned) | CI, examples, and docs use exactly this version. |
| **TypeScript** | `7.0.2` (pinned) | Used for type-checking and editor parity. |
| **Biome** | `2.6.3` (pinned) | Formatter, linter, import ordering. |
| **Node.js** | ❌ not supported | Bun is the runtime. |
| **pnpm / npm / Yarn** | ❌ not supported for development | Bun workspaces and `bun.lock` are canonical. |

Bun and TypeScript pins live in [`.bun-version`](../.bun-version),
`package.json`, and `bun.lock`. Changing a pin is a reviewed change with a
matching CI update.

## Operating systems

| OS | Current status | Target |
| --- | --- | --- |
| **Linux** | ✅ CI (`ubuntu-latest`) | Tier 1 |
| **Windows** | ✅ CI (`windows-latest`), native and WSL | Tier 1 |
| **macOS** | 🟡 expected to work, not in CI | Tier 2 until Phase 15 |
| **Other** | ❌ untested | Not promised |

Windows and WSL do not share platform-specific `node_modules`; reinstall after
switching environments. See [development](development.md).

## Databases, providers, and services

These are **planned integrations**, not supported features yet:

- PostgreSQL: first production target for the database phase.
- SQLite: local development and tests where behavior matches.
- MySQL: considered only after adapter tests and user demand.
- Redis/Valkey: considered for cache/queues after compatibility tests.
- AI providers: first adapters chosen by real user demand, with compatibility
  tests against pinned SDKs.

"Supported" will mean: a pinned version, contract tests in CI, documented
limitations, and a named maintainer.

## Runtime guarantees (future releases)

Once `0.1.0` is published, the intent is:

- **SemVer** with `0.y.z` pre-1.0 semantics.
- **Deprecation before removal**, with a documented replacement and migration
  note.
- **Supported Bun/TypeScript matrix** updated per release.
- **Security fixes** for supported lines; unsupported lines receive upgrades
  only.
- **No silent behavior changes** to security defaults.

Until then, the only guarantee is: **the repository's CI passes at the pinned
toolchain on a given commit.**

## Reporting security issues

Do not open a public issue. See [SECURITY.md](../SECURITY.md).

## Updating this policy

This policy is reviewed:

- before every minor release;
- when a runtime, database, or provider pin changes;
- when a new platform enters or leaves CI;
- before any "production-ready" or "enterprise-ready" claim.
