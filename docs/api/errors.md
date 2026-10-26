# 💥 Errors

Qutivex uses **one error shape** for framework-generated responses and never
leaks internal details.

```json
{ "error": { "code": "NOT_FOUND", "message": "Not Found" } }
```

---

## 🧾 The envelope

| Field | Description |
| --- | --- |
| `error.code` | Stable, uppercase machine-readable code. |
| `error.message` | Safe human-readable message. |

Additional fields (for example validation `issues`) arrive with Phase 4. Clients
should tolerate unknown fields.

Content type: `application/json; charset=utf-8`. Error responses include
`Cache-Control: no-store`.

---

## 🎯 `HttpError`

Throw an `HttpError` when the failure is expected and the client should know.

```ts
import { HttpError } from "qutivex";

app.get("/private", () => {
  throw HttpError.unauthorized("Sign in first");
});

app.get("/missing", () => {
  throw HttpError.notFound("User not found");
});
```

### Factories

| Factory | Status | Code | Message exposed? |
| --- | ---: | --- | :---: |
| `HttpError.badRequest()` | 400 | `BAD_REQUEST` | ✅ |
| `HttpError.unauthorized()` | 401 | `UNAUTHORIZED` | ✅ |
| `HttpError.forbidden()` | 403 | `FORBIDDEN` | ✅ |
| `HttpError.notFound()` | 404 | `NOT_FOUND` | ✅ |
| `HttpError.conflict()` | 409 | `CONFLICT` | ✅ |
| `HttpError.unprocessableEntity()` | 422 | `UNPROCESSABLE_ENTITY` | ✅ |
| `HttpError.tooManyRequests()` | 429 | `TOO_MANY_REQUESTS` | ✅ |
| `HttpError.internal()` | 500 | `INTERNAL_SERVER_ERROR` | ❌ (hidden) |
| `HttpError.serviceUnavailable()` | 503 | `SERVICE_UNAVAILABLE` | ❌ (hidden) |

### Custom status or code

```ts
throw new HttpError("Short and stout", {
  status: 418,
  code: "TEAPOT",
});
```

- Statuses outside `400–599` become a safe `500`.
- `expose` defaults to `true` for 4xx and `false` for 5xx.
- Set `expose: false` whenever a message may contain sensitive information.

---

## ⚠️ Unexpected errors

Anything else is normalized:

```ts
app.get("/boom", () => {
  throw new Error("database password is hunter2");
});
```

```json
{ "error": { "code": "INTERNAL_SERVER_ERROR", "message": "Internal Server Error" } }
```

- No stack trace.
- No original message.
- No cause.
- No SQL, secrets, or file paths.

The `onError` hook still receives the original error for operators:

```ts
const app = new App({
  onError(error, context) {
    logger.error({ error, state: context.state }, "request failed");
  },
});
```

An `onError` hook that throws cannot break the response.

---

## 🧱 Custom framework errors

```ts
import { QutivexError } from "qutivex";

class BillingError extends QutivexError {
  constructor(message: string) {
    super(message, {
      code: "BILLING_ERROR",
      status: 402,
      expose: true,
    });
  }
}
```

Use this for domain errors that need a stable code and status. For simple cases,
`HttpError` is enough.

---

## 🔁 Response serialization failures

| Situation | Result |
| --- | --- |
| Circular object | `500 RESPONSE_SERIALIZATION_FAILED` |
| `BigInt` | `500 RESPONSE_SERIALIZATION_FAILED` |
| Symbol returned | `500 RESPONSE_SERIALIZATION_FAILED` |
| Thrown non-`Error` value | `500 INTERNAL_SERVER_ERROR` |

Serialization failures are programming errors: the client gets a safe response,
and `onError` gets the original value.

---

## 🧪 Testing errors

```ts
import { expect, test } from "bun:test";
import { App, HttpError } from "qutivex";

test("unauthorized", async () => {
  const app = new App();
  app.get("/private", () => {
    throw HttpError.unauthorized("Sign in first");
  });

  const response = await app.fetch(new Request("http://localhost/private"));

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({
    error: { code: "UNAUTHORIZED", message: "Sign in first" },
  });
});
```

---

## ✅ Error-handling checklist

- Use `HttpError` for expected 4xx failures.
- Keep 5xx messages internal; pass details to `onError`, not the client.
- Never return stack traces, SQL, tokens, or file paths.
- Give domain errors stable `code` values.
- Test the status **and** the JSON envelope.
- Do not use errors for control flow that should be a normal response.

---

## 🔭 Coming later

- Validation issues (`422`) with field paths and redaction — Phase 4.
- Request IDs in error envelopes — Phase 3/13.
- Problem Details (`application/problem+json`) support — evaluate later.
- Error mapping for database and AI providers — Phase 7/11.
