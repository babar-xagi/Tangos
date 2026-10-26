# 👋 Hello example (Phase 3)

A small but complete Qutivex app: path/query params, JSON bodies, global
middleware, a route group, and Server-Sent Events.

```ts
import { App } from "qutivex";

const app = new App({ name: "Qutivex Hello" });

app.use(async (_ctx, next) => {
  const started = performance.now();
  const response = await next();
  response.headers.set("x-response-time-ms", (performance.now() - started).toFixed(2));
  return response;
});

app.get("/hello/:name", (ctx) => ({
  greeting: `${ctx.query.get("greeting") ?? "Hello"}, ${ctx.params.name}! 👋`,
}));

app.post("/echo", async (ctx) => ({
  echo: await ctx.body.json(),
}));

const api = app.group("/api");
api.get("/version", () => ({ phase: 3, version: "0.0.0" }));

app.get("/events", (ctx) =>
  ctx.sse([{ event: "hello", data: { message: "Qutivex SSE" } }]),
);

await app.run({ port: 3000 });
```

## ▶️ Run it

From the repository root:

```sh
bun install --frozen-lockfile
bun run example
```

Or from this folder:

```sh
bun run src/main.ts
```

Then open <http://127.0.0.1:3000/>.

## 🌐 Endpoints

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/` | Framework identity, Phase 3 status, timing header |
| `GET` | `/health` | `{ "status": "ok", "phase": 3 }` |
| `GET` | `/hello/:name` | Greeting with path + query params |
| `POST` | `/echo` | Parsed JSON body |
| `GET` | `/api/version` | Grouped route |
| `GET` | `/events` | `text/event-stream` with two events |
| any | unknown | JSON `404` envelope |

## 🧪 Try it

```sh
curl "http://127.0.0.1:3000/hello/Ada?greeting=Welcome"
curl -X POST http://127.0.0.1:3000/echo \
  -H 'content-type: application/json' \
  -d '{"message":"ping"}'
curl http://127.0.0.1:3000/events
```

## 🔌 Ports

```sh
PORT=8080 bun run example
```

The example binds `127.0.0.1` by default. Port `0` is useful in tests.

## 🧪 Test it

```sh
bun test tests/integration/example-hello.test.ts
bun run smoke
```

The integration test covers `app.fetch()` and a real ephemeral socket; the smoke
test checks HTTP, params, bodies, groups, and SSE end to end.
