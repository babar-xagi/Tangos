# ✅ Phase 0 — Product definition and technical specification

> **Status:** Complete · **Completed:** 2026-10-26
> Phase 0 is documentation and decisions only. It froze the first-release scope
> before implementation drifted.

## 🎯 Goal

Prevent scope drift and resolve the major architectural questions before
building the framework.

---

## 📋 Work items

| Work item | Status | Evidence |
| --- | :---: | --- |
| Write the product statement and target personas | ✅ | [VISION.md](../VISION.md) |
| Define three reference applications | ✅ | [Reference applications](reference-apps.md) |
| Competitor capability matrix (Elysia, Hono, Fastify, AdonisJS, NestJS, FastAPI, Django, Mastra) | ✅ | [Competitive matrix](competitive-matrix.md) |
| Decide build / integrate / defer per feature | ✅ | [VISION](../VISION.md#-build-integrate-or-defer), [ADR 0002](decisions/0002-product-scope.md) |
| Decide initial license and contribution model | ✅ | MIT in [ADR 0002](decisions/0002-product-scope.md), [LICENSE](../LICENSE) |
| Define support policy (Bun, OS, database, TypeScript) | ✅ | [Support policy](support-policy.md) |
| Write the required RFCs | ✅ | [RFC 0001–0007](../RFC/README.md) |
| Define initial benchmark hardware and workloads | ✅ | [BENCHMARKS.md](../BENCHMARKS.md) |
| Define the strict non-goals for the first public release | ✅ | [VISION](../VISION.md#-non-goals-for-10), [ROADMAP](../ROADMAP.md) |

---

## 🧠 Key decisions

| # | Question | Decision |
| --- | --- | --- |
| 1 | Bun-only or compatibility from day one? | **Bun-only** during 0.x. |
| 2 | Decorators or fluent route API? | **Fluent API**; no decorators/reflection. |
| 3 | Custom router or Bun native routing? | **Bun native first**; custom only with measured evidence. |
| 4 | Own ORM or Drizzle? | **Integrate Drizzle**; no custom ORM. |
| 5 | Own AI provider clients? | **Stable adapter interface** over maintained SDKs. |
| 6 | What does "native AI" mean? | First-class APIs/lifecycle, not model hosting. |
| 7 | What does "enterprise-ready" mean? | Testable security, reliability, compatibility, and operations requirements. |

---

## 📦 Deliverables

- [VISION.md](../VISION.md) — thesis, users, principles, non-goals, success.
- [ROADMAP.md](../ROADMAP.md) — phases, scope, releases.
- [ARCHITECTURE.md](../ARCHITECTURE.md) — current system and boundaries.
- [RFC 0001 — Public API](../RFC/0001-public-api.md)
- [RFC 0002 — Routing](../RFC/0002-routing.md)
- [RFC 0003 — Validation + OpenAPI](../RFC/0003-validation-openapi.md)
- [RFC 0004 — Plugins + DI](../RFC/0004-plugin-di.md)
- [RFC 0005 — Database + migrations](../RFC/0005-database.md)
- [RFC 0006 — AI, agents, workflows](../RFC/0006-ai-agents.md)
- [RFC 0007 — Configuration + settings](../RFC/0007-configuration.md)
- [BENCHMARKS.md](../BENCHMARKS.md) — methodology and reference hardware.
- [SECURITY.md](../SECURITY.md) — policy and current guarantees.
- [ADR 0002](decisions/0002-product-scope.md) — license, support, scope.

---

## 🚪 Exit criteria

| Criterion | Evidence |
| --- | --- |
| A developer can explain Qutivex in one sentence | [VISION one-sentence](../VISION.md#-one-sentence-version) |
| MVP scope and non-goals are explicit | VISION + ADR 0002 |
| Critical interfaces and package dependencies are documented | RFC 0001, RFC 0002, ARCHITECTURE |
| Original work vs integrations is identifiable | VISION build/integrate table, RFC 0005/0006 |

**Result:** ✅ met.

---

## 🧾 Notes and limitations

- Reference applications are **specified**, not implemented. They are targets
  for Phases 4–9.
- No performance numbers are published. Only the harness and methodology exist.
- The competitive matrix is internal planning material; it ages quickly and is
  not marketing.
- Phase 0 was finalized alongside the Phase 2 implementation so the public API
  RFC records what was actually validated in code.

---

## ➡️ Next

Phase 1 (engineering foundation) and Phase 2 (minimal HTTP core) are already
complete. Phase 3 begins routing/context/middleware.
