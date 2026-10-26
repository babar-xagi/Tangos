# 📚 Qutivex docs

Welcome! Start with the path that matches you.

## 🚀 I want to run something

1. [Quickstart](quickstart.md) — install, run the example, write your first app.
2. [App API](api/app.md) — routes, context, middleware, bodies, SSE, WebSockets.
3. [Errors](api/errors.md) — consistent error responses.

## 🧑‍💻 I want to contribute

1. [Development guide](development.md) — toolchain, commands, Windows/WSL.
2. [Testing guide](testing.md) — test layers and coverage rules.
3. [Architecture](../ARCHITECTURE.md) — package boundaries and request flow.
4. [Contributing](../CONTRIBUTING.md) — process, commits, PR checklist.
5. [ADRs](decisions/README.md) — why the foundation looks like this.

## 🧭 I want the product context

- [Vision](../VISION.md) — thesis, users, non-goals, success.
- [Roadmap](../ROADMAP.md) — phases and releases.
- [Competitive matrix](competitive-matrix.md) — honest ecosystem comparison.
- [Reference applications](reference-apps.md) — the three target apps.
- [Support policy](support-policy.md) — versions, OSes, guarantees.
- [Security policy](../SECURITY.md) — reporting and current guarantees.
- [Benchmarks](../BENCHMARKS.md) — methodology, no hype.

## 📐 I want the design decisions

- [RFC 0001 — Public API](../RFC/0001-public-api.md) ✅ implemented
- [RFC 0002 — Routing](../RFC/0002-routing.md) ✅ implemented
- [RFC 0003 — Validation + OpenAPI](../RFC/0003-validation-openapi.md) ⏳ Phase 4
- [RFC 0004 — Plugins + DI](../RFC/0004-plugin-di.md) ⏳ Phase 6
- [RFC 0005 — Database + migrations](../RFC/0005-database.md) ⏳ Phase 7
- [RFC 0006 — AI, agents, workflows](../RFC/0006-ai-agents.md) ⏳ Phase 11–12
- [RFC 0007 — Configuration + settings](../RFC/0007-configuration.md) ⏳ Phase 5

## 📦 Phase records

| Phase | Result | Record |
| --- | --- | --- |
| 0 | Product definition + technical specs | [Checklist](phase-0-checklist.md) |
| 1 | Repository + engineering foundation | [Checklist](phase-1-checklist.md) |
| 2 | Minimal HTTP core | [Checklist](phase-2-checklist.md) |
| 3 | Routing, context, middleware, HTTP | [Checklist](phase-3-checklist.md) |
| 4 | Validation, inference, OpenAPI | 🚧 next |

## 🗺️ Status at a glance

```text
Phase 0  ██████████  ✅ complete
Phase 1  ██████████  ✅ complete
Phase 2  ██████████  ✅ complete
Phase 3  ██████████  ✅ complete
Phase 4  ░░░░░░░░░░  🚧 next
Phase 5+ ░░░░░░░░░░  ⏳ planned
```

> Qutivex is pre-alpha. Only Phases 0–3 are implemented. Everything else in the
> roadmap is a design or a later phase.
