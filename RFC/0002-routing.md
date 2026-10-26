# RFC 0002: Routing

- **Status:** Accepted ✅ (implemented in Phase 3)
- **Target:** Phase 3
- **Author:** Qutivex maintainers
- **Created:** 2026-10-26

> **Implementation note:** Phase 3 implemented the pattern compiler and matcher
> in `@qutivex/router` instead of configuring Bun's native route table. The
> matcher supports static/param/wildcard priority, groups, metadata, 405, and
> WebSocket matching. Benchmark comparison with native routing is still pending;
> see [ADR 0003](../docs/decisions/0003-route-matching.md).

## Summary

Phase 2 ships an **exact-match route table** inside core. Phase 3 adds static
routes, path parameters, wildcards, route groups, metadata, and introspection,
using **Bun's native route table** wherever it is a good fit.

We will not write a custom radix tree until benchmarks and features prove the
native router insufficient.

## Goals

- Predictable route priority.
- Typed path parameters where feasible.
- One registration model for all HTTP methods.
- Fast startup and request matching.
- Clear conflict diagnostics.
- No hidden route-level behavior.
- Introspection for CLI (`qutivex routes`) and OpenAPI.

## Phase 2 baseline (historical)

- Exact path equality after `URL.pathname`.
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD.
- HEAD falls back to GET when no explicit HEAD route exists.
- Duplicate method/path throws `ConfigurationError`.
- Unknown path returns the standard 404 envelope.
- Registration only before startup.

Limitations: no params, wildcards, groups, prefixes, metadata, or 405 response.
These are deliberate Phase 3 items.

## Phase 3 proposal

### Route syntax

| Pattern | Example | Matches |
| --- | --- | --- |
| Static | `/health` | Only `/health` |
| Parameter | `/users/:id` | `/users/42`; `params.id = "42"` |
| Multi-parameter | `/orgs/:orgId/users/:userId` | Two params |
| Wildcard | `/assets/*` | Any remaining path; `params["*"]` |
| Root | `/` | Only `/` |

- Parameters match one non-empty segment.
- Percent-decoding is applied per segment after matching.
- Static segments win over parameter segments; parameter segments win over
  wildcards.
- Duplicate param names in one path are rejected at startup.
- Regex routes are **not** part of v1.

### Native vs custom

Implementation order:

1. Register static and parameterized routes in Bun's native route table.
2. Use a controlled fallback for features the native table cannot express.
3. Measure routing overhead against native `Bun.serve()`.
4. Only build a custom matcher if a measured limitation or required semantic
   cannot be met.

This preserves the performance thesis and avoids maintaining a router for its
own sake.

### Groups and prefixes

```ts
const api = app.group("/api/v1", { tags: ["api"] });

api.get("/users", listUsers);
api.post("/users", createUser);
```

- Groups inherit middleware and metadata.
- Prefixes are normalized once at registration.
- Group-local `onShutdown` hooks are not a thing; app-level lifecycle only.
- Nested groups are allowed with duplicate-prefix detection.

### Metadata and introspection

```ts
app.get("/users/:id", {
  name: "users.show",
  tags: ["users"],
  summary: "Get one user",
  metadata: { auth: true },
}, showUser);
```

Phase 3 exposes `name` and free-form `metadata` through `app.routes`. OpenAPI
tags/summaries arrive with Phase 4.

### Method behavior

- No match at all: `404` with the standard envelope.
- Path matches another method: `405 Method Not Allowed` with an `Allow` header
  listing supported methods.
- `OPTIONS` has no automatic CORS response; CORS is Phase 8.
- `HEAD` retains the Phase 2 fallback and body stripping.
- Trailing slashes are distinct by default. A future config may redirect or
  normalize; no silent matching.

### Conflict detection

Startup fails with an actionable message for:

- Duplicate method + normalized path.
- Two parameter routes with the same shape at the same priority
  (`/users/:id` vs `/users/:name`).
- A wildcard that can never match because a broader wildcard exists.
- Invalid parameter syntax or empty segments.

### Registration lifecycle

- Routes are frozen at `listen()`.
- Late registration throws `LifecycleError`.
- Route definitions are immutable after registration.
- Route count and list are available before startup.

## Typed params (Phase 4 coordination)

Phase 3 may expose `params` as `Record<string, string>`. Phase 4 can derive
literal param keys from the path string:

```ts
app.get("/users/:id", (ctx) => {
  // ctx.params.id is typed as string
});
```

If full literal inference requires route generics, it must not make normal
routes require annotations. Type tests gate this work.

## Testing

- Static, param, wildcard, nested group, and root matching.
- Priority: static > param > wildcard.
- Percent-encoded values and malformed encodings.
- Duplicate/conflicting route startup errors.
- 404 vs 405 and `Allow` header.
- HEAD fallback and explicit HEAD.
- Introspection output.
- Route table remains frozen after startup.
- Performance: route registration and matching measured separately from I/O.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Custom radix router now | Unproven need; adds maintenance and risk before benchmarks. |
| Regex-first routing | Slower, harder to type, easier to misuse. |
| File-system routing | Great for some apps, but not the explicit API Qutivex promises. |
| Decorator routes | Contradicts the fluent API decision in RFC 0001. |
| Auto-normalizing trailing slash | Surprising; explicit matching is safer. |

## Open questions

- Optional parameters (`/users/:id?`) — defer until validation and OpenAPI need it.
- Whether groups can add per-group error handlers in v1.
- How route names interact with OpenAPI operation IDs.
