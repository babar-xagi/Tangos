# RFC 0005: Database integration and migrations

- **Status:** Accepted ✅ (Phase 7 direction)
- **Target:** Phase 7
- **Author:** Qutivex maintainers
- **Created:** 2026-10-26

## Summary

Qutivex integrates **Drizzle ORM** rather than building a custom ORM.
PostgreSQL is the first production target; SQLite supports local development and
tests where behavior matches. Migrations, transactions, connection lifecycle, and
error mapping are framework concerns. Query construction stays Drizzle's.

## Goals

- A dependable database-backed application workflow.
- One documented migration path from development to production.
- Predictable connection lifecycle and graceful shutdown.
- Safe transaction ergonomics.
- Error messages that do not leak SQL, credentials, or schema internals.
- A model registry for the admin that is explicit and permission-aware.
- Test helpers for isolated database tests.

## Non-goals

- A custom query builder or ORM in 1.0.
- Automatic exposure of every table to admin or API.
- Automatic schema synchronization in production.
- Cross-database SQL translation beyond documented Drizzle support.
- Managing a database server.

## Initial support matrix

| Database | Status | Usage |
| --- | --- | --- |
| PostgreSQL | ✅ first production target | Primary examples, migrations, transactions |
| SQLite | ✅ development/tests where parity holds | Local apps, CI, fast tests |
| MySQL | 🟡 later, after adapter tests + demand | Not promised in 0.x |
| Other Drizzle dialects | ❌ until tested | No blanket support claim |

Exact server versions are pinned when the integration lands. The support policy
must list them; "Drizzle supports it" is not enough.

## Public surface

```ts
import { createDatabase } from "qutivex/database";
import { users } from "./models/users";

const db = createDatabase(settings.database);

app.service(databaseToken, () => db);
app.get("/users", async (ctx) => {
  const database = ctx.get(databaseToken);
  return database.select().from(users).limit(20);
});
```

Configuration includes:

- URL/connection string from environment, never committed TOML.
- Pool size, connection timeout, idle timeout.
- SSL mode and certificate paths where applicable.
- Statement/query timeout.
- Optional startup verification (`SELECT 1`) with a clear failure message.
- Opt-in query logging with redaction and sampling.

## Lifecycle

1. Validate configuration at startup.
2. Optionally verify connectivity with a bounded timeout.
3. Create the pool/connection.
4. Register disposal with app shutdown.
5. Stop accepting requests.
6. Wait for in-flight requests (drain timeout).
7. Close the pool; fail loudly if connections do not close in time.

A database failure during startup marks the app `failed`; it must not serve
requests with a half-initialized pool.

## Transactions

```ts
await db.transaction(async (tx) => {
  const user = await tx.insert(users).values(input).returning();
  await tx.insert(audit).values({ actorId, targetId: user[0].id });
  return user;
});
```

- Nested transactions use savepoints where the driver supports them.
- The framework documents isolation-level behavior per database.
- A transaction handle is request-scoped when the user asks for one; it is not
  created implicitly for every request.
- Rollback on thrown errors is automatic.
- Retries are **not** automatic inside transactions.

## Migrations

CLI integration (Phase 7/5):

```sh
qutivex db generate   # create SQL from schema changes
qutivex db migrate    # apply pending migrations
qutivex db status     # show applied/pending + drift
qutivex db seed       # run a documented seed script
```

Rules:

- Migrations are SQL files committed to the repository.
- Applying migrations is an explicit deployment step; no silent production
  schema sync.
- Drift checks fail CI when the schema and migrations disagree.
- Destructive migrations require an explicit confirmation in the CLI.
- Migration commands are idempotent where the underlying tool allows.
- Failed migrations report the statement and version without printing
  credentials.

## Error mapping

Translate database errors into safe framework errors:

| Condition | HTTP | Code |
| --- | --- | --- |
| Unique violation | 409 | `CONFLICT` |
| Foreign key violation | 409 | `RELATED_RECORD_MISSING` |
| Not-null violation | 422 | `VALIDATION_FAILED` |
| Query timeout | 504 | `DATABASE_TIMEOUT` |
| Connection unavailable | 503 | `DATABASE_UNAVAILABLE` |
| Unknown | 500 | `DATABASE_ERROR` |

- Never include raw SQL, parameter values, hostnames, or credentials.
- Logs may include a redacted query fingerprint and duration.
- `onError` receives the original cause for operators; clients do not.

## Model registry (admin boundary)

Admin needs metadata that Drizzle schemas do not safely imply:

```ts
registerModel({
  table: users,
  label: "Users",
  searchFields: ["email", "name"],
  listFields: ["id", "email", "name", "createdAt"],
  readOnlyFields: ["id", "createdAt"],
  permissions: {
    list: "users.list",
    update: "users.update",
    delete: false,
  },
});
```

- Registration is explicit; no "all tables" mode.
- Hidden/read-only fields are enforced server-side.
- Relations must be declared, not inferred from every foreign key.
- Admin query paths must respect tenant scope.
- Audit hooks attach to mutations, not reads, by default.

## Testing

- Connection lifecycle and shutdown with in-flight queries.
- Migration apply/rollback from a clean database.
- Drift detection.
- Transaction commit, rollback, and nested savepoints.
- Unique/FK/timeout error mapping.
- Redaction of query logs.
- Tenant-scoped admin queries.
- SQLite/PostgreSQL behavior differences documented and tested where claimed.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Custom ORM | A multi-year product; violates the small-core principle. |
| Prisma | Strong tooling, but its engine/runtime model adds weight and its own schema language. Drizzle is closer to SQL and Bun. |
| Kysely only | Excellent query builder, but Drizzle's schema/migration ecosystem fits the admin metadata path better. |
| Auto-sync schema in production | Unsafe and hides destructive changes. |
| Auto-expose all models to admin | Violates deny-by-default and tenant isolation. |

## Open questions

- Exact Drizzle major version and PostgreSQL/SQLite version matrix.
- Whether request-scoped transactions are provided automatically for admin.
- Migration lock strategy for multiple deploy replicas.
- How model metadata is shared between API docs and admin without duplication.
