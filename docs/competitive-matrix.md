# 🆚 Competitive matrix

This is a **capability and positioning** comparison, not a benchmark. It is
written to keep Qutivex honest about what already exists and what it must earn.

**Legend:** ✅ built in · 🔌 integration/plugin · ◐ partial or opinionated ·
❌ not a goal · 🧪 planned in Qutivex

> Qutivex is pre-alpha (`0.0.0`). Mature frameworks below have years of
> production use. Nothing here claims Qutivex is equivalent today.

## Runtime and philosophy

| Framework | Runtime | Primary language | Core philosophy |
| --- | --- | --- | --- |
| **Qutivex** 🧪 | Bun | TypeScript | Batteries + AI primitives with a small core |
| **Elysia** | Bun | TypeScript | Ergonomic, type-driven Bun framework |
| **Hono** | Bun, Node, Deno, Workers | TypeScript | Tiny, portable, standards-first HTTP |
| **Fastify** | Node.js | JavaScript/TypeScript | Fast, schema-driven Node server |
| **AdonisJS** | Node.js | TypeScript | Batteries-included MVC framework |
| **NestJS** | Node.js | TypeScript | DI + decorators + modular architecture |
| **FastAPI** | Python | Python | Type hints → validation + OpenAPI |
| **Django** | Python | Python | Batteries-included web framework |
| **Mastra** | Node.js | TypeScript | AI agents, workflows, evals |

## Capability comparison

| Capability | Qutivex 🧪 | Elysia | Hono | Fastify | AdonisJS | NestJS | FastAPI | Django | Mastra |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Typed routing | 🧪 | ✅ | ✅ | ◐ | ✅ | ✅ | ✅ | ◐ | ❌ |
| Request validation | 🧪 | ✅ | 🔌 | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ |
| OpenAPI generation | 🧪 | 🔌 | 🔌 | 🔌 | ◐ | ✅ | ✅ | 🔌 | ❌ |
| First-class DI | 🧪 | ◐ | ❌ | ◐ | ✅ | ✅ | ◐ | ◐ | ◐ |
| ORM / migrations | 🧪 Drizzle | 🔌 | 🔌 | 🔌 | ✅ Lucid | 🔌 | 🔌 | ✅ ORM | ❌ |
| Auth / sessions | 🧪 | 🔌 | 🔌 | 🔌 | ✅ | 🔌 | 🔌 | ✅ | ❌ |
| Automatic admin | 🧪 | ❌ | ❌ | ❌ | ❌ | ❌ | 🔌 | ✅ | ❌ |
| Background jobs | 🧪 | 🔌 | 🔌 | 🔌 | 🔌 | 🔌 | 🔌 | 🔌 | ◐ |
| AI providers | 🧪 | 🔌 | 🔌 | 🔌 | 🔌 | 🔌 | 🔌 | 🔌 | ✅ |
| Agents + tools | 🧪 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Durable workflows | 🧪 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| SSR / full-stack | 🧪 | 🔌 | 🔌 | 🔌 | ✅ | ◐ | 🔌 | ✅ | ❌ |
| Multi-runtime | ❌ Bun-first | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Production maturity | ❌ pre-alpha | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🧪 emerging |

## What Qutivex is not trying to beat

- **Hono** on portability and minimal footprint. Qutivex is Bun-first and
  accepts that trade-off.
- **Fastify** on Node ecosystem depth.
- **Django** on two decades of batteries and admin maturity.
- **Mastra** on standalone AI orchestration breadth.
- **Elysia** on single-runtime ergonomics today; Qutivex must earn its place
  through integration quality, safety, and measured performance—not slogans.

## Where Qutivex intends to differentiate

1. **FastAPI-like typed DX on Bun** — one schema drives validation and OpenAPI.
2. **Django-like integration** — auth, admin, jobs sharing one permission model.
3. **AI with production guardrails** — budgets, approvals, durable state,
   traceable tools, tenant-aware retrieval.
4. **Performance honesty** — reproducible methodology, no cherry-picked claims.
5. **Operational defaults** — graceful shutdown, readiness, structured errors,
   audit events, and a compatibility policy.

## Decisions this comparison drove

- **No custom ORM.** Integrate Drizzle (RFC 0005).
- **No custom schema library.** Use Standard Schema adapters (RFC 0003).
- **No custom AI SDK.** Stable provider adapters over maintained SDKs (RFC 0006).
- **No custom router before benchmarks.** Use Bun's native routing (RFC 0002).
- **No frontend framework.** Integrate React; do not replace it.

## Sources

Framework documentation and public capability pages:

- Elysia: <https://elysiajs.com/>
- Hono: <https://hono.dev/>
- Fastify: <https://fastify.dev/docs/latest/>
- AdonisJS: <https://docs.adonisjs.com/>
- NestJS: <https://docs.nestjs.com/>
- FastAPI: <https://fastapi.tiangolo.com/>
- Django: <https://docs.djangoproject.com/>
- Mastra: <https://mastra.ai/docs>

Comparisons age quickly. Re-check versions and capabilities before publishing
any external comparison; this matrix is an internal planning tool.
