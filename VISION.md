# 🌟 Qutivex Vision

> **A high-performance, batteries-included TypeScript framework for APIs, full-stack applications, and production AI systems.**

**Status:** Phase 0 complete · Phase 1 complete · Phase 2 complete · Phase 3 complete
**Document owner:** Qutivex maintainers
**Last updated:** 2026-10-26

---

## 💡 Why Qutivex?

TypeScript developers usually assemble a framework from many moving parts:
a router, a validator, an OpenAPI generator, an ORM, an auth system, a job
queue, an admin panel, and a separate stack for AI features. Each choice is
reasonable on its own, but the integration work is repetitive—and the AI layer
is often bolted on without budgets, approvals, or durable state.

Qutivex is an attempt to make the common path **simple, safe, and fast**:

- **Simple** — a tiny app is genuinely tiny.
- **Fast** — Bun is the runtime, and overhead is measured rather than assumed.
- **Batteries included** — routing, validation, OpenAPI, database, auth, admin,
  jobs, and AI primitives share one coherent model.
- **AI-native, not AI-only** — ordinary APIs stay small; AI features are
  optional, bounded, permissioned, and observable.

Qutivex is **not** a new JavaScript runtime, a new compiler, a replacement for
PostgreSQL, or a UI framework. It is the glue, defaults, and production
guardrails that are missing when you assemble those pieces yourself.

---

## 🎯 Product thesis

Developers should be able to move from an idea to a **typed, documented,
testable, operable service** without giving up control of their runtime,
database, or model provider.

Qutivex wins by combining:

1. **Developer experience** close to FastAPI's clarity, in TypeScript.
2. **Integrated defaults** inspired by Django's batteries.
3. **Measured performance** on Bun, with honest methodology.
4. **Safe AI execution** with tools, budgets, approvals, and durable workflows.
5. **Operational maturity**—security, health checks, logs, traces, migrations,
   compatibility policy, and upgrade paths.

---

## 👥 Who Qutivex is for

### Primary users

| User | What they need | What Qutivex should give them |
| --- | --- | --- |
| **API developer** | Typed routes, validation, docs, tests | One schema source for runtime and OpenAPI |
| **AI application developer** | Streaming, tools, structured output, retries | A provider-neutral, bounded AI runtime |
| **Small product team** | Auth, database, admin, jobs, deployment | Integrated defaults without assembling ten libraries |

### Secondary users

- Full-stack developers who want SSR, forms, static assets, and an integrated
  admin.
- Larger teams that need audit trails, policy controls, observability,
  migrations, and predictable releases.

---

## 🧩 Product principles

| Principle | What it means in practice |
| --- | --- |
| **Small core** | `@qutivex/core` has one first-party dependency (router), no third-party runtime dependencies, and no Bun API usage. |
| **Opt-in capabilities** | A minimal API never loads the ORM, admin, AI, or frontend code. |
| **One source of truth** | A validation schema drives runtime validation **and** OpenAPI. |
| **Explicit behavior** | No hidden queries, network calls, agent permissions, or serialization magic. |
| **Safe defaults** | Secure cookies, deny-by-default authorization, redacted errors, bounded agents. |
| **Standards first** | HTTP, OpenAPI, SQL, OpenTelemetry, Standard Schema, OWASP guidance. |
| **Adapter boundaries** | Databases, providers, queues, storage, and telemetry are replaceable. |
| **Measured performance** | Every claim names workload, versions, hardware, and method. |
| **Progressive complexity** | Hello world stays hello world; large apps can add modules. |

---

## 🚀 Core use cases

1. **JSON API in minutes** — routes, typed responses, consistent errors.
2. **Typed API with docs** — validation and OpenAPI from one schema.
3. **Database-backed product** — migrations, auth, roles, generated admin.
4. **Streaming AI endpoint** — provider fallback, usage limits, traceability.
5. **Durable agent/workflow** — pause, persist, resume, require approval.
6. **Full-stack web app** — server rendering and optional React.
7. **Production operations** — health, logs, metrics, traces, safe shutdown.

---

## 🏗️ Three reference applications

These are the concrete targets every phase is measured against. Details live in
[reference applications](docs/reference-apps.md).

| # | Application | Must prove |
| --- | --- | --- |
| 1 | **JSON CRUD API** with auth + PostgreSQL | Typed routes, validation, migrations, sessions, RBAC, tests |
| 2 | **AI chat/agent API** with streaming + tools | Provider abstraction, structured output, budgets, approvals, traces |
| 3 | **Server-rendered dashboard/admin** | Forms, sessions, CSRF, assets, admin screens, accessibility |

If a feature does not make one of these applications easier or safer, it is a
candidate to defer.

---

## 🧭 Build, integrate, or defer

The default answer is **integrate**, not reinvent. Qutivex owns the contracts,
the integration quality, and the production guardrails.

| Capability | Decision | Rationale |
| --- | --- | --- |
| HTTP server | **Build on Bun** | Native `Bun.serve()` is the point of being Bun-first. |
| Router | **Build thin, then measure** | Native route table first; custom router only with evidence. |
| Validation | **Integrate Standard Schema** | Reuse Zod/Valibot/TypeBox; no proprietary schema ecosystem. |
| OpenAPI | **Build generator** | The schema adapter boundary is ours; the document is standard. |
| ORM | **Integrate Drizzle** | A custom ORM is a separate product; no 1.0 ORM. |
| Auth | **Integrate vetted primitives** | Password hashing, JWT, OAuth via maintained libraries. |
| Admin | **Build** | A model-driven admin is a differentiator and must be permission-safe. |
| Jobs | **Contract + adapters** | Database/Redis backends; no new queue from scratch. |
| AI providers | **Stable adapter interface** | Reuse provider SDKs; avoid vendor lock-in. |
| Agents/workflows | **Build narrow runtime** | Bounded loops, durable state, approvals—not a model host. |
| Frontend | **Integrate React** | No new UI language or competing frontend framework. |
| Observability | **Integrate OpenTelemetry** | Standards beat a proprietary telemetry stack. |

Full competitor context: [competitive matrix](docs/competitive-matrix.md).

---

## 🚫 Non-goals for 1.0

- A new JavaScript runtime, compiler, package manager, or language.
- Replacing PostgreSQL, SQLite, Redis, object storage, or an LLM provider.
- Writing cryptography, password hashing, or JWT verification from scratch.
- A custom ORM, queue, or provider SDK when a maintained option exists.
- A React replacement or a new UI/template language.
- Running arbitrary model-generated code by default.
- A hosted cloud platform before the open-source framework has real users.
- Supporting every runtime at launch. Bun first; portability later, with evidence.

See [ROADMAP.md](ROADMAP.md) for the full phase plan.

---

## 📅 Release shape

| Release | User outcome |
| --- | --- |
| `0.1.0` | Minimal HTTP APIs: core, routes, context, middleware, CLI starter |
| `0.2.0` | Typed APIs: validation, inference, OpenAPI, test client |
| `0.3.0` | Maintainable apps: DI/plugins, settings, better CLI |
| `0.4.0` | Database-backed APIs: Drizzle, migrations |
| `0.5.0` | Authenticated apps: auth, authorization, security middleware |
| `0.6.0` | Admin/CRUD apps: admin panel, audit foundations |
| `0.7.0` | Production services: jobs, cache, storage, observability |
| `0.8.0` | AI endpoints: model APIs, tool calling |
| `0.9.0` | Durable agents/workflows beta, SSR preview |
| `1.0.0` | Stable core and supported scope with evidence |

Releases are gated by working end-to-end workflows, not package count. A feature
can remain tagged **experimental** even after 1.0.

---

## ✅ What success looks like

Qutivex succeeds in levels, not only at 1.0:

1. **Prototype** — an app runs; routes, JSON, errors, tests, and a benchmark
   harness work. ✅ *Phase 2*
2. **Useful API framework** — typed validation, OpenAPI, generator, CRUD.
3. **Batteries-included backend** — database, auth, admin, jobs.
4. **AI application platform** — providers, tools, bounded agents, durable
   workflows, approvals.
5. **Production-supported framework** — compatibility policy, security review,
   reproducible benchmarks, docs, real users upgrading.

### Evidence we look for

- Real projects beyond tutorials.
- Recurring issues that reveal actual usage.
- Third-party plugins built on stable contracts.
- Users upgrading between releases.
- Teams discussing production constraints with us.
- Willingness to pay for support, governance, or managed operations—only after
  users repeatedly ask for a problem such a service solves.

---

## 🧠 What "AI-native" means

It does **not** mean bundling a model or hosting one. It means:

- AI calls have provider-neutral APIs, streaming, and structured output.
- Tools are typed, permissioned, timed out, and audited.
- Agents are bounded by steps, tokens, time, and budget.
- Workflows can pause for human approval and resume after a restart.
- Prompts, tool calls, and outputs are traceable without logging secrets.
- AI remains an optional module for applications that never use it.

---

## 🔐 What "enterprise-ready" means

Not a checkbox or a marketing adjective. It means testable properties:

- Secure session, cookie, CSRF, CORS, and header defaults.
- RBAC plus object-level and field-level authorization.
- Audit records for sensitive mutations.
- Tenant isolation tests.
- Graceful shutdown, health checks, bounded queues, and resource limits.
- Redacted logs, traceable requests, and dependency vulnerability handling.
- A documented support matrix, deprecation policy, and security process.

Until independent review and release hardening exist, Qutivex will not claim to
be enterprise-ready.

---

## 📚 Related documents

- [Roadmap](ROADMAP.md) — phases, scope, release plan.
- [Architecture](ARCHITECTURE.md) — current system design.
- [Competitive matrix](docs/competitive-matrix.md) — honest comparison.
- [Reference applications](docs/reference-apps.md) — what we build toward.
- [Support policy](docs/support-policy.md) — versions and platforms.
- [RFCs](RFC/README.md) — public API, routing, validation, DI, database, AI,
  configuration.
- [Security policy](SECURITY.md) — reporting and current guarantees.

---

## 💚 One-sentence version

> **Qutivex makes TypeScript applications easier to start, safer to operate, and
> fast enough to compete—on Bun, with AI as a first-class, bounded capability.**
