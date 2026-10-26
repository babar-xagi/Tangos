# 📚 Qutivex docs

Welcome! Start with the path that matches you.

## 🚀 I want to run something

1. [Quickstart](quickstart.md) — install, run the example, write your first app.
2. [App API](api/app.md) — routes, handlers, lifecycle, shutdown.
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

- [RFC 0001 — Public API](../RFC/0001-public-api.md) ✅
- [RFC 0002 — Routing](../RFC/0002-routing.md) ✅
- [RFC 0003 — Validation + OpenAPI](../RFC/0003-validation-openapi.md) ✅
- [RFC 0004 — Plugins + DI](../RFC/0004-plugin-di.md) ✅
- [RFC 0005 — Database + migrations](../RFC/0005-database.md) ✅
- [RFC 0006 — AI, agents, workflows](../RFC/0006-ai-agents.md) ✅
- [RFC 0007 — Configuration + settings](../RFC/0007-configuration.md) ✅

## 📦 Phase records

| Phase | Result | Record |
| --- | --- | --- |
| 0 | Product definition + technical specs | [Checklist](phase-0-checklist.md) |
| 1 | Repository + engineering foundation | [Checklist](phase-1-checklist.md) |
| 2 | Minimal HTTP core | [Checklist](phase-2-checklist.md) |
| 3 | Routing, context, middleware | 🚧 next |

## 🗺️ Status at a glance

```text
Phase 0  ██████████  ✅ complete
Phase 1  ██████████  ✅ complete
Phase 2  ██████████  ✅ complete
Phase 3  ░░░░░░░░░░  🚧 next
Phase 4+ ░░░░░░░░░░  ⏳ planned
```

> Qutivex is pre-alpha. Only the Phase 2 HTTP core is implemented; everything
> else in the roadmap is a design or a later phase.
