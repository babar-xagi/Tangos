# ADR 0002: Phase 0 product and support decisions

- **Status:** Accepted
- **Date:** 2026-10-26
- **Supersedes:** ADR 0001 decision 8 (license) and the provisional support notes
- **Related:** [VISION.md](../../VISION.md), [support policy](../support-policy.md),
  [RFCs](../../RFC/README.md)

## Context

Phase 0 requires frozen scope, a license and contribution model, a support
policy, reference applications, a competitive baseline, and design RFCs before
committing to broad implementation. Phase 2 has already validated the public
API and adapter boundary in code.

## Decisions

### 1. Initial license: MIT

Qutivex uses the **MIT License** ([LICENSE](../../LICENSE)). Contributions are
inbound = outbound under MIT. No contributor license agreement is required at
this stage.

**Why:** lowest friction for adoption and contribution; compatible with the
ecosystem Qutivex integrates with; easy for companies to evaluate.

**Consequences:** the decision is recorded, no longer provisional. Changing it
later requires contributor agreement and is much harder after external
contributions. Revisit only before a public release if a compelling patent or
governance requirement appears.

### 2. Runtime: Bun-only through 0.x

Bun `1.4.4` is the pinned runtime. Node.js and other runtimes are unsupported.
Portability is revisited only after the API and package boundaries stabilize.

**Why:** native `Bun.serve()` is a core advantage; cross-runtime abstractions
would slow the design and weaken performance.

### 3. Support policy is explicit and evidence-based

The matrix is published in [support policy](../support-policy.md): Linux and
Windows CI; macOS best-effort until Phase 15; no Node; database/provider support
only after contract tests exist.

**Consequences:** no implied support because something "works on my machine".

### 4. Build/integrate/defer is frozen for 1.0 scope

| Area | Decision |
| --- | --- |
| HTTP engine | Build on `Bun.serve()` |
| Routing | Thin layer over Bun native routing; custom router only with evidence |
| Validation | Integrate Standard Schema (Zod, Valibot, TypeBox) |
| OpenAPI | Build generator from schema adapters |
| ORM | Integrate Drizzle; no custom ORM |
| Auth | Vetted libraries and framework security defaults |
| Admin | Build, permission-first |
| Jobs | Contracts + adapters |
| AI providers | Adapter interface over maintained SDKs |
| Agents/workflows | Build a narrow, bounded runtime |
| Frontend | Integrate React; no new UI language |
| Observability | OpenTelemetry-compatible |

### 5. AI is a first-class but optional module

AI and agent APIs are designed in RFC 0006, implemented in Phases 11–12, and
never loaded by a minimal API. The framework does not host models or promise
provider-specific behavior beyond adapters.

### 6. Public naming and umbrella package

Scoped packages (`@qutivex/core`, `@qutivex/http-bun`, `@qutivex/router`) are
internal building blocks. The public import is `qutivex`, created in Phase 2.
This keeps `import { App } from "qutivex"` simple without freezing every
internal package as public API.

### 7. Release scope follows vertical workflows

Shipping is gated by end-to-end use cases, not package count. The first public
`0.1.0` requires the minimal HTTP core, routing/context/middleware, CLI starter,
docs, tests, and a working example. See [ROADMAP.md](../../ROADMAP.md) §6.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Apache-2.0 | Stronger patent grant, but heavier process for a solo-led pre-release project; revisit before 1.0 if needed. |
| Dual license / open-core now | No users yet; commercial platform is premature. |
| Node + Bun compatibility layer | Would compromise the Bun-first architecture before the API stabilizes. |
| Custom ORM/schema/queue | Maintenance cost dwarfs the benefit; integration is the product. |
| No formal support policy | Creates implied guarantees the project cannot meet. |

## Consequences

- Phase 0 scope is frozen for implementation; new scope needs an RFC.
- The license and support policy are now documented commitments, not placeholders.
- Reference applications define what "done" means for later phases.
- Competitive claims remain internal planning material, not marketing.

## Revisit triggers

- Before `1.0.0` or the first external contribution requiring a CLA.
- A supported runtime, OS, database, or AI provider changes.
- A build-vs-integrate decision is challenged by measured evidence.
- A commercial offering is proposed.
