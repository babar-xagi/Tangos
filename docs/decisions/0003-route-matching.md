# ADR 0003: Route matching implementation

- **Status:** Accepted (Phase 3)
- **Date:** 2026-10-26
- **Deciders:** Qutivex maintainers
- **Related:** [RFC 0002](../../RFC/0002-routing.md), [Phase 3 checklist](../phase-3-checklist.md)

## Context

Phase 3 requires path parameters, wildcards, deterministic priority, route
introspection, groups, metadata, and 405 behavior. The roadmap originally
recommended using Bun's native route table where possible.

Implementation constraints:

- Core is runtime-agnostic and must not call `Bun.*`.
- The adapter boundary accepts one `fetch(request)` function; Bun's route table
  is configured at `Bun.serve()` startup.
- Qutivex needs route matching before the adapter (for in-process `app.fetch`,
  introspection, 405, and WebSocket upgrades).
- Route registration must be validated and frozen before startup.
- Performance has not yet been measured against native routing.

## Decision

Implement a small **pattern compiler and matcher** in `@qutivex/router`:

- Static, `:param`, and terminal `*` wildcard segments.
- Static > param > wildcard priority, left to right.
- Exact trailing-slash behavior.
- Conflict keys independent of parameter names.
- Deterministic, dependency-free, and usable by both HTTP and WebSocket routes.

`@qutivex/core` depends on `@qutivex/router`, making it the only runtime
dependency of core. Core still has no third-party dependencies and no `Bun.*`
usage.

We did **not** build a radix tree or a regex router. The matcher is a linear scan
over parameterized/wildcard routes, with exact static routes in a map.

## Consequences

### Positive

- One matching model for in-process requests, live HTTP, and WebSocket upgrades.
- Deterministic precedence and conflict diagnostics.
- Route metadata and 405 support without adapter-specific hacks.
- Core remains testable with a fake adapter and free of Bun APIs.
- Static routes stay fast (map lookup); only dynamic routes scan.

### Negative

- Duplicates some capability Bun's native router may provide.
- Adds one first-party package dependency to core.
- Linear scan for dynamic routes may degrade with very large route tables.
- Native Bun routing could be faster; we cannot claim otherwise yet.

### Follow-up

- Add routing benchmarks: native Bun table vs Qutivex static/param/wildcard.
- If native routing wins materially, migrate the adapter while keeping the
  `RouteTable` contract and behavior.
- Revisit a trie only if measured route counts justify it.

## Alternatives considered

| Alternative | Why not now |
| --- | --- |
| Bun native route table only | Tied to the adapter; cannot power `app.fetch`, introspection, or WS matching cleanly. |
| Custom radix tree | Premature complexity without measured need. |
| Regex router | Slower, harder to type, easier to write unsafe patterns. |
| File-system routing | Not the explicit API Qutivex promises. |

## Revisit triggers

- Routing benchmarks show a material gap to native Bun.
- A supported route table grows large enough that linear scan is measurable.
- Bun exposes a usable route-matching API independent of `Bun.serve()`.
- A routing feature (optional params, regex constraints) cannot be expressed
  cleanly in the current matcher.
