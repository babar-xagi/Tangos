# 🛡️ Security Policy

## 📌 Project status

Qutivex is pre-release software at version `0.0.0`. It is **not** production
ready, has no supported release line, and does not claim enterprise security.
The implemented surface is through **Phase 3**: app lifecycle, parameterized
routes, middleware, request context, bounded body parsing, request IDs, SSE, and
WebSockets.

## ✅ Supported versions

| Version | Supported |
| --- | :---: |
| `0.0.x` | ❌ pre-release only |

A supported-version policy begins with the first public release. Security work is
planned in Phases 8 and 15 of [ROADMAP.md](ROADMAP.md), with threat models and
ASVS/API Top 10 reviews.

## 🚨 Reporting a vulnerability

**Do not open a public issue, discussion, or pull request for a suspected
vulnerability.**

Use the repository's private vulnerability reporting channel:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include affected version/commit, reproduction steps, impact, and any
   suggested fix.

If private reporting is unavailable, contact the maintainers privately and ask
for a secure channel before sharing details.

Please include:

- exact commit or version;
- runtime, OS, and dependency versions;
- a minimal reproduction;
- the security impact you believe applies;
- whether the issue is already public.

## ⏱️ What to expect

This is a pre-release, maintainer-led project without a 24/7 security team. We
will acknowledge reports as soon as practical, investigate, and coordinate a fix
and disclosure. No bug bounty or response-time SLA is offered at this stage.

## 🔐 Current security properties (Phase 3)

| Property | Implementation |
| --- | --- |
| Internal error redaction | Unknown errors return a generic `500`; no message, stack, or cause. |
| Intentional error control | `HttpError` exposes 4xx messages only; 5xx messages are hidden by default. |
| Safe invalid statuses | Statuses outside `400–599` are normalized to a safe `500`. |
| Error caching | Error responses send `Cache-Control: no-store`. |
| Serialization failures | Circular/BigInt/symbol values become a safe `500`. |
| Error observer isolation | A throwing `onError` hook cannot break the response. |
| Body limits | `maxBodyBytes` (default 1 MiB), enforced from Content-Length and streamed bytes. |
| Content-type checks | JSON/`+json` and form readers reject wrong types with `415`. |
| Path encoding | Malformed percent-encoding returns `400`, never crashes the server. |
| Middleware guards | Double `next()` and invalid middleware results become safe `500`s. |
| Request IDs | Safe inbound ID or UUID; set on every response. |
| Cancellation | Client abort and timeout propagate through `ctx.signal`. |
| Port binding | `SO_REUSEPORT` is disabled so conflicts fail visibly. |
| WebSocket isolation | Handler failures are caught, reported, and closed with `1011`. |
| Lifecycle integrity | Configuration freezes at startup; shutdown is idempotent. |
| Optional-module isolation | Core has no third-party runtime dependencies and no Bun API usage. |

### Known gaps

- No authentication, authorization, sessions, CSRF, CORS, rate limits, or
  security headers yet.
- No WebSocket message-size/rate limit policy beyond Bun defaults.
- No request-body streaming API; bodies are buffered within the limit.
- No fuzzing, dependency scanning, secret scanning, or external review.
- No TLS/termination guidance yet.
- No tenant isolation model yet.
- Logging is convenience-grade; structured redaction/audit arrives in Phase 8/13.

Do not deploy this as a public production service.

## 🎯 Scope

During Phase 3 the relevant surface is:

- the `qutivex` / `@qutivex/core` / `@qutivex/router` /
  `@qutivex/http-bun` packages;
- route matching, middleware, body parsing, limits, timeouts, and errors;
- SSE and WebSocket upgrade/message handling;
- lifecycle and shutdown behavior;
- the example and repository scripts.

Reports about validation, authentication, admin, file upload, AI tools, or
multi-tenancy become relevant when those phases land. Threat models for those
surfaces are accepted in the relevant RFCs (for example RFC 0006).

## 🧭 Threat model sketch

| Threat | Current mitigation | Future work |
| --- | --- | --- |
| Information leakage via errors | Generic 500s, redaction, no stack/cause | Structured audit logs |
| Resource exhaustion | Body limits, timeouts, configurable port/host | Rate limits, concurrency caps (Phase 8) |
| Request smuggling / parser bugs | Native Bun request parsing; no custom HTTP parser | Version review, fuzz tests |
| Route confusion | Static/param/wildcard priority, conflict detection, 405 | Benchmark + review (ADR 0003) |
| Middleware bypass | Single ordered pipeline, next guard, tests | Auth middleware + policy tests |
| WebSocket abuse | Upgrade validation, handler catch/close, Bun defaults | Message limits, heartbeat, backpressure |
| Shutdown data loss | Graceful stop, reverse hooks | Drain timeout, readiness (Phase 13) |
| Dependency compromise | Exact pins, lockfile | Scanning/inventory (Phase 8/15) |
| Secret leakage | No secrets in core; env guidance | Secret redaction across logs/traces |

## 🧰 Dependency and secret hygiene

- Do not commit secrets, tokens, or private keys. `.env` files are ignored.
- Report a committed secret immediately so it can be rotated and removed from
  history.
- Dependencies are pinned exactly and reviewed deliberately.
- Dependency and secret scanning arrive in later phases; their absence is a known
  gap, not an implied guarantee.

## 📣 Disclosure

We will coordinate disclosure with the reporter and publish an advisory once a
fix is available for a supported release. Pre-release issues may be fixed on
`main` without a CVE when no released version is affected.
