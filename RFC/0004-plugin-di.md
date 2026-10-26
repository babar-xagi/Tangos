# RFC 0004: Plugins and dependency injection

- **Status:** Accepted ✅ (Phase 6 direction)
- **Target:** Phase 6
- **Author:** Qutivex maintainers
- **Created:** 2026-10-26

## Summary

Qutivex uses **explicit, typed registration** for plugins and services. There is
no global mutable plugin registry, no decorator metadata, and no reflection-based
container on the request path.

Plugins execute application code. They are **trusted**, not sandboxed. Dependency
injection resolves application and request scopes, validates the graph at
startup, and supports test overrides.

## Goals

- A third-party plugin can add routes, services, hooks, and OpenAPI metadata.
- Startup catches duplicate registration and dependency cycles.
- Tests can replace services without binding a port or mutating globals.
- Request-scoped services are isolated per request.
- Async initialization and teardown are deterministic.
- Clear errors for incompatible plugin versions.

## Non-goals

- A sandbox for untrusted plugins.
- Decorator/reflection DI.
- Service locator globals.
- Hot-swapping dependencies while requests are in flight.
- A plugin marketplace in v1.

## Plugin contract

```ts
import type { App, Plugin } from "qutivex";

const analytics: Plugin = {
  name: "@acme/qutivex-analytics",
  version: "1.2.0",
  qutivex: ">=0.6.0 <1.0.0",
  requires: ["@acme/qutivex-auth"],

  async setup(app, config) {
    const service = await createAnalyticsClient(config.token);
    app.service(analyticsToken, () => service);

    app.get("/analytics/health", () => service.health());

    return async () => {
      await service.close();
    };
  },
};

const app = new App({
  plugins: [auth, analytics],
});
```

Rules:

- Plugins are passed explicitly to `new App({ plugins })`.
- `setup` runs once during startup, in dependency order.
- `setup` may return a teardown function; teardown runs in reverse order.
- `requires` is checked against registered plugin names.
- Cycles and missing dependencies fail before the server binds.
- Duplicate plugin names fail with the conflicting versions.
- Version compatibility uses a declared semver range; invalid ranges fail at
  startup.
- Plugin config is passed explicitly, not read from a global.

### What plugins may add

- Routes.
- Application services.
- Shutdown/startup hooks.
- OpenAPI metadata.
- Validation providers? **No**—schema adapters are core contracts.
- Arbitrary global middleware? Only through the official middleware contract.

### Trust boundary

Plugins are application code. They can access the filesystem, network,
environment, and database services the app provides. The docs will state this
plainly. There is no sandbox, permission prompt, or capability token in v1.

## Dependency injection

### Scopes

| Scope | Lifetime | Example |
| --- | --- | --- |
| **Application** | One per app, created at startup | Database pool, AI client, mailer |
| **Request** | One per HTTP request | Transaction, current user, request-scoped cache |
| **Transient** | New on every resolution | Rare; only with a demonstrated use case |

Transient scope is deliberately limited until a real need appears.

### Tokens and types

```ts
const dbToken = createServiceToken<Database>("Database");

app.service(dbToken, async () => createDatabase(settings.database));

app.get("/users", async (ctx) => {
  const db = ctx.get(dbToken); // typed as Database
  return db.users.list();
});
```

- Tokens carry the service type.
- Application services initialize asynchronously at startup.
- `ctx.get()` is synchronous after startup; request-scoped factories may be
  async and are initialized lazily once.
- Missing or cyclic dependencies throw at startup with the dependency path.
- Teardown runs in reverse initialization order.

### Overrides in tests

```ts
const app = new App({
  plugins: [dbPlugin],
  overrides: {
    [dbToken]: createMemoryDatabase(),
  },
});
```

- Overrides are explicit and typed.
- Overrides may only replace existing tokens; typo detection is part of startup
  validation.
- Tests should not need to mutate module-level singletons.

### Performance

- Resolve the dependency graph and service factories at startup.
- Do not scan metadata or reflect on every request.
- Request scope uses a small map, not a proxy or global async context unless
  Bun requires it.
- Benchmark routes with zero, one, and three request-scoped dependencies.

## Lifecycle ordering

```text
app created
  → plugins metadata validated
  → dependency graph validated
  → plugin setup (dependency order)
  → application services initialized (dependency order)
  → server starts
  → requests
  → server stops accepting
  → request hooks drain
  → application services disposed (reverse)
  → plugin teardown (reverse)
  → stopped
```

A plugin setup failure marks the app `failed` and runs already-created teardown
functions.

## Testing

- Duplicate plugin name.
- Missing plugin dependency.
- Plugin dependency cycle.
- Incompatible plugin version.
- Duplicate service token.
- Missing service dependency and cycle.
- Async service initialization and disposal order.
- Request-scoped isolation across concurrent requests.
- Test override replaces the real service.
- Plugin route and hook contribution.
- Startup rollback after partial failure.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Global plugin registry | Hidden ordering and test leakage. |
| Decorator DI | Reflection, metadata, and heavier onboarding. |
| `import` side effects for plugins | Non-deterministic and hard to test. |
| Sandboxing plugins | Not technically credible for arbitrary JS; document trust instead. |
| Transient-first container | Harder to reason about; adds cost without a use case. |

## Open questions

- Exact `Plugin` type naming and whether `setup` receives a config generic.
- How middleware is registered by plugins without a stable middleware RFC.
- Whether request scope uses `AsyncLocalStorage` compatibility or explicit
  context passing.
