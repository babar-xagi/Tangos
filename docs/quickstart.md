# 🚀 Quickstart

Get a Qutivex app running in about **five minutes**.

> **You are here:** Phase 2. The core HTTP API works. Validation, OpenAPI, the
> CLI, database, auth, admin, and AI arrive in later phases.

---

## 0️⃣ What you need

| Requirement | Version |
| --- | --- |
| Bun | **1.4.4** |
| TypeScript | installed by `bun install` (**7.0.2**) |
| Git | any recent version |
| Node.js | ❌ not required |

Check Bun:

```sh
bun --version
```

Expected: `1.4.4`.

---

## 1️⃣ Install

```sh
cd qutivex
bun install --frozen-lockfile
```

---

## 2️⃣ Run the example

```sh
bun run example
```

You should see:

```text
  Qutivex Hello
  ➜  http://127.0.0.1:3000/
  2 routes | 3ms
```

Test it:

```sh
curl http://127.0.0.1:3000/
# {"message":"Hello from Qutivex 👋","framework":"Qutivex","phase":2}

curl http://127.0.0.1:3000/health
# {"status":"ok","phase":2}

curl -i http://127.0.0.1:3000/nope
# HTTP/1.1 404 Not Found
# {"error":{"code":"NOT_FOUND","message":"Not Found"}}
```

Stop with `Ctrl+C`.

---

## 3️⃣ Your first app

Create `my-app.ts`:

```ts
import { App } from "qutivex";

const app = new App({ name: "My API" });

app.get("/", () => ({
  message: "Hello, Qutivex! 👋",
}));

app.get("/health", () => ({ status: "ok" }));

await app.run({ port: 3000 });
```

Run it:

```sh
bun run my-app.ts
```

That is the whole "hello world". No decorators, no config file, no boilerplate.

---

## 4️⃣ Add routes

```ts
app.get("/", () => "Hello!");
app.post("/users", () => ({ created: true }));
app.put("/users", () => ({ replaced: true }));
app.patch("/users", () => ({ updated: true }));
app.delete("/users", () => undefined);
app.options("/users", () => undefined);
app.head("/users", () => undefined);
```

Rules:

- Register routes **before** `run()`/`listen()`.
- Paths must start with `/`.
- Duplicate method + path is an error at startup.
- **Phase 2 matches exact paths only.** `/users/:id` arrives in Phase 3.

Chain routes if you like:

```ts
app
  .get("/health", () => ({ status: "ok" }))
  .get("/version", () => ({ version: "0.0.0" }));
```

---

## 5️⃣ Return the right thing

| You return | Client receives |
| --- | --- |
| `{ ok: true }` | `200 application/json` |
| `"hello"` | `200 text/plain` |
| `new Response(...)` | Your response, unchanged |
| `undefined` | `204 No Content` |
| `throw HttpError.notFound()` | `404` with the standard error body |

```ts
app.get("/text", () => "plain text");
app.get("/json", () => ({ answer: 42 }));
app.get("/empty", () => undefined);
app.get("/custom", () => new Response("teapot", { status: 418 }));
```

---

## 6️⃣ Handle expected errors

```ts
import { HttpError } from "qutivex";

app.get("/private", () => {
  throw HttpError.unauthorized("Sign in first");
});

app.get("/missing", () => {
  throw HttpError.notFound("User not found");
});
```

Response:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "Sign in first" } }
```

Any other thrown error becomes a **safe** `500`; the message and stack are not
exposed.

---

## 7️⃣ Use the request context

```ts
app.get("/whoami", (ctx) => ({
  method: ctx.method,
  path: ctx.path,
  url: ctx.url.href,
}));
```

Phase 2 context fields: `request`, `url`, `method`, `path`. Phase 3 adds
`params`, `query`, `headers`, `cookies`, and middleware state.

---

## 8️⃣ Start and stop cleanly

```ts
const info = await app.listen({ port: 0 }); // ephemeral port
console.log(info.url.href);

app.onShutdown(async () => {
  // close a client, flush a queue, etc.
});

await app.stop(true); // force-close connections
```

- `run()` is an alias for `listen()`.
- `listen()` on a running app returns the same address.
- `stop()` is idempotent; calling it twice is safe.
- Hooks run last-registered-first.
- A failed hook rejects with `ServerShutdownError` and calls `onError`.

---

## 9️⃣ Test without a socket

```ts
import { expect, test } from "bun:test";
import { App } from "qutivex";

test("health", async () => {
  const app = new App();
  app.get("/health", () => ({ status: "ok" }));

  const response = await app.fetch(new Request("http://localhost/health"));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});
```

`app.fetch()` uses the same routing and error behavior as the live server.

---

## 🔟 Next steps

- Read the full [App API](api/app.md).
- Learn the [error model](api/errors.md).
- See how the [example](../examples/hello) is put together.
- Check the [roadmap](../ROADMAP.md) for what is coming.
- Run the quality gate: `bun run validate`.

---

## 🆘 Common problems

### `bun: command not found`

Install Bun 1.4.4:

```sh
curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.4"
```

### Port 3000 is busy

Use another port:

```sh
PORT=8080 bun run example
```

The example defaults to `127.0.0.1` so it is not exposed to your network.

### Biome cannot find its native binary

This usually means a Windows `node_modules` tree is being used from WSL (or the
reverse). Reinstall inside the current environment:

```sh
rm -rf node_modules
bun install --frozen-lockfile
```

### Type errors in the editor

Run:

```sh
bun run typecheck
```

The repo pins TypeScript 7.0.2; make sure your editor uses the workspace
version.
