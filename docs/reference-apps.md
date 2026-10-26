# 🏗️ Reference applications

Qutivex is measured against three end-to-end applications. They are not demos
of isolated features; each must pass CI and stay runnable as the framework
evolves.

> **Status:** specifications complete (Phase 0). Implementations follow the
> phases noted below. No reference application is complete yet.

---

## 1️⃣ JSON CRUD API with authentication and PostgreSQL

**Target phase:** 0.4 / 0.5
**Purpose:** prove the core API workflow that most teams need first.

### Scope

- Users, organizations, and projects (tenant-scoped).
- Register, login, logout, refresh/session invalidation.
- CRUD endpoints for projects with typed validation.
- Pagination, filtering, and sorting.
- Role checks: owner, admin, member.
- OpenAPI docs generated from the same schemas.
- Integration tests against PostgreSQL and SQLite where parity allows.

### Success criteria

- Every endpoint has runtime validation and accurate OpenAPI.
- Authorization is deny-by-default at the route and object level.
- Tenant boundaries are tested, including list, detail, and search paths.
- Migrations run from a clean database and roll forward safely.
- The app shuts down gracefully and drains in-flight requests.
- No secret appears in logs, errors, or generated docs.

### What it proves

Schema-to-OpenAPI flow, database lifecycle, migrations, sessions, RBAC, tenant
isolation, and operational behavior.

---

## 2️⃣ AI chat/agent API with streaming and tools

**Target phase:** 0.8 / 0.9
**Purpose:** prove that AI features are production features, not a demo loop.

### Scope

- Threaded chat with streaming responses.
- Provider fallback (at least two providers through one contract).
- Structured output validated by a Qutivex schema.
- Tools: typed local function, permissioned HTTP tool.
- Per-user token and cost budgets; concurrency limits.
- Human approval for one high-impact tool.
- Durable workflow that can pause, persist, and resume after restart.
- Usage, latency, and tool-call traces without storing sensitive content.
- Mock provider for deterministic tests.

### Success criteria

- A tool invocation cannot bypass schemas or permissions.
- Agent loop is bounded by steps, tokens, wall-clock time, and budget.
- Prompt injection cannot change system policy or tool permissions.
- Approval state survives a process restart.
- Cancellation propagates to the provider and stops tool calls.
- Tests cover allow/deny, budget exhaustion, timeout, and resumption.

### What it proves

Provider abstraction, streaming, structured output, tool safety, budgets,
approvals, durable workflows, and AI observability.

---

## 3️⃣ Server-rendered dashboard/admin application

**Target phase:** 0.6 / 1.0 preview
**Purpose:** prove Qutivex is useful beyond JSON APIs without becoming a
frontend framework.

### Scope

- Session-authenticated dashboard with server-rendered pages.
- Forms with server-side validation and CSRF protection.
- Static assets with cache headers.
- Admin screens for two related models.
- Role-restricted actions and field-level visibility.
- Audit history for sensitive edits.
- Accessible, keyboard-navigable admin UI.
- Optional React island/SSR experiment—not required for the base admin.

### Success criteria

- Forms are validated on the server; client checks are additive.
- CSRF and session defaults are secure.
- Destructive bulk actions require confirmation and permission.
- Admin list/detail/search queries respect tenant boundaries.
- The basic admin needs no separate frontend build.
- Accessibility checks pass for core flows.

### What it proves

Full-stack rendering, forms, security defaults, admin integration, and
accessibility.

---

## Shared requirements

Every reference application must have:

- [ ] A documented setup from a clean checkout.
- [ ] CI that runs type-check, tests, and build.
- [ ] A migration/seed path where a database is used.
- [ ] An end-to-end test of its primary workflow.
- [ ] A security review appropriate to its surface.
- [ ] Reproducible deployment instructions.
- [ ] No dependency on unpublished local state or secrets.

## Current repository examples

`examples/hello` is a **toolchain example**, not one of the reference
applications. It proves the core HTTP path works end to end. See
[Phase 2 checklist](phase-2-checklist.md).
