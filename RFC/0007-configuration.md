# RFC 0007: Configuration, settings, and profiles

- **Status:** Accepted ✅ (Phase 5 direction)
- **Target:** Phase 5
- **Author:** Qutivex maintainers
- **Created:** 2026-10-26

## Summary

Qutivex applications have **three primary files**:

- `main.ts` — composition and routes.
- `settings.ts` — typed settings and module configuration.
- `config.toml` — environment-specific, non-secret configuration.

Secrets live in environment variables or a secret manager. Configuration is
validated **once at startup** with actionable errors.

## Goals

- A small, understandable configuration model.
- Typed settings with inference at the point of use.
- Explicit precedence and profile behavior.
- No secrets in committed TOML.
- Fail fast on invalid or missing production settings.
- Predictable reload rules; security/database settings never change silently.

## Precedence

```text
defaults  <  config.toml profile  <  environment variables  <  explicit programmatic overrides
```

Later sources win. Overrides are explicit in `main.ts` or the test harness.

## `settings.ts`

```ts
import { defineSettings, env } from "qutivex/settings";

export const settings = defineSettings({
  app: {
    name: "My API",
    environment: env.enum(["development", "test", "staging", "production"], {
      default: "development",
    }),
    port: env.number({ default: 3000, min: 0, max: 65535 }),
  },
  database: {
    url: env.secret("DATABASE_URL"),
    poolSize: env.number({ default: 10, min: 1, max: 100 }),
    ssl: env.boolean({ default: false }),
  },
  ai: {
    defaultProvider: env.string({ default: "openai" }),
    apiKey: env.secret("AI_API_KEY").optional(),
  },
});
```

Rules:

- Settings are typed and inferred; no `any` or stringly-typed access.
- Required secrets fail at startup when missing.
- Validation errors include the source (`env`, TOML file, override) and key path.
- `settings` is a plain data object; no hidden getters or network calls.
- Tests can construct settings directly without touching the environment.

## `config.toml`

```toml
[development]
app_name = "My API (dev)"
port = 3000

[development.database]
pool_size = 5

[production]
app_name = "My API"

[production.database]
pool_size = 25
ssl = true
```

- One file, multiple profiles.
- The active profile comes from `QUTIVEX_PROFILE` or `NODE_ENV`, in that order.
- Unknown keys are errors in strict mode (recommended) and warnings in a
  compatibility mode.
- Environment substitution is explicit: `${VAR}` and `${VAR:-default}`.
- Values from TOML are non-secret; a committed secret is a security bug.

## Loading and validation

At startup:

1. Determine the profile.
2. Parse TOML once.
3. Merge defaults and profile values.
4. Apply environment values.
5. Apply explicit overrides.
6. Validate the final typed settings.
7. Freeze the settings object.

Failure output names the file/line/key where possible:

```text
Invalid configuration:
  config.toml:14  database.pool_size  expected integer between 1 and 100, received "many"
  env             DATABASE_URL         required secret is missing
```

No server starts with invalid configuration.

## Reload policy

- Changing application display settings may be supported by a future dev-server
  reload.
- **Never** silently mutate live database, auth, secret, or security settings.
- A process restart is required for those changes.
- The dev server may restart the process; it must not hot-swap security state.

## Profiles

- `development` — verbose banner, local defaults, no production secrets.
- `test` — deterministic, no network by default, explicit test fixtures.
- `staging` — production-like, separate secrets.
- `production` — banner off, docs off by default, required secrets enforced.

Profiles are configuration presets, not security boundaries. Production
hardening still requires deployment-level controls.

## Secrets

- Provide `env.secret()`; redact values in errors, logs, and diagnostics.
- Never expose secrets through `settings` serialization.
- No secret values in generated docs, health endpoints, or debug pages.
- Document rotation for each integration.

## Testing

- Precedence for every layer.
- Unknown keys (strict vs compatibility).
- Missing required secrets.
- Type/range validation and actionable errors.
- Profile selection (valid, missing, unknown).
- Environment substitution including defaults and malformed values.
- Frozen settings after startup.
- No secrets in error output.
- Test settings bypass environment cleanly.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| `.env`-only configuration | Cannot express profiles or structured config. |
| JSON/YAML config | TOML gives comments and clear sections; JSON lacks comments. |
| A global `process.env` bag | Untyped, unvalidated, and leaks secrets everywhere. |
| Hot-reload all settings | Unsafe for security/database state. |
| CDK-style code config | Powerful but too much for the three-file promise. |

## Open questions

- Whether `${VAR}` substitution in TOML is allowed for non-secrets only.
- Exact schema helper names (`env.number` vs `number()`).
- How plugin settings are namespaced without collisions.
- Whether `config.toml` can be split per environment in large projects.
