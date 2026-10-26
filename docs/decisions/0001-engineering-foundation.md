# ADR 0001: Engineering foundation decisions

- **Status:** Accepted (Phase 1)
- **Date:** 2026-10-26
- **Deciders:** Qutivex maintainers
- **Supersedes:** none
- **Related:** [ROADMAP.md](../../ROADMAP.md) §3, §5 Phase 1, §13

## Context

Phase 1 must produce a reproducible monorepo with strict types, tests, lint,
CI, release/versioning policy, contribution docs, a pinned Bun version, and a
baseline benchmark harness. The roadmap intentionally leaves package names,
exact tooling, and release automation open until prototypes justify them.

At the time of this decision:

- Bun `1.4.4` is the pinned runtime; the Windows development environment already
  has it. The WSL environment initially reported `1.4.2` and must be upgraded
  with `bun upgrade`.
- TypeScript `7.0.2`, Biome `2.6.3`, and `@types/bun@1.4.4` are current.
- Bun `1.4.4`'s `bun check` works. Bun `1.4.2`'s version fails in a minimal
  project with `Script not found "check"`, which is one reason the pin moved
  forward.
- Bun's isolated linker hides Biome's optional platform binary from Node's
  resolver, so Biome cannot start.
- There is no public release, package, or user yet.

## Decisions

### 1. Bun-only, pinned to 1.4.4

Use Bun as runtime, package manager, test runner, and bundler. Pin `1.4.4` in
`.bun-version`, `packageManager`, `engines.bun`, CI, and documentation. Do not
build cross-runtime abstractions during Phase 1.

**Consequences:** local/CI behavior is reproducible and matches the Windows
development environment; the WSL environment must be upgraded from `1.4.2`;
Node-specific packages may fail and are not claimed to work; upgrading Bun is a
deliberate, reviewed change.

### 2. Bun workspaces with the hoisted linker

Use `workspaces: ["packages/*", "examples/*"]` and `linker = "hoisted"` in
`bunfig.toml`.

**Consequences:** tools that use Node resolution from package directories work
(for example Biome). The linker choice must be revisited if the dependency
graph grows enough that hoisting causes conflicts.

### 3. Scoped package names; no umbrella package yet

Name initial packages `@qutivex/core`, `@qutivex/router`, and
`@qutivex/http-bun`. Defer the public `qutivex` umbrella import until Phase 2's
`App` exists and the public API RFC has been reviewed.

**Consequences:** workspace imports are explicit and boundaries are visible.
Users will eventually get a shorter import; adding it later is not a breaking
change to the scoped packages.

### 4. Reference TypeScript compiler as the type-check gate

Use TypeScript `7.0.2` as a pinned dev dependency and `tsc --noEmit` for
`bun run typecheck`. Bun 1.4.4's `bun check` is available and works, but is not
the CI gate.

**Consequences:** inference correctness is judged by the reference compiler;
editors and CI share the same TypeScript major version; CI pays a small startup
cost; declaration emission can reuse the same compiler later. Adopting
`bun check` as the gate requires evidence that it matches `tsc` on the type-test
corpus across a stable release window.

### 5. Biome for formatting and linting

Use one pinned tool for both, with Markdown excluded from formatting.

**Consequences:** one configuration and one binary; Markdown prose is not
auto-reformatted, so roadmaps and guides keep intentional diffs; JSON and
TypeScript are consistently formatted.

### 6. Native `bun test` with a coverage gate

Use `bun test`, built-in coverage, and a 90% threshold in `bunfig.toml`. Run
tests with LCOV output in CI and upload it on Linux.

**Consequences:** no Jest/Vitest dependency; coverage failures block merges;
thresholds must be raised deliberately as the framework grows, never lowered
to land a feature.

### 7. Manual release process for now

Document a manual SemVer process instead of adding changesets. Keep packages
`private: true` at `0.0.0`.

**Consequences:** no release automation to maintain before a release exists;
the process is intentionally boring and must be exercised manually at `0.1.0`.
Revisit after the first public release.

### 8. MIT license, provisionally

Use MIT to satisfy the Phase 1 "clear license" requirement.

**Consequences:** the Phase 0 license and contribution-model decision remains
open and must be recorded before public launch. Changing the license later
requires contributor agreement and is easier before external contributions.
Until then, CONTRIBUTING states inbound = outbound MIT.

### 9. Source-first package exports, bundled `dist` in CI

Point package `exports` at `src/index.ts` with `types` and `import` conditions.
`bun run build` bundles each package to `dist` using Bun's bundler and
externalizes declared dependencies.

**Consequences:** workspace development needs no build step; Bun is required to
consume the source exports; final publish metadata and declaration generation
are deferred until packaging stabilizes. `private: true` prevents accidental
publication in the meantime.

### 10. The Phase 1 example uses plain `Bun.serve()`

Do not stub an `App` API to make the example look framework-native. Phase 1
proves tooling; Phase 2 proves the minimal HTTP core.

**Consequences:** the example is honest and small; it will be rewritten in
Phase 2; tests exercise both the handler directly and a real ephemeral socket.

### 11. Baseline-only benchmark harness

Add the harness and methodology in Phase 1, but measure only native Bun and
publish no numbers.

**Consequences:** the repository has a repeatable starting point before
optimization; no marketing claims can be derived from it; Phase 2 adds the
first framework scenario.

## Alternatives considered

| Alternative | Why not now |
| ----------- | ----------- |
| Pin Bun 1.4.2 | Its `bun check` is broken and the WSL install can be upgraded; there is no reason to build on a superseded patch. |
| Rely on `bun check` as the only gate | The reference compiler is the safer authority for a type-inference-focused framework and matches what editors run; revisit with evidence. |
| ESLint + Prettier | Two tools, more configuration, slower; Biome covers both with one pinned binary. |
| Changesets / release-please | Premature before any public package or version boundary exists. |
| Isolated linker | Breaks Biome's Node-based binary resolution; revisit when tooling is linker-aware. |
| `qutivex` umbrella package immediately | Would freeze an export surface before the public API RFC; scoped packages are enough for the prototype. |
| A stub `App` in Phase 1 | Blurs phase boundaries and risks locking a design that has not been reviewed. |

## Revisit triggers

- Bun pin upgrade or a decision to adopt `bun check` as the CI gate.
- First public release (release automation, publish metadata, license).
- Package boundary changes or a new optional module.
- Dependency conflicts caused by hoisting.
- Addition of a second runtime or a Node compatibility target.
- Any performance claim or CI performance gate.

## Consequences summary

Phase 1 optimizes for a small, honest, reproducible foundation. It deliberately
trades breadth for boundary clarity and defers API decisions to their phases.
The repository is expected to change as Phase 2 lands; this ADR records why the
foundation looks the way it does, not a permanent tooling mandate.
