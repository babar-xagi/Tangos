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
`Cache-Control: no-store`. Every response, including errors, includes
`x-request-id`.

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
| `HttpError.methodNotAllowed()` | 405 | `METHOD_NOT_ALLOWED` | ✅ |
| `HttpError.conflict()` | 409 | `CONFLICT` | ✅ |
| `HttpError.payloadTooLarge()` | 413 | `PAYLOAD_TOO_LARGE` | ✅ |
| `HttpError.unsupportedMediaType()` | 415 | `UNSUPPORTED_MEDIA_TYPE` | ✅ |
| `HttpError.unprocessableEntity()` | 422 | `UNPROCESSABLE_ENTITY` | ✅ |
| `HttpError.tooManyRequests()` | 429 | `TOO_MANY_REQUESTS` | ✅ |
| `HttpError.internal()` | 500 | `INTERNAL_SERVER_ERROR` | ❌ (hidden) |
| `HttpError.serviceUnavailable()` | 503 | `SERVICE_UNAVAILABLE` | ❌ (hidden) |
| `HttpError.requestTimeout()` | 504 | `REQUEST_TIMEOUT` | ✅ |

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

## 📦 Body and routing errors

| Situation | Status | Code |
| --- | ---: | --- |
| Unknown route | 404 | `NOT_FOUND` |
| Known path, wrong method | 405 | `METHOD_NOT_ALLOWED` |
| Malformed path encoding | 400 | `INVALID_PATH_ENCODING` |
| Missing/wrong JSON content type | 415 | `UNSUPPORTED_MEDIA_TYPE` |
| Empty JSON body | 400 | `INVALID_JSON` |
| Invalid JSON | 400 | `INVALID_JSON` |
| Body over `maxBodyBytes` | 413 | `PAYLOAD_TOO_LARGE` |
| Wrong form content type | 415 | `UNSUPPORTED_MEDIA_TYPE` |
| Invalid form data | 400 | `INVALID_FORM_DATA` |
| Request timeout | 504 | `REQUEST_TIMEOUT` |
| Middleware called `next()` twice | 500 | `MIDDLEWARE_NEXT_CALLED_TWICE` |
| Middleware returned a non-Response | 500 | `INVALID_MIDDLEWARE_RESULT` |
| Handler output not serializable | 500 | `RESPONSE_SERIALIZATION_FAILED` |

405 responses also include an `Allow` header.

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
    logger.error({ error, requestId: context.request?.headers.get("x-request-id") });
  },
});

app.onError((error) => {
  // Additional observer. Throwing here never breaks the response.
});
```

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

## 🔁 Serialization failures

| Situation | Result |
| --- | --- |
| Circular object | `500 RESPONSE_SERIALIZATION_FAILED` |
| `BigInt` | `500 RESPONSE_SERIALIZATION_FAILED` |
| Symbol returned | `500 RESPONSE_SERIALIZATION_FAILED` |
| Thrown non-`Error` value | `500 INTERNAL_SERVER_ERROR` |
| Error thrown inside SSE stream | Stream errors; response status already sent |

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

Test the status, the code, the exposed/hidden message, and the `Allow` header for
405 cases.

---

## ✅ Error-handling checklist

- Use `HttpError` for expected 4xx failures.
- Keep 5xx messages internal; pass details to `onError`, not the client.
- Never return stack traces, SQL, tokens, or file paths.
- Give domain errors stable `code` values.
- Test the status **and** the JSON envelope.
- Do not use errors for control flow that should be a normal response.
- Treat middleware and body-reader errors as first-class cases.

---

## 🔭 Coming later

- Validation issues (`422`) with field paths and redaction — Phase 4.
- Problem Details (`application/problem+json`) support — evaluate later.
- Database and AI provider error mapping — Phases 7 and 11.
- Structured audit/security events — Phase 8/13.
