# RFC 0003: Validation, type inference, and OpenAPI

- **Status:** Accepted ✅ (Phase 4 direction)
- **Target:** Phase 4
- **Author:** Qutivex maintainers
- **Created:** 2026-10-26

## Summary

One schema drives **runtime validation**, **TypeScript inference**, and
**OpenAPI 3.1**. Qutivex adopts the **Standard Schema** interface instead of
inventing a schema library, with first-party adapters and helpers for Zod,
Valibot, and TypeBox.

## Goals

- Validate body, params, query, headers, and cookies.
- Infer validated values in handlers without manual generics.
- Generate accurate OpenAPI from the same definitions.
- Fail safely and consistently, with redacted errors.
- Prepare validators at startup, not per request.
- Support response validation in development/test without penalizing production.

## Non-goals

- A proprietary schema DSL.
- A serializer/code generator for v1.
- Supporting every schema feature of every library.
- Runtime reflection of arbitrary TypeScript types.

## Schema contract

Use the [Standard Schema](https://standardschema.dev/) interface:

```ts
interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) =>
      | { value: Output }
      | { issues: ReadonlyArray<StandardSchemaV1.Issue> }
      | Promise<{ value: Output } | { issues: ReadonlyArray<StandardSchemaV1.Issue> }>;
  };
}
```

Adapters:

- **Zod** — first-class examples and docs.
- **Valibot** — bundle-size-conscious users.
- **TypeBox** — JSON Schema-native users and OpenAPI precision.
- **JSON Schema** — read-only validation/OpenAPI import, not the authoring API.

Unsupported features produce a startup error naming the schema path and vendor,
not a silent degradation.

## Declaring validation

```ts
import { schema } from "qutivex/validation";

app.post("/users", {
  body: schema.object({
    name: schema.string().min(2),
    email: schema.email(),
  }),
  response: {
    201: schema.object({ id: schema.string(), name: schema.string() }),
  },
}, (ctx) => {
  // ctx.body is inferred from body
  return { id: "u_1", name: ctx.body.name };
});
```

The exact property names (`body`, `params`, `query`, `headers`, `cookies`,
`response`) are fixed here. Validation runs before the handler.

## Error policy

Use **422 Unprocessable Entity** for validation failures. Choose one convention
and keep it:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "issues": [
      { "location": "body", "path": ["email"], "code": "invalid_format", "message": "Invalid email" }
    ]
  }
}
```

Rules:

- Never echo submitted secret values (passwords, tokens, cookies).
- Header/cookie errors name the field but not the value.
- 4xx by default; malformed JSON is `400`, schema failure is `422`.
- Custom messages come from the schema; fallback messages are generic.
- Issue lists are capped (for example 50) to avoid response amplification.
- Validation errors are not logged with raw bodies at info level.

## Type inference

Target DX:

```ts
app.post("/users", { body: userCreate }, (ctx) => {
  ctx.body.name;        // string
  ctx.body.email;       // string
  // @ts-expect-error unknown field
  ctx.body.admin;
});
```

- No generic annotations required on normal handlers.
- Optional fields remain optional; defaults are respected by the schema adapter.
- Transformations may change input to output; handlers see the **output** type.
- Type tests cover Zod, Valibot, and TypeBox adapters.
- If inference requires complex generics, simplify the API rather than shipping
  unreadable compiler errors.

## Response validation

- Enabled by default in development and test; off in production.
- Validates only when a response schema is declared.
- Failure is a development/test error (500 + diagnostic), never a silent
  fallback.
- Response schemas also drive OpenAPI.

## OpenAPI 3.1

Generated at startup from the route registry and schemas.

Requirements:

- Operation IDs from route names or method + path.
- Tags, summaries, descriptions, examples, deprecation.
- Path/query/header/cookie parameters with required flags.
- Request bodies with content types.
- Responses, including the standard error envelope.
- Reusable components for repeated schemas.
- Security schemes: bearer, cookie session, API key, OAuth metadata.
- JSON and YAML endpoints; Swagger UI or a maintained equivalent.
- Docs path configurable and disabled in production by default.
- Generated docs validated by an independent OpenAPI validator in CI.
- Snapshot/contract tests catch accidental schema drift.

## Performance

- Compile/prepare validators once at startup.
- Cache schema-to-OpenAPI conversion.
- Do not parse JSON for routes without a body schema.
- Keep validation allocation proportional to input; no per-request schema
  introspection.
- Benchmark validation separately from routing and serialization.

## Security

- Redact sensitive fields in validation issues and logs.
- Reject unknown fields by default for write schemas? **Decision:** no global
  strip/forbid; schema authors choose. Document both. The admin and auth flows
  must use strict schemas.
- Cap body size (Phase 3/8) and issue count.
- Do not reflect schema internals or library stack traces to clients.

## Testing

- Valid/invalid body, params, query, headers, cookies.
- 400 malformed JSON vs 422 schema failure.
- Redaction of passwords/tokens.
- Type inference and `@ts-expect-error` cases.
- OpenAPI snapshot + independent validation.
- Response validation on/off by environment.
- Benchmark of a validated POST route.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Custom schema DSL | Duplicates the ecosystem and creates migration friction. |
| Zod-only | Locks users into one library; Standard Schema avoids it. |
| Validate only via JSON Schema | Weaker TypeScript inference for common users. |
| 400 for all validation | Blurs malformed transport vs semantic validation; 422 is clearer. |
| Always validate responses | Production cost without user-visible benefit. |

## Open questions

- Exact `qutivex/validation` helper surface vs direct Standard Schema providers.
- Whether multipart/form-data is in Phase 4 or deferred to full-stack.
- How to represent unions/discriminated schemas cleanly in OpenAPI snapshots.
