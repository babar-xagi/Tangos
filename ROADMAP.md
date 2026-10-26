# Qutivex — Full Product & Engineering Roadmap

> **Working description:** A Bun-first, TypeScript-native, modular full-stack application framework with a FastAPI-like developer experience, Django-inspired batteries, built-in AI/agent primitives, and measurable performance goals.
>
> **Document status:** Proposed roadmap / living technical plan  
> **Version:** 1.0-draft  
> **Prepared:** 26 October 2026  
> **Initial runtime target:** Bun  
> **Project type:** Open-source framework, with a possible commercial platform later

---

## 0. Executive decision

Qutivex should be built as a **modular application framework**, not as a collection of unrelated features and not as a new JavaScript runtime.

The product promise is:

1. **Fast by default:** use Bun's native HTTP capabilities and keep framework overhead small and measurable.
2. **Simple to start:** a new application has three primary application files: `main.ts`, `settings.ts`, and `config.toml`.
3. **Batteries included:** routing, validation, dependency injection, OpenAPI/Swagger, database integration, authentication, permissions, admin, background jobs, and operations tooling.
4. **AI-native:** consistent model-provider APIs, streaming, structured outputs, tools, agents, workflows, durable execution, memory, approvals, and evaluation hooks.
5. **Enterprise-minded:** security controls, audit trails, observability, deployment guidance, compatibility policy, and production testing.
6. **Modular:** a small core; optional capabilities should not impose their full runtime cost on a simple API.

### The reality check

The full vision is ambitious. A credible, secure, maintained alternative to mature frameworks is not a three-month solo project. The roadmap is staged so that useful releases can ship before every capability exists.

A realistic solo-developer planning range for a credible broad 1.0 is **roughly 9–18+ months**, depending on available weekly hours, scope discipline, testing depth, and whether integrations are reused rather than reimplemented. This is a planning range, not a delivery promise.

### What Qutivex is not

- Not a replacement for Bun, JavaScriptCore, TypeScript, a database engine, or an LLM provider.
- Not an attempt to write a custom ORM, cryptography library, package manager, compiler, or frontend language in version 1.
- Not a promise to beat every framework on every benchmark.
- Not a framework that loads the ORM, admin UI, AI runtime, and observability stack for every small endpoint.

---

## 1. Product definition

### 1.1 Target users

**Primary users**

- TypeScript developers building APIs and backend services.
- Developers building AI applications, RAG services, and agent-powered products.
- Small teams that want integrated defaults without assembling many libraries themselves.

**Secondary users**

- Full-stack developers who want server-rendered pages, forms, static assets, and an integrated admin.
- Larger engineering teams that need policy controls, audit logs, observability, migrations, and predictable releases.

### 1.2 Core use cases

1. Create a JSON API in minutes.
2. Build a typed API with request validation and generated OpenAPI documentation.
3. Build a database-backed application with migrations, auth, authorization, and generated admin screens.
4. Deploy an AI endpoint with streaming, provider fallback, usage limits, and traceability.
5. Run a long-lived agent or workflow that can pause, persist state, resume after a restart, and request human approval.
6. Build a full-stack web application with server-rendered pages and optional React integration.
7. Operate an application in production with health checks, structured logs, metrics, traces, safe shutdown, and documented upgrades.

### 1.3 Product principles

| Principle | Engineering interpretation |
|---|---|
| Small core | Core package must not import ORM, admin, AI providers, or frontend packages. |
| Opt-in capabilities | Features are activated by imports/configuration and are not loaded unnecessarily. |
| One source of truth | Validation schemas should drive request validation and OpenAPI generation. |
| Explicit behavior | No surprising hidden database queries, hidden network calls, or implicit agent permissions. |
| Safe defaults | Security-sensitive behavior is secure by default and documented. |
| Standards first | Prefer HTTP, OpenAPI, SQL, OpenTelemetry, and established security standards. |
| Adapter boundaries | Databases, providers, storage, queues, and telemetry exporters are replaceable. |
| Measured performance | Every performance claim must specify workload, versions, hardware, and method. |
| Progressive complexity | The simplest application stays simple; complex applications can add modules. |

### 1.4 Initial positioning

Do not position Qutivex as merely “another fastest Bun framework.” The more defensible product statement is:

> **A high-performance, batteries-included TypeScript framework for APIs, full-stack applications, and production AI systems.**

The differentiation must be demonstrated through the combination of developer experience, integration quality, safe AI execution, operational maturity, and benchmark results—not feature count alone.

---

## 2. Scope and non-goals

### 2.1 Included in the long-term vision

- Bun-first runtime support.
- Native HTTP server integration and optimized routing registration.
- Routing, middleware, lifecycle hooks, request context, streaming, WebSockets.
- Type-safe request/response schemas and automatic OpenAPI documentation.
- Dependency injection and plugin/module system.
- CLI, project generator, dev server, testing utilities, and route inspection.
- Database integration, migrations, model metadata, admin UI, and transactions.
- Authentication, authorization, sessions, security middleware, and audit events.
- Background jobs, schedulers, cache, file storage adapters, and email adapters.
- AI providers, tool calling, streaming, structured outputs, agents, workflows, durable state, memory, approvals, and evaluation hooks.
- Full-stack rendering, static assets, forms, and optional React integration.
- Observability, health checks, deployment recipes, security testing, compatibility policy, and release management.

### 2.2 Explicit non-goals for 1.0

- Writing a new JS runtime or compiler.
- Replacing PostgreSQL, SQLite, Redis, or object storage.
- Writing cryptographic algorithms from scratch.
- Replacing React or inventing a new UI language.
- Supporting every JavaScript runtime at the first release. Bun is the initial target; portability is a later, evidence-driven decision.
- Implementing every LLM provider separately if a maintained provider adapter can be reused safely.
- Building a hosted cloud platform before the open-source framework has real users.

### 2.3 Release scope policy

A feature enters a release only when it has:

- documented behavior and public API;
- unit and integration tests;
- type tests where public inference matters;
- failure and security tests appropriate to its risk;
- performance measurements where it affects a hot path;
- migration/deprecation guidance if it changes existing behavior.

---

## 3. Technical strategy and architecture decisions

### 3.1 Runtime strategy

**Start Bun-first and Bun-only for the first public versions.** This avoids spending early effort on cross-runtime abstractions that may compromise the core design.

Use Bun APIs where they provide clear value, especially the native HTTP server/router, but hide runtime-specific details behind small internal adapters where that does not add meaningful overhead. Revisit Node.js compatibility only after the API and package boundaries stabilize.

Do not promise that every third-party Node package will work identically under Bun. Maintain an integration compatibility matrix and test the exact versions that Qutivex supports.

### 3.2 HTTP engine and routing

- Use `Bun.serve()` as the initial server foundation.
- Register route definitions at application startup.
- Prefer Bun's native route table for static and parameterized routes where possible.
- Use a controlled fallback handler for features that cannot be expressed in the native route table.
- Avoid re-running route parsing, config parsing, dependency graph resolution, or schema construction for every request.
- Do not create a complex custom router until benchmarks show a concrete limitation in the native router.

### 3.3 TypeScript and type-checking strategy

- Use TypeScript as the public programming language and type system.
- Bun executes/transpiles TypeScript, but execution alone must not be treated as type-checking.
- Provide a documented `qutivex check` command using the supported Bun type-checking workflow or a pinned compatible TypeScript toolchain.
- Run type checks in CI for every package and example.
- Add compile-time tests for route params, validated request bodies, dependency injection, model types, and response types.
- Keep the supported TypeScript/Bun matrix explicit. Do not rely on beta compiler behavior for a stable release.

### 3.4 Package and module model

Recommended monorepo packages:

```text
packages/
  core/             # App lifecycle, route registry, errors, hooks
  http-bun/         # Bun.serve adapter, request/response bridge
  router/           # Public route definitions and registration
  validation/       # Schema adapters and validation pipeline
  openapi/          # OpenAPI document generator and Swagger UI integration
  di/               # Dependency registration and resolution
  plugins/           # Plugin contracts and module loading
  cli/               # create, dev, build, check, routes, db commands
  testing/           # Test client, factories, mocks, fixtures
  database/          # Drizzle integration and DB lifecycle
  admin/             # Model registry and admin UI
  security/          # Auth, sessions, policies, CSRF, security headers
  jobs/              # Queue contracts, workers, scheduler
  cache/             # Cache interface and adapters
  storage/           # File/object storage adapters
  ai/                # Model provider interfaces and adapters
  agents/             # Agent execution and tool runtime
  workflows/          # Durable workflow engine
  observability/      # Logging, metrics, traces, audit integration
  fullstack/          # Templates, SSR, assets, forms, React adapter
```

Package names and final boundaries may change after prototypes. Avoid creating empty packages just to match this diagram; extract a package when it has a real boundary and tests.

### 3.5 Dependency direction

```text
CLI / Admin / AI / Database / Security / Full-stack / Jobs
                         |
                Public framework APIs
                         |
       Core + Router + Validation + DI contracts
                         |
              Bun HTTP adapter/runtime
```

Rules:

- `core` must not import optional modules.
- Optional modules may depend on core contracts.
- Adapters implement interfaces owned by stable framework contracts.
- Avoid circular imports between modules.
- A minimal route should not import AI, database, admin, or full-stack packages.

### 3.6 Initial application structure

The generator should create these three **primary application files**:

```text
my-app/
  main.ts
  settings.ts
  config.toml
  package.json       # generated package metadata/scripts
  tsconfig.json      # generated type-checking/editor config
  bun.lock           # generated lockfile after install
```

“Three-file project” means three files the developer normally edits to get started—not that a real project can avoid package metadata, lockfiles, tests, models, or assets.

As a project grows, additional files/folders are normal:

```text
my-app/
  main.ts
  settings.ts
  config.toml
  models/
  services/
  middleware/
  agents/
  workflows/
  templates/
  public/
  tests/
```

### 3.7 Configuration policy

- `main.ts`: route declarations and application composition.
- `settings.ts`: typed application settings and module configuration.
- `config.toml`: environment-specific non-secret configuration.
- Environment variables/secret managers: credentials, private keys, tokens, passwords.
- Validate configuration once during startup and fail with actionable errors.
- Support development, test, staging, and production profiles without duplicating settings.
- Define precedence explicitly: defaults < TOML profile < environment variables < explicit programmatic overrides.

### 3.8 Proposed public API style

These are design sketches, not implemented APIs. Do not lock them before type tests and usability prototypes.

```ts
import { App } from "qutivex";
import { schema } from "qutivex/validation";

const app = new App();

app.get("/", () => ({ message: "Hello from Qutivex" }));

app.get("/users/:id", (ctx) => ({
  id: ctx.params.id,
}));

app.post("/users", {
  body: schema.object({
    name: schema.string().min(2),
    email: schema.email(),
  }),
}, (ctx) => ({
  created: true,
  user: ctx.body,
}));

app.run();
```

Guidelines:

- Prefer a fluent API and explicit route options for version 1.
- Do not require decorators or reflection metadata.
- Keep handler types inferable without excessive generic annotations.
- Make request body validation explicit and automatic when a schema is attached.
- Use the same schema source for OpenAPI output.
- Make error responses consistent and documented.

---

## 4. Roadmap overview

The roadmap is ordered by dependency. Performance, documentation, security, and tests are continuous workstreams—not final phases that can be postponed.

| Phase | Name | Main result | Indicative effort |
|---|---|---|---:|
| 0 | Product definition and technical specification | Frozen MVP scope and RFCs | 1–2 weeks |
| 1 | Repository and engineering foundation | Buildable, tested monorepo | 1–2 weeks |
| 2 | Minimal HTTP core | Minimal Bun-backed application | 2–3 weeks |
| 3 | Routing, lifecycle, context, middleware | Complete basic request pipeline | 2–4 weeks |
| 4 | Validation, type inference, OpenAPI | FastAPI-like API experience | 3–5 weeks |
| 5 | CLI, generator, settings, TOML | Three-primary-file developer experience | 2–3 weeks |
| 6 | Plugins, DI, testing, dev workflow | Extensible and testable framework | 3–4 weeks |
| 7 | Database integration and migrations | Reliable database-backed apps | 4–7 weeks |
| 8 | Authentication and security | Secure application foundations | 4–6 weeks |
| 9 | Automatic admin panel | Django-inspired admin | 4–7 weeks |
| 10 | Jobs, cache, storage, email | Production application services | 4–7 weeks |
| 11 | AI model integration | First-class LLM APIs | 3–5 weeks |
| 12 | Agent and durable workflow runtime | Resumable, controllable agents | 6–10+ weeks |
| 13 | Observability and enterprise operations | Operable production platform | 4–7 weeks |
| 14 | Full-stack web capabilities | SSR, templates, forms, frontend adapters | 5–9 weeks |
| 15 | Performance, security, compatibility, 1.0 | Stable release candidate and 1.0 | 6–10+ weeks |

These ranges overlap in practice and are not promises. A solo maintainer should expect the broad vision to take substantially longer if working part-time.

---

# 5. Detailed phase-by-phase plan

## Phase 0 — Product definition and technical specification

**Goal:** prevent scope drift and resolve major architectural questions before coding the framework.

### Work items

- [ ] Write the product statement and target user personas.
- [ ] Define the first three concrete reference applications:
  - [ ] JSON CRUD API with authentication and PostgreSQL.
  - [ ] AI chat/agent API with streaming and tool calling.
  - [ ] Server-rendered dashboard/admin application.
- [ ] Create a competitor capability matrix for Elysia, Hono, Fastify, AdonisJS, NestJS, FastAPI, Django, and Mastra.
- [ ] Identify which features Qutivex will build, integrate, or defer.
- [ ] Decide the initial license and contribution model.
- [ ] Define support policy: Bun versions, operating systems, database versions, TypeScript tooling.
- [ ] Write RFCs for route API, validation, plugin lifecycle, DI, configuration, database integration, and AI interfaces.
- [ ] Define initial benchmark hardware and workloads.
- [ ] Define a strict non-goals list for the first public release.

### Key decisions to document

1. Bun-only during early versions or compatibility adapters from day one? Recommendation: Bun-first/Bun-only initially.
2. Decorators or fluent route API? Recommendation: fluent API first.
3. Custom router or Bun native routing? Recommendation: native routing first.
4. Own ORM or Drizzle integration? Recommendation: integrate first; no custom ORM in 1.0.
5. Own AI provider clients or adapters? Recommendation: stable adapter interface, reuse maintained provider SDKs.
6. What does “native AI” mean? Define it as first-class framework APIs and lifecycle integration—not bundling or hosting models.
7. What does “enterprise-ready” mean? Convert it into testable security, reliability, compatibility, and operations requirements.

### Deliverables

- `VISION.md`
- `ROADMAP.md`
- `ARCHITECTURE.md`
- `RFC/0001-public-api.md`
- `RFC/0002-routing.md`
- `RFC/0003-validation-openapi.md`
- `RFC/0004-plugin-di.md`
- `RFC/0005-database.md`
- `RFC/0006-ai-agents.md`
- `BENCHMARKS.md`
- `SECURITY.md`

### Exit criteria

- A developer can explain what Qutivex does in one sentence.
- MVP scope and non-goals are explicit.
- Critical interfaces and package dependencies are documented.
- The team can identify which parts are original and which are integrations.

---

## Phase 1 — Repository and engineering foundation

**Goal:** establish a maintainable codebase with repeatable local development and CI.

### Work items

- [ ] Create a Git repository with a clear license.
- [ ] Initialize Bun workspaces/monorepo.
- [ ] Create only the initial packages needed for the core prototype.
- [ ] Configure TypeScript with strict settings.
- [ ] Configure `bun check` or the pinned supported TypeScript check command in CI.
- [ ] Configure formatter and lint rules.
- [ ] Configure `bun test` and test coverage reporting.
- [ ] Add unit-test and integration-test directory conventions.
- [ ] Add GitHub Actions for install, type-check, tests, lint, and build.
- [ ] Add changeset/release automation or a documented manual versioning process.
- [ ] Add contribution guide, code of conduct, issue templates, and PR template.
- [ ] Pin the Bun version used by CI and examples.
- [ ] Add a basic benchmark harness without making performance claims yet.

### Recommended repository shape

```text
qutivex/
  packages/
    core/
    http-bun/
    router/
  examples/
  benchmarks/
  tests/
  docs/
  RFC/
  .github/
  package.json
  bun.lock
  tsconfig.json
  README.md
  LICENSE
  CONTRIBUTING.md
  SECURITY.md
```

### Deliverables

- Reproducible local setup.
- CI that fails on broken types/tests.
- Package boundary conventions.
- First minimal example.

### Exit criteria

A clean clone can install dependencies, type-check, run tests, and execute the example using documented commands.

---

## Phase 2 — Minimal HTTP core

**Goal:** create the smallest useful Qutivex application using Bun's native server.

### Work items

- [ ] Implement `App` construction.
- [ ] Implement application lifecycle states: created, configured, starting, running, stopping, stopped, failed.
- [ ] Implement server startup and shutdown around `Bun.serve()`.
- [ ] Implement `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, and `HEAD` route registration.
- [ ] Support `Response`, string, JSON object, and `void` handler return values with explicit semantics.
- [ ] Implement default 404 and 500 responses.
- [ ] Normalize thrown framework errors into safe HTTP responses.
- [ ] Add configurable host and port.
- [ ] Add graceful shutdown hooks.
- [ ] Add a minimal startup banner, disabled in production by default.
- [ ] Add a basic `app.run()`/`app.listen()` decision and document it.

### Design constraints

- Do not wrap every `Response` in another response unnecessarily.
- Do not parse JSON unless the route needs a body.
- Avoid loading optional modules in the core entry point.
- Do not create a custom router at this stage.
- Route registration should happen before the server starts; mutations after startup must have defined behavior.

### Tests

- [ ] Each HTTP method.
- [ ] JSON, text, empty, and custom `Response` returns.
- [ ] 404, thrown errors, malformed handler output.
- [ ] Port conflict and startup failure.
- [ ] Graceful shutdown and repeated shutdown calls.
- [ ] Concurrent requests and aborted client connections.

### Deliverables

`qutivex-core` prototype that can serve a “Hello World” endpoint.

### Exit criteria

The core works without importing database, admin, AI, or frontend code. All lifecycle states are tested.

---

## Phase 3 — Routing, request context, lifecycle, and middleware

**Goal:** provide the essential HTTP application model.

### Routing

- [ ] Static routes.
- [ ] Path parameters.
- [ ] Wildcard routes.
- [ ] Query parameter access.
- [ ] Header and cookie access.
- [ ] Route grouping/prefixes.
- [ ] Route names and metadata.
- [ ] Route listing/introspection.
- [ ] Route conflict detection.
- [ ] Method-not-allowed behavior where applicable.

### Request context

Design a small typed `Context` with access to:

- [ ] `Request` and parsed URL.
- [ ] Path params.
- [ ] Query params.
- [ ] Headers and cookies.
- [ ] Lazy body parsing (`json`, `text`, `formData`, `arrayBuffer`).
- [ ] Response helpers.
- [ ] Request ID and logger.
- [ ] Dependency access (added with DI phase).
- [ ] Authenticated principal (added with security phase).
- [ ] Abort signal and request-scoped metadata.

### Middleware and hooks

- [ ] Global middleware.
- [ ] Route-level middleware.
- [ ] Group-level middleware.
- [ ] Before/after handler hooks.
- [ ] Error hooks.
- [ ] Request/response lifecycle documentation.
- [ ] Define middleware order and short-circuit behavior.
- [ ] Prevent calling `next()` multiple times unless explicitly supported.
- [ ] Ensure errors thrown in middleware are handled consistently.

### HTTP capabilities

- [ ] Request body size limits.
- [ ] Content-type handling.
- [ ] Streaming response support.
- [ ] Server-Sent Events.
- [ ] WebSocket integration through Bun.
- [ ] Request timeouts and cancellation.
- [ ] Compression policy (only after measurement and adapter selection).

### Tests

- Middleware ordering, short-circuiting, error propagation, aborted requests, stream cleanup, body limits, malformed content types, WebSockets, and request context isolation.

### Exit criteria

A developer can build a multi-route service with logging middleware, route groups, path params, query params, and streamed responses.

---

## Phase 4 — Validation, type inference, and OpenAPI/Swagger

**Goal:** deliver the FastAPI-like experience and make schemas the single source of truth.

### Schema strategy

- [ ] Choose a canonical schema representation or a Standard Schema-compatible adapter contract.
- [ ] Support a first-party schema API only if it does not duplicate the ecosystem unnecessarily.
- [ ] Evaluate adapters for Zod, Valibot, TypeBox, and JSON Schema.
- [ ] Define how runtime validation and TypeScript inference stay aligned.
- [ ] Define unsupported schema features and clear errors.
- [ ] Pre-build or cache validators at startup where safe.

### Request validation

- [ ] Body schema.
- [ ] Params schema.
- [ ] Query schema.
- [ ] Header schema.
- [ ] Cookie schema.
- [ ] Content-type-aware body parsing.
- [ ] Consistent 400/422 error policy (choose and document one convention).
- [ ] Redacted validation errors for sensitive fields.

### Response handling

- [ ] Optional response schema validation in development/test.
- [ ] Documented response schema for OpenAPI.
- [ ] Standard response serialization behavior.
- [ ] Safe error response schemas.
- [ ] Avoid a serializer/code generator until benchmarks and security review justify it.

### OpenAPI

- [ ] Generate an OpenAPI 3.1 document from registered routes and schemas.
- [ ] Generate operation IDs, tags, params, request bodies, responses, and reusable components.
- [ ] Support bearer auth, cookie auth, API keys, and OAuth-related schemes as appropriate.
- [ ] Support descriptions, examples, deprecation, and version metadata.
- [ ] Serve JSON/YAML spec endpoints.
- [ ] Add Swagger UI or another maintained interactive documentation UI.
- [ ] Make docs path configurable and disableable in production.
- [ ] Add OpenAPI snapshot/contract tests.
- [ ] Validate generated documents with an independent OpenAPI validator.

### Developer experience targets

- [ ] A validated `ctx.body` has the inferred schema type.
- [ ] Route params are inferred from the path where feasible.
- [ ] Responses are represented accurately in OpenAPI.
- [ ] The same definition drives validation and docs.
- [ ] Type errors are useful and do not require advanced generic annotations for normal cases.

### Exit criteria

A complete typed CRUD API can generate accurate interactive docs without separately maintaining schemas in two places.

---

## Phase 5 — CLI, project generator, settings, and TOML

**Goal:** make the three-primary-file experience real and repeatable.

### CLI commands for initial release

- [ ] `qutivex create <name>`
- [ ] `qutivex dev`
- [ ] `qutivex start`
- [ ] `qutivex check`
- [ ] `qutivex test`
- [ ] `qutivex routes`
- [ ] `qutivex build` (define what “build” means for Bun deployment)
- [ ] Helpful `--help` output and exit codes.

### Project generator

Generate:

```text
my-app/
  main.ts
  settings.ts
  config.toml
  package.json
  tsconfig.json
```

- [ ] Minimal API template.
- [ ] Full-stack starter template later.
- [ ] AI API starter template later.
- [ ] Pin compatible framework package versions.
- [ ] Set scripts for dev, start, check, test.
- [ ] Include sample environment file without real secrets.
- [ ] Add `.gitignore` and lockfile instructions.

### Settings and TOML

- [ ] Define typed `defineSettings()` contract.
- [ ] Parse TOML once at startup.
- [ ] Validate TOML values with actionable file/line/key errors where possible.
- [ ] Define environment variable substitution.
- [ ] Define precedence rules.
- [ ] Validate required production settings.
- [ ] Keep secrets out of committed TOML.
- [ ] Support profile selection such as development/test/production.
- [ ] Document reload behavior; do not silently mutate live security/database settings.

### Developer server

- [ ] Watch application files.
- [ ] Restart safely on change.
- [ ] Preserve readable logs.
- [ ] Avoid duplicate server processes.
- [ ] Provide optional type-check-before-run.

### Exit criteria

A new developer can create a project, install, run, type-check, test, and inspect routes using documented CLI commands. The generated project has three primary app files, with necessary package/tooling files also generated.

---

## Phase 6 — Plugins, dependency injection, and testing tools

**Goal:** make the framework extensible without a fragile global plugin system.

### Plugin system

- [ ] Define plugin registration contract.
- [ ] Define plugin metadata, version, dependencies, and compatibility.
- [ ] Define install/register lifecycle and teardown hooks.
- [ ] Detect duplicate registration and dependency cycles.
- [ ] Define configuration scoping.
- [ ] Define how plugins add routes, services, hooks, and OpenAPI metadata.
- [ ] Keep plugin execution deterministic.
- [ ] Document trusted-code boundaries; plugins execute application code and are not a sandbox.

### Dependency injection

- [ ] Application-scoped dependencies.
- [ ] Request-scoped dependencies.
- [ ] Transient dependencies only if there is a clear use case.
- [ ] Async dependency initialization.
- [ ] Dependency graph validation at startup.
- [ ] Explicit teardown/disposal.
- [ ] Override dependencies in tests.
- [ ] Clear circular dependency errors.
- [ ] Avoid reflection-heavy resolution on the request hot path; resolve/calculate as much as possible at startup.

### Testing utilities

- [ ] In-process test client.
- [ ] Request/response assertions.
- [ ] Dependency overrides.
- [ ] Database test helpers and transaction rollback strategy.
- [ ] Authenticated-user test helper.
- [ ] WebSocket test support where practical.
- [ ] Fixture factories.
- [ ] OpenAPI contract assertions.
- [ ] Example application integration tests.

### Exit criteria

A third-party plugin can register a route and service, and an application can test it without binding a real public port.

---

## Phase 7 — Database integration and migrations

**Goal:** provide a dependable database experience without prematurely creating a custom ORM.

### Initial strategy

- Use Drizzle as the first database integration.
- Start with PostgreSQL as the main production example.
- Support SQLite for local development and tests where feature parity is acceptable.
- Add MySQL only after adapter tests and user demand.
- Expose a Qutivex convenience layer without pretending that Drizzle is a custom Qutivex ORM.

### Work items

- [ ] Database config and connection lifecycle.
- [ ] Startup connection verification (configurable).
- [ ] Connection pool limits and timeouts.
- [ ] Shutdown pool cleanup.
- [ ] Transactions and nested transaction semantics.
- [ ] Migration CLI integration.
- [ ] Generate/apply migration workflow.
- [ ] Migration status and drift checks.
- [ ] Seed command and test fixtures.
- [ ] Read/write transaction examples.
- [ ] Pagination/filtering examples.
- [ ] Query logging with redaction and opt-in sampling.
- [ ] Safe retry policy: retry only operations known to be safe/idempotent.
- [ ] Database error mapping without leaking SQL, credentials, or private schema details.

### Model registry for admin

- [ ] Define how a model/table is registered with display metadata.
- [ ] Define labels, fields, search fields, filters, sorting, and read-only fields.
- [ ] Define relation display/edit behavior.
- [ ] Define per-model and per-field permission hooks.
- [ ] Do not assume every Drizzle schema can be safely exposed to admin automatically.

### Exit criteria

A PostgreSQL-backed CRUD application can run migrations, use transactions, test database access, and shut down cleanly. SQLite support must have documented behavioral differences.

---

## Phase 8 — Authentication, authorization, and security foundations

**Goal:** deliver secure defaults and reusable identity/permission primitives.

### Authentication

- [ ] Password hashing using maintained, vetted implementations.
- [ ] Session authentication with secure cookie defaults.
- [ ] JWT verification and key rotation support.
- [ ] Login/logout/session invalidation.
- [ ] Password reset flow hooks (email delivery remains adapter-based).
- [ ] Email verification hooks.
- [ ] OAuth/OIDC integration through maintained libraries/providers.
- [ ] MFA integration design.
- [ ] API-key authentication for service-to-service cases.
- [ ] Token/session expiration and revocation strategy.

### Authorization

- [ ] Role-based access control (RBAC).
- [ ] Permission registry.
- [ ] Policy-based authorization hooks for resource/object-level checks.
- [ ] Per-route and per-operation authorization.
- [ ] Field-level access controls for admin/API output where appropriate.
- [ ] Tenant-aware authorization context.
- [ ] Explicit deny-by-default behavior for protected resources.

### Web and API security

- [ ] CSRF protection for cookie-authenticated browser flows.
- [ ] Secure, HttpOnly, SameSite cookie defaults.
- [ ] CORS allowlist and credential rules.
- [ ] Security headers and CSP configuration.
- [ ] Request/body/file upload limits.
- [ ] Rate limits and quota hooks.
- [ ] Timeout and resource-consumption controls.
- [ ] SSRF-resistant URL-fetching guidance and helpers where appropriate.
- [ ] Safe redirects and open-redirect prevention.
- [ ] Error redaction and secret filtering.
- [ ] Audit security-sensitive operations.

### Security verification

- [ ] Map controls to OWASP ASVS 5.0.0.
- [ ] Address relevant OWASP API Security Top 10 risks.
- [ ] Add dependency vulnerability scanning.
- [ ] Add fuzz/property tests for parsers and validation boundaries.
- [ ] Add auth/session regression tests.
- [ ] Add threat models for sessions, file uploads, SSRF, multi-tenancy, and AI tools.
- [ ] Publish a security policy and vulnerability reporting process.

### Exit criteria

A sample application supports secure sessions, role/policy checks, CSRF protection, rate limits, and a documented security configuration. Do not call it enterprise-secure until independent review and release hardening are complete.

---

## Phase 9 — Django-inspired automatic admin panel

**Goal:** provide a secure, model-driven admin interface.

### Admin foundation

- [ ] Admin module is opt-in.
- [ ] Admin route prefix is configurable.
- [ ] Require explicit authentication and permissions.
- [ ] Default to no public access.
- [ ] Add admin user/session management integration.
- [ ] Create a model registry based on explicit metadata.

### Model features

- [ ] List, create, view, update, and delete pages.
- [ ] Search and pagination.
- [ ] Sorting and filters.
- [ ] Read-only and hidden fields.
- [ ] Relation selectors.
- [ ] Custom field renderers/editors.
- [ ] File/image field adapters.
- [ ] Bulk actions with permission checks.
- [ ] Soft delete support where configured.
- [ ] Validation errors aligned with model/schema validation.
- [ ] Audit history for sensitive mutations.

### Security requirements

- [ ] Never expose every database column by default.
- [ ] Enforce object-level and field-level permissions on the server.
- [ ] Protect destructive actions against CSRF.
- [ ] Require confirmation for high-impact bulk actions.
- [ ] Log admin actions with actor, timestamp, target, and outcome.
- [ ] Prevent tenant boundary bypass in list, detail, search, and relation queries.

### UX requirements

- [ ] Responsive layout.
- [ ] Keyboard-accessible controls.
- [ ] Clear empty/error/loading states.
- [ ] Custom branding/navigation hooks.
- [ ] No requirement for a separate frontend build for the basic admin.

### Exit criteria

A sample database-backed application can register two related models and securely manage them through the admin, with role restrictions and audit records.

---

## Phase 10 — Background jobs, scheduling, cache, file storage, and email

**Goal:** provide common production application services through adapters.

### Background jobs

- [ ] Define job contract and typed payloads.
- [ ] Define queue adapter interface.
- [ ] Select one maintained initial backend after compatibility testing (database-backed queue or Redis-backed adapter).
- [ ] Define worker process lifecycle.
- [ ] Retry policy with exponential backoff and jitter.
- [ ] Dead-letter handling.
- [ ] Job timeouts and cancellation.
- [ ] Idempotency keys and duplicate delivery handling.
- [ ] Job status and progress hooks.
- [ ] Scheduled jobs/cron support.
- [ ] Graceful worker shutdown and lease recovery.
- [ ] Concurrency and per-queue limits.
- [ ] Document delivery semantics; assume at-least-once execution unless proven otherwise.

### Cache

- [ ] Cache interface with TTL.
- [ ] In-memory adapter for local development/tests.
- [ ] Redis/Valkey adapter after compatibility tests.
- [ ] Key namespacing and tenant boundaries.
- [ ] Cache invalidation patterns.
- [ ] Avoid caching secrets or authorization decisions without careful design.

### File/object storage

- [ ] Local filesystem adapter for development.
- [ ] S3-compatible adapter for production.
- [ ] Safe file naming and path traversal prevention.
- [ ] Content-type/size limits.
- [ ] Upload streaming.
- [ ] Signed URL support through the provider adapter.
- [ ] Malware scanning integration hook for sensitive use cases.

### Email/notifications

- [ ] Provider adapter interface.
- [ ] Template integration.
- [ ] Retry and delivery-status hooks.
- [ ] Do not log message secrets or private content by default.

### Exit criteria

A job can be enqueued, retried, deduplicated by an idempotency key, and recovered after worker restart. File storage and cache adapters have contract tests.

---

## Phase 11 — AI model integration

**Goal:** make common AI application patterns first-class without tightly coupling Qutivex to one vendor.

### Provider abstraction

- [ ] Define a provider-neutral request/response contract.
- [ ] Support text generation and streaming.
- [ ] Support structured outputs tied to Qutivex validation schemas.
- [ ] Support tool/function calling.
- [ ] Support embeddings where the selected provider supports them.
- [ ] Support provider-specific options without making the common API misleading.
- [ ] Add adapters for the first two or three providers based on real user demand.
- [ ] Maintain adapter compatibility tests.

### Reliability and governance

- [ ] Timeouts and request cancellation.
- [ ] Retry rules that respect provider semantics and idempotency.
- [ ] Model fallback chains with explicit policy.
- [ ] Token/usage accounting where provider data exists.
- [ ] Per-user/tenant budgets and quotas.
- [ ] Rate limits and concurrency controls.
- [ ] Redaction controls for prompts and outputs in logs.
- [ ] Provider error normalization.
- [ ] Streaming backpressure and client disconnect handling.

### AI developer experience

- [ ] `AI.generate()`-style API.
- [ ] `AI.stream()`-style API.
- [ ] Structured output API.
- [ ] Tool definition API with schema validation.
- [ ] Provider configuration through settings/secrets.
- [ ] Test doubles and deterministic mock provider.
- [ ] Usage metadata in request/trace context.

### RAG foundations (not an entire vector database)

- [ ] Embedding adapter interface.
- [ ] Document chunking utilities with explicit configuration.
- [ ] Vector-store adapter contract.
- [ ] Retrieval API with citations/source metadata.
- [ ] Re-ranking hook.
- [ ] Tenant isolation and permission-aware retrieval.
- [ ] Evaluation set for retrieval quality.

### Exit criteria

A developer can build a streaming AI endpoint with validated structured output, provider configuration, tool calling, request limits, and usage telemetry. The AI module remains optional for ordinary API apps.

---

## Phase 12 — Agent runtime and durable workflows

**Goal:** deliver controlled, observable, resumable AI agents—not merely a loop that repeatedly calls an LLM.

### Agent execution model

- [ ] Define agent, tool, run, thread, and execution context types.
- [ ] Define bounded agent loop and explicit stop conditions.
- [ ] Define maximum tool calls, token budget, wall-clock budget, and recursion depth.
- [ ] Validate tool inputs and outputs with schemas.
- [ ] Apply permissions to every tool call.
- [ ] Separate trusted system configuration from user-provided content.
- [ ] Support streaming events for model tokens, tool calls, progress, and final output.
- [ ] Support cancellation and timeout propagation.
- [ ] Record model/tool execution metadata without storing sensitive content by default.

### Tool system

- [ ] Typed local function tools.
- [ ] HTTP/API tools with allowlists and outbound request limits.
- [ ] Database tools with scoped credentials and safe query policies.
- [ ] Tool-level permissions.
- [ ] Tool audit records.
- [ ] Human confirmation for high-impact tools.
- [ ] Tool timeout, retry, and idempotency policy.
- [ ] Never execute arbitrary generated code by default.

### Memory and state

- [ ] Conversation/thread storage interface.
- [ ] Short-term context window management.
- [ ] Optional structured working memory.
- [ ] Optional semantic recall adapter.
- [ ] User/tenant isolation.
- [ ] Data retention and deletion policies.
- [ ] Encryption and sensitive-data controls according to storage backend.

### Workflow engine

- [ ] Deterministic steps for known workflows.
- [ ] Sequential, parallel, branch, loop, and retry primitives.
- [ ] Pause/resume.
- [ ] Human approval checkpoints.
- [ ] Durable snapshots in persistent storage.
- [ ] Recovery after process restart.
- [ ] Workflow versioning and compatibility rules.
- [ ] Idempotent step execution strategy.
- [ ] Failure and compensation patterns for external side effects.
- [ ] Multi-agent collaboration only after single-agent and workflow reliability is proven.

### Agent evaluation and safety

- [ ] Evaluation dataset format.
- [ ] Tool-use correctness tests.
- [ ] Regression tests for prompts/workflows.
- [ ] Quality, latency, and cost metrics.
- [ ] Prompt-injection threat model.
- [ ] Untrusted tool output handling.
- [ ] Secret and personal-data redaction.
- [ ] Human approval for sensitive actions.
- [ ] Per-agent capabilities and network/file/database restrictions.
- [ ] Budget and runaway-loop protection.

### Important implementation policy

Start with a narrow agent runtime and durable workflow contract. Do not attempt multi-agent orchestration, semantic memory, browser automation, code execution, and every provider in the first AI release. Evaluate existing AI tooling and reuse compatible provider integrations where possible. Qutivex's differentiation should be its clean API, safe framework integration, and operational reliability.

### Exit criteria

A long-running workflow can call a bounded agent, persist state, pause for human approval, resume after a process restart, enforce tool permissions, and emit traceable execution records.

---

## Phase 13 — Observability and enterprise operations

**Goal:** make applications diagnosable and operable in production.

### Logs

- [ ] Structured JSON logs.
- [ ] Log levels and per-module configuration.
- [ ] Request ID and trace ID correlation.
- [ ] Redaction of passwords, tokens, cookies, and configured sensitive fields.
- [ ] Sampling and volume controls.
- [ ] Pluggable log sinks.

### Metrics

- [ ] Request count, duration, status, and in-flight requests.
- [ ] Error rates.
- [ ] Runtime memory/CPU indicators where available.
- [ ] Database pool and query metrics.
- [ ] Queue depth, retries, failures, and job duration.
- [ ] AI model latency, token usage, and estimated cost where available.
- [ ] Avoid high-cardinality labels by default.

### Distributed tracing

- [ ] OpenTelemetry-compatible tracing API.
- [ ] HTTP request spans.
- [ ] Database spans through supported instrumentation.
- [ ] Queue/worker spans.
- [ ] AI provider, agent, tool, and workflow spans.
- [ ] Trace context propagation across async/background boundaries.
- [ ] Sampling configuration.

### Health and lifecycle

- [ ] Liveness endpoint.
- [ ] Readiness endpoint.
- [ ] Optional dependency health checks.
- [ ] Graceful shutdown with drain timeout.
- [ ] Startup validation and useful failure messages.
- [ ] Configurable resource limits.

### Enterprise controls

- [ ] Audit events with actor, action, target, timestamp, and outcome.
- [ ] Tenant isolation model and tests.
- [ ] Environment and secret management integration.
- [ ] Data retention configuration.
- [ ] Backup/restore documentation for supported stores.
- [ ] Deployment examples for Docker and a standard reverse proxy.
- [ ] Kubernetes guidance only after basic container deployment is stable.
- [ ] Version support and upgrade policy.
- [ ] Security advisories and release process.

### Exit criteria

An operator can diagnose a failed request across HTTP, database, job, and AI boundaries using correlated traces/logs/metrics, and deploy with health checks and graceful shutdown.

---

## Phase 14 — Full-stack capabilities

**Goal:** make Qutivex useful for full-stack applications without building a competing frontend framework.

### Server-rendered web features

- [ ] HTML response helpers.
- [ ] Template adapter interface.
- [ ] Escaping-by-default template behavior.
- [ ] Static asset serving with cache headers.
- [ ] Form parsing and validation.
- [ ] Cookie/session integration.
- [ ] CSRF integration.
- [ ] Error pages and not-found pages.
- [ ] Content negotiation.

### React integration

- [ ] Optional React adapter.
- [ ] SSR integration only after runtime compatibility is tested.
- [ ] Hydration/build workflow.
- [ ] Static asset manifest handling.
- [ ] Clear client/server module boundary.
- [ ] Avoid forcing React on API-only projects.

### Admin and app UI

- [ ] Admin layout and theme extension points.
- [ ] Navigation and custom dashboard pages.
- [ ] Forms and field components.
- [ ] Accessibility checks.
- [ ] Localization-ready labels/messages.

### Exit criteria

A full-stack sample can render pages, process validated forms, serve assets, use secure sessions, and run the admin without requiring a separate backend framework.

---

## Phase 15 — Performance, security, compatibility, and 1.0 hardening

**Goal:** turn a feature-rich beta into a predictable, supportable release.

### Performance work

- [ ] Publish benchmark methodology before publishing numbers.
- [ ] Compare native `Bun.serve()` baseline, Qutivex minimal route, Qutivex with middleware, Elysia on Bun, Hono on Bun, and relevant alternatives under equivalent conditions.
- [ ] Benchmark static text, JSON, path params, query parsing, validation, serialization, middleware, auth, database, WebSocket, and streaming workloads.
- [ ] Report requests/second, p50/p95/p99 latency, RSS, heap/external memory, CPU, startup, and error rate.
- [ ] Record exact OS, hardware, Bun version, framework versions, dependencies, command, concurrency, warm-up, duration, and payload.
- [ ] Use multiple runs and report variance.
- [ ] Profile CPU and memory before optimizing.
- [ ] Detect memory leaks under sustained load.
- [ ] Test backpressure and aborted clients.
- [ ] Maintain performance regression thresholds in CI for stable representative workloads.

### Provisional performance targets

These are **engineering targets to validate**, not claims or guarantees:

- Minimal route overhead should remain close to native Bun on the same workload.
- Optional modules must not increase the memory footprint of an app that does not import them.
- Startup work (route registration, schema preparation, config parsing) should occur outside the request hot path where possible.
- A minimal route should not pay for body parsing, dependency resolution, or AI/database modules it does not use.
- No optimization may silently weaken security, error behavior, or API correctness.

After Phase 2–4 establish a baseline, publish numeric budgets based on actual measurements rather than inventing targets now.

### Security hardening

- [ ] Complete ASVS-based control review appropriate to project scope.
- [ ] Complete API Security Top 10 review.
- [ ] Complete AI-specific threat review for agent/tool features.
- [ ] Run dependency, secret, and license scans.
- [ ] Run fuzz/property tests on parsers and validation.
- [ ] Run penetration testing on auth, admin, tenant isolation, file upload, and tool execution surfaces.
- [ ] Review unsafe defaults and production configuration.
- [ ] Publish security response process.

### Compatibility and stability

- [ ] Define public API stability policy.
- [ ] Define deprecation periods.
- [ ] Maintain Bun/TypeScript support matrix.
- [ ] Test Linux, Windows, and macOS where supported.
- [ ] Test PostgreSQL/SQLite supported versions.
- [ ] Test package installation from registry.
- [ ] Verify generated apps on a clean machine/container.
- [ ] Verify migrations across supported version upgrades.
- [ ] Verify plugins against supported core versions.
- [ ] Write upgrade guides and changelog.

### 1.0 exit criteria

Do not ship 1.0 until:

- Core, routing, validation, OpenAPI, CLI, and test client are stable.
- Database, auth/security, admin, and jobs have documented support boundaries.
- AI and agent features have explicit beta/stable labels according to test maturity.
- Public APIs have compatibility and deprecation policy.
- Security review has no unresolved critical/high findings.
- Benchmarks are reproducible and accurately described.
- Documentation covers install, tutorial, API reference, deployment, security, and upgrade paths.
- At least two complete reference applications pass CI and can be deployed from a clean clone.

---

# 6. Release strategy

Release scope should be based on stable end-to-end workflows, not the number of packages.

| Release | Scope | What users can build |
|---|---|---|
| `0.1.0` | Core, routing, context, middleware, CLI starter | Minimal HTTP APIs |
| `0.2.0` | Validation, type inference, OpenAPI, test client | Typed API services |
| `0.3.0` | DI/plugins, settings/config, improved CLI | Maintainable multi-module APIs |
| `0.4.0` | Drizzle integration and migrations | Database-backed APIs |
| `0.5.0` | Auth, authorization, security middleware | Authenticated applications |
| `0.6.0` | Admin panel and audit foundations | CRUD/admin applications |
| `0.7.0` | Jobs, cache, storage, observability | Production-oriented services |
| `0.8.0` | AI model APIs and tool calling | AI endpoints |
| `0.9.0` | Durable agent/workflow beta and full-stack preview | AI workflow apps and SSR experiments |
| `1.0.0` | Stable core, tested integrations, documented support policy | Supported production framework for declared scope |

Do not mark every feature stable just because the overall package reaches 1.0. A feature can remain explicitly experimental if its API or operational model is not mature.

---

# 7. Testing strategy — required in every phase

## 7.1 Unit tests

Test pure utilities and deterministic logic:

- route parsing/normalization;
- config merging and validation;
- schema adapters;
- dependency graph resolution;
- permission evaluation;
- retry scheduling;
- workflow state transitions;
- OpenAPI generation.

## 7.2 Integration tests

Test actual module boundaries:

- Bun server and HTTP client;
- middleware and route lifecycle;
- validation and OpenAPI consistency;
- database adapters and migrations;
- auth/session and cookies;
- admin permissions;
- queue persistence and worker recovery;
- AI provider adapters with mock servers;
- agent tool execution and approval;
- telemetry context propagation.

## 7.3 Type-level tests

TypeScript is a core product feature. Test that:

- path params infer correctly;
- validated request data is typed;
- route return types are represented in docs where supported;
- dependencies resolve to the declared types;
- model fields infer correctly through the database integration;
- plugin contracts reject incompatible versions;
- public APIs produce readable compiler errors.

## 7.4 Security tests

- authentication bypass attempts;
- object-level and function-level authorization;
- CSRF and CORS misconfiguration;
- session fixation and invalidation;
- SSRF and unsafe redirects;
- file upload/path traversal;
- tenant isolation;
- rate-limit/resource exhaustion;
- admin field-level access;
- prompt injection and tool permission bypass;
- secret leakage in logs/traces/errors.

## 7.5 Performance tests

Separate microbenchmarks from end-to-end load tests. Never use a single benchmark as the only proof of speed.

---

# 8. Benchmark plan and performance scorecard

## 8.1 Competitors and baselines

At minimum, compare:

- Native `Bun.serve()` as the runtime baseline.
- Qutivex minimal endpoint.
- Qutivex endpoint with common middleware.
- Elysia on Bun.
- Hono on Bun.
- Fastify on its supported runtime as a separate cross-runtime reference, not an apples-to-apples Bun comparison.

Use exact pinned versions and commit hashes in every report.

## 8.2 Workloads

1. Plain text response.
2. Small JSON response.
3. Static route.
4. Parameterized route.
5. Query-string parsing.
6. JSON body parsing.
7. Schema validation.
8. Middleware chain.
9. Authenticated endpoint.
10. Database-backed endpoint.
11. Streaming/SSE endpoint.
12. WebSocket echo/broadcast workload.
13. Sustained concurrency and soak test.

## 8.3 Metrics

- Throughput (requests/second).
- p50, p95, and p99 latency.
- Error rate.
- CPU utilization.
- Resident set size (RSS).
- Heap and external memory where available.
- Startup time and time-to-first-response.
- Idle memory and memory under a fixed workload.
- Garbage collection behavior if measurable.

## 8.4 Benchmark rules

- Same machine, OS, power profile, and network path.
- Same payload, response semantics, keep-alive settings, and concurrency.
- Same runtime version where applicable.
- Warm-up before timed runs.
- Multiple runs; report median and variance.
- Do not mix database latency into a routing-only benchmark.
- Publish code and reproduction commands.
- Label cross-runtime comparisons clearly.
- Do not cherry-pick only the fastest run.

---

# 9. Security and enterprise readiness checklist

Enterprise readiness is not a single feature. It is a collection of verified operating properties.

## Application security

- [ ] Secure session defaults.
- [ ] Password hashing via vetted algorithms/libraries.
- [ ] RBAC and resource-level policy checks.
- [ ] CSRF and CORS policies.
- [ ] Security headers/CSP controls.
- [ ] Request limits, rate limits, and timeouts.
- [ ] Safe error messages and redacted logs.
- [ ] Secret management guidance.
- [ ] File upload safeguards.
- [ ] Tenant isolation tests.
- [ ] Dependency vulnerability process.

## Reliability

- [ ] Graceful shutdown.
- [ ] Readiness/liveness checks.
- [ ] Bounded queues and worker concurrency.
- [ ] Retry and dead-letter handling.
- [ ] Database pool limits.
- [ ] Durable state for long-running workflows.
- [ ] Backup/restore documentation.
- [ ] Resource exhaustion handling.

## Governance

- [ ] Audit trail.
- [ ] Version support policy.
- [ ] Breaking-change/deprecation policy.
- [ ] Security advisory channel.
- [ ] License and dependency inventory.
- [ ] Documentation and upgrade guides.
- [ ] Reproducible release artifacts.

## AI/agent-specific safety

- [ ] Tool allowlists and explicit capabilities.
- [ ] Per-agent and per-user budgets.
- [ ] Maximum steps and wall-clock timeout.
- [ ] Human approval for sensitive actions.
- [ ] Untrusted tool output treated as data, not instructions.
- [ ] Scoped credentials; never give agents broad environment secrets.
- [ ] Prompt, tool, and model version tracking.
- [ ] Durable workflow state and audit records.
- [ ] Retention and deletion rules for memory.
- [ ] Evaluation and regression tests.

---

# 10. Documentation and developer experience plan

Documentation should be developed alongside each module, not written after implementation.

## Required docs

- [ ] Installation and prerequisites.
- [ ] Quick start: three primary application files.
- [ ] Routing guide.
- [ ] Request/response and context reference.
- [ ] Middleware/lifecycle guide.
- [ ] Validation and type inference guide.
- [ ] OpenAPI/Swagger guide.
- [ ] Dependency injection and plugins guide.
- [ ] Configuration and secrets guide.
- [ ] Database and migrations guide.
- [ ] Authentication and authorization guide.
- [ ] Admin customization guide.
- [ ] Background jobs guide.
- [ ] AI providers and streaming guide.
- [ ] Agents, tools, memory, and workflows guide.
- [ ] Observability guide.
- [ ] Full-stack/SSR guide.
- [ ] Deployment guide.
- [ ] Security guide.
- [ ] Benchmark methodology.
- [ ] Upgrade and migration guides.
- [ ] API reference generated from source where possible.

## Reference applications

Maintain at least three examples:

1. **API starter:** CRUD, validation, OpenAPI, tests.
2. **Business application:** PostgreSQL, auth, roles, admin, audit logs, jobs.
3. **AI application:** streaming chat, tool calling, durable workflow, human approval, usage metrics.

Each example must be kept working in CI and updated with framework releases.

---

# 11. Community and ecosystem strategy

A framework is not successful only because the core works. Adoption requires trust, examples, compatibility, and responsive maintenance.

### Before public launch

- [ ] Clear README with honest positioning.
- [ ] Installation instructions tested from a clean machine.
- [ ] One compelling end-to-end demo.
- [ ] Benchmarks with reproducible source.
- [ ] Contribution guide and code of conduct.
- [ ] Issue templates and security reporting instructions.
- [ ] License selected and dependency licenses reviewed.

### After launch

- [ ] Publish small, useful releases frequently.
- [ ] Respond to issues with reproducible bug requests.
- [ ] Maintain a public roadmap and changelog.
- [ ] Create plugin examples.
- [ ] Invite maintainers only after package boundaries stabilize.
- [ ] Ask users what they could not do easily in existing frameworks.
- [ ] Track adoption through real projects, not only stars/download counts.

### Evidence of product-market pull

Look for:

- developers using Qutivex in projects beyond tutorials;
- recurring issues that reveal real usage;
- external plugin contributions;
- users upgrading between releases;
- teams willing to discuss production constraints;
- willingness to pay for support, hosting, governance, or managed operations.

Do not build a commercial cloud platform before users repeatedly ask for a problem that such a platform solves.

---

# 12. Risks and mitigation

| Risk | Why it matters | Mitigation |
|---|---|---|
| Scope explosion | Too many features delay the first usable release. | Ship in stages; maintain non-goals and release gates. |
| No differentiation | Elysia, AdonisJS, Hono, and others already cover substantial ground. | Focus on integrated AI production experience, admin/data DX, and measured performance. |
| Performance regression | Rich abstractions can add latency and memory. | Small core, optional modules, benchmarks from Phase 2 onward. |
| Security bugs | Auth/admin/agents increase attack surface. | Use vetted libraries, threat models, ASVS mapping, external review. |
| ORM maintenance | A custom ORM is a project of its own. | Use Drizzle integration initially; define a thin adapter boundary. |
| AI provider churn | APIs and model capabilities change frequently. | Provider adapters, compatibility tests, pinned SDKs, capability negotiation. |
| Fragile agents | LLM behavior is nondeterministic and workflows can fail. | Durable state, bounded budgets, idempotency, approvals, evaluations. |
| Bun ecosystem constraints | Some dependencies may target Node-specific behavior. | Compatibility tests and supported-package matrix; avoid blanket compatibility claims. |
| Solo maintainer burnout | Framework maintenance is continuous. | Keep 1.0 scope realistic; automate CI; avoid supporting too many adapters. |
| Enterprise expectations | Buyers need support, SLAs, patch cadence, and auditability. | Do not claim enterprise-ready until governance and support processes exist. |

---

# 13. First 30 days — practical execution plan

The first month should prove the core idea, not attempt to build the entire framework.

## Week 1 — Freeze the design

- [ ] Create repository.
- [ ] Write `VISION.md`, `ROADMAP.md`, and `ARCHITECTURE.md`.
- [ ] Write the public API RFC.
- [ ] Choose package manager/workspace conventions.
- [ ] Add CI, type-checking, tests, lint/format.
- [ ] Pin Bun version for development.

**End-of-week artifact:** reproducible monorepo and written technical decisions.

## Week 2 — Minimal server

- [ ] Implement `App`.
- [ ] Integrate `Bun.serve()`.
- [ ] Register GET/POST routes.
- [ ] Return text and JSON.
- [ ] Handle 404 and 500.
- [ ] Add lifecycle and shutdown tests.

**End-of-week artifact:** first working Qutivex HTTP server.

## Week 3 — Request model

- [ ] Add path params and query access.
- [ ] Add lazy JSON body parsing.
- [ ] Add minimal context.
- [ ] Add middleware order and error handling.
- [ ] Add route introspection.
- [ ] Add initial baseline benchmark.

**End-of-week artifact:** usable minimal API with measurable baseline.

## Week 4 — First developer experience prototype

- [ ] Prototype schema-driven POST validation.
- [ ] Add first OpenAPI output spike.
- [ ] Prototype the three-primary-file generator.
- [ ] Build a CRUD example.
- [ ] Compare the example with Elysia/Hono ergonomics.
- [ ] Write a short benchmark and design review.

**End-of-month decision:** continue, revise, or narrow the project based on real code, usability, and benchmark evidence.

---

# 14. Recommended development rules

1. **Do not change the runtime or primary language during the first 90 days** unless a blocker is proven with a reproducible test.
2. Do not add a feature because another framework has it; add it because the target use case needs it.
3. Do not optimize without profiling.
4. Do not claim “fastest” without reproducible independent comparisons.
5. Do not call a feature enterprise-ready merely because it exists.
6. Do not build a custom ORM, compiler, queue, cryptography system, or LLM client from scratch without a concrete reason.
7. Keep AI execution bounded, permissioned, observable, and resumable.
8. Keep optional features out of the minimal application path.
9. Write tests and docs with each public API.
10. Ship small stable milestones rather than waiting for the entire vision.

---

# 15. Final definition of success

Qutivex should be considered successful at different levels, not only when it reaches 1.0.

### Level 1 — Working prototype

- A small Bun-backed app runs.
- Routes, params, JSON, middleware, and errors work.
- The core has tests and a baseline benchmark.

### Level 2 — Useful API framework

- Type-safe validation and OpenAPI work together.
- The CLI generates the three-primary-file starter.
- A real CRUD API can be built and tested.

### Level 3 — Batteries-included backend

- Database integration, migrations, auth, authorization, admin, and jobs work together.
- Security defaults and operational behavior are documented.

### Level 4 — AI application platform

- AI providers, streaming, tools, and structured output work.
- Agents and workflows are bounded, observable, persistent, and resumable.
- Human approval and tool permission checks are enforced.

### Level 5 — Production-supported framework

- Stable compatibility policy.
- Thorough security and reliability testing.
- Reproducible performance evidence.
- Full documentation and working reference applications.
- Maintainer/release/security response processes.
- Real users have successfully deployed and upgraded applications.

**The actual goal is not to have the longest feature list. It is to make Qutivex the framework developers choose because it makes real applications easier to build, safer to operate, and fast enough to compete on measured workloads.**

---

# 16. Technical references

These are the primary documentation sources used to ground the roadmap. Check compatibility and exact versions again when implementation begins; libraries and runtime APIs evolve.

## Bun and TypeScript

- [Bun documentation](https://bun.sh/docs)
- [Bun HTTP server](https://bun.sh/docs/runtime/http/server)
- [Bun routing](https://bun.sh/docs/runtime/http/routing)
- [Bun type checking](https://bun.sh/docs/runtime/check)
- [Bun APIs reference](https://bun.com/docs/runtime/bun-apis)
- [TypeScript team blog](https://devblogs.microsoft.com/typescript/)

## Existing framework design references

- [Elysia documentation](https://elysiajs.com/)
- [Hono documentation](https://hono.dev/)
- [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [AdonisJS documentation](https://docs.adonisjs.com/)
- [FastAPI documentation](https://fastapi.tiangolo.com/)
- [Django documentation](https://docs.djangoproject.com/)

## Database and API contracts

- [Drizzle ORM documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle migrations](https://orm.drizzle.team/docs/migrations)
- [OpenAPI Specification 3.1](https://swagger.io/specification/v3/)

## Security and operations

- [OWASP ASVS 5.0.0](https://asvs.owasp.org/)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)

## AI and agent systems

- [Mastra agents](https://mastra.ai/docs/agents/overview)
- [Mastra workflows](https://mastra.ai/docs/workflows/overview)
- [Mastra storage](https://mastra.ai/docs/storage)
- [Mastra observability](https://mastra.ai/docs/observability/overview)

---

## Document maintenance

Update this roadmap whenever a major architecture decision changes. Keep completed work linked to issues, PRs, RFCs, benchmarks, and release notes. Do not silently change the meaning of a phase or claim an exit criterion has passed without evidence.
