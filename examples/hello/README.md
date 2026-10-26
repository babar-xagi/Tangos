# 👋 Hello example (Phase 2)

The smallest real Qutivex application. It proves routes, JSON responses, HEAD
handling, graceful shutdown, and the public `qutivex` import.

```ts
import { App } from "qutivex";

const app = new App({ name: "Qutivex Hello" });

app.get("/", () => ({
  message: "Hello from Qutivex 👋",
  framework: "Qutivex",
  phase: 2,
}));

app.get("/health", () => ({ status: "ok", phase: 2 }));

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
| `GET` | `/` | Framework identity and Phase 2 status |
| `GET` | `/health` | `{ "status": "ok", "phase": 2 }` |
| `HEAD` | `/health` | Same headers as GET, no body |
| any | unknown | JSON `404` error envelope |

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

The integration test exercises the app in-process with `app.fetch()` and once
over a real ephemeral socket.
