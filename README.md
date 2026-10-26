# ⚡ Qutivex

> **A Bun-first, TypeScript-native framework for APIs, full-stack applications,
> and production AI systems.**

![Bun](https://img.shields.io/badge/Bun-1.4.4-000000?logo=bun)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

**Status:** 🟢 **Phase 2 complete** — the minimal HTTP core works.
**Next:** 🚧 Phase 3 — path params, middleware, and a full request context.

[Roadmap](ROADMAP.md) · [Vision](VISION.md) · [Quickstart](docs/quickstart.md) ·
[API reference](docs/api/app.md) · [Docs index](docs/README.md)

---

## ✨ What is Qutivex?

Qutivex is a framework for people who like **FastAPI's clarity**, **Django's
batteries**, and **Bun's speed**—without assembling a dozen libraries for every
project.

The promise is simple:

- 🧱 **Small core** — no ORM, admin, AI, or frontend code in a minimal API.
- 🧠 **One source of truth** — the same schema will drive validation and docs.
- 🚀 **Measured speed** — Bun-native HTTP, benchmarks before claims.
- 🛡️ **Safe by default** — redacted errors, secure lifecycle, bounded AI later.
- 🧩 **Progressive** — start with one route; add modules when you need them.

> Qutivex is pre-alpha (`0.0.0`). It is **not production-ready**. The docs are
> honest about what works and what does not.

---

## ✅ What works today

| Feature | Status |
| --- | :---: |
| `new App()` with Bun adapter wired in | ✅ |
| GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD | ✅ |
| JSON, text, `Response`, arrays, numbers, `null`, `undefined` returns | ✅ |
| Consistent JSON errors + safe 500s | ✅ |
| Lifecycle: created → configured → starting → running → stopping → stopped | ✅ |
| Graceful shutdown + shutdown hooks | ✅ |
| Configurable host/port, ephemeral port (`0`) | ✅ |
| Development banner (off in production by default) | ✅ |
| HEAD fallback to GET with body stripping | ✅ |
| 404/500, startup failure, port conflict, aborted clients | ✅ tested |
| In-process testing with `app.fetch()` | ✅ |
| Real-socket tests, CI on Linux + Windows, 100% coverage | ✅ |
| Path params, query helpers, middleware, body parsing | 🚧 Phase 3+ |
| Validation, OpenAPI, CLI, database, auth, admin, AI | 🚧 later phases |

See the [Phase 2 checklist](docs/phase-2-checklist.md) for the exact scope and
test evidence.

---

## 🚀 Quick start

### 1. Check Bun

```sh
bun --version
# 1.4.4
```

If needed, install the pinned version:

```sh
curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.4"
```

> 💡 On WSL, run `bun upgrade` if your install still reports `1.4.2`.

### 2. Install this repository

```sh
cd qutivex
bun install --frozen-lockfile
```

### 3. Run the example

```sh
bun run example
```

```text
  Qutivex Hello
  ➜  http://127.0.0.1:3000/
  2 routes | 3ms
```

Open <http://127.0.0.1:3000/> or:

```sh
curl http://127.0.0.1:3000/
curl http://127.0.0.1:3000/health
```

Press `Ctrl+C` to stop it.

### 4. Write your first app

```ts
import { App, HttpError } from "qutivex";

const app = new App({ name: "My API" });

app.get("/", () => ({ message: "Hello, Qutivex! 👋" }));
app.get("/health", () => ({ status: "ok" }));

app.get("/private", () => {
  throw HttpError.unauthorized("Sign in first");
});

await app.run({ port: 3000 });
```

Run it with `bun run your-file.ts`.

> 🏗️ There is no `qutivex create` yet; it arrives in Phase 5. Until then, copy
> [`examples/hello`](examples/hello) or start from the snippet above.

---

## 🧠 The mental model

1. **Create an app** — `const app = new App()`.
2. **Register routes before startup** — `app.get(path, handler)`.
3. **Return data, not boilerplate** — objects become JSON, strings become text,
   `undefined` becomes `204`.
4. **Throw `HttpError` for expected failures** — everything else becomes a safe
   `500`.
5. **Start with `run()` / stop with `stop()`** — the app owns the server
   lifecycle and runs shutdown hooks in reverse order.

### Handler return values

```ts
app.get("/json", () => ({ ok: true }));            // 200 application/json
app.get("/text", () => "hello");                   // 200 text/plain
app.get("/custom", () => new Response("hi"));      // passed through
app.get("/empty", () => undefined);                // 204 No Content
```

### Error shape

Every framework-generated error looks the same:

```json
{ "error": { "code": "NOT_FOUND", "message": "Not Found" } }
```

Internal errors never expose stack traces or private messages.

---

## 📚 Documentation map

| Start here | What you get |
| --- | --- |
| 🚀 [Quickstart](docs/quickstart.md) | Install → run → first routes |
| 🧩 [App API](docs/api/app.md) | Every method, option, and lifecycle state |
| 💥 [Errors](docs/api/errors.md) | `HttpError`, status codes, safe responses |
| 🧠 [Architecture](ARCHITECTURE.md) | How core, adapter, and umbrella fit together |
| 🌟 [Vision](VISION.md) | Product thesis, non-goals, success criteria |
| 🗺️ [Roadmap](ROADMAP.md) | All phases and release scope |
| 🆚 [Competitive matrix](docs/competitive-matrix.md) | Honest comparison with the ecosystem |
| 🏗️ [Reference apps](docs/reference-apps.md) | The three apps every phase targets |
| 🧪 [Testing](docs/testing.md) | Test layers, coverage, conventions |
| 🛠️ [Development](docs/development.md) | Setup, commands, Windows/WSL notes |
| 🛟 [Support policy](docs/support-policy.md) | Versions, OS support, guarantees |
| 📦 [Release process](docs/release-process.md) | Manual SemVer and publishing |

Phase records: [Phase 0](docs/phase-0-checklist.md) ·
[Phase 1](docs/phase-1-checklist.md) · [Phase 2](docs/phase-2-checklist.md)

---

## 🛠️ Commands

| Command | What it does |
| --- | --- |
| `bun install` | Install workspace dependencies |
| `bun run validate` | 🚦 Full gate: build, quality, types, tests, smoke |
| `bun run example` | Run the Phase 2 example server |
| `bun run quality` | Format, lint, and import-order check (CI gate) |
| `bun run fix` | Apply formatting, lint fixes, and import sorting |
| `bun run typecheck` | Type-check all projects with TypeScript 7 |
| `bun test` | Run all unit and integration tests |
| `bun run test:coverage` | Tests + 90% coverage threshold + LCOV |
| `bun run build` | Bundle packages into `packages/*/dist` |
| `bun run smoke` | Start the example and test it over a real socket |
| `bun run bench` | Baseline + Qutivex route benchmark harness |
| `bun run clean` | Remove build and coverage output |

---

## 🧪 Quality gate

Every change is expected to pass:

```sh
bun run validate
```

That runs:

1. 📦 Build every package with Bun.
2. 🎨 Biome format, lint, and import ordering.
3. 🧠 TypeScript 7 type-check.
4. 🧪 89 tests with 100% function/line coverage.
5. 🔌 A real-socket smoke test of the example.

CI runs the same gate on **Ubuntu** and **Windows** with the pinned Bun version.

---

## 🗂️ Repository layout

```text
qutivex/
  packages/
    core/        # App, lifecycle, routes, responses, errors — zero deps
    http-bun/    # Bun.serve adapter
    router/      # Phase 3: params, groups, introspection
    qutivex/     # Public umbrella: App with Bun adapter wired in
  examples/hello # Tiny working app
  tests/         # unit, integration, type-level
  benchmarks/    # Baseline vs Qutivex harness
  docs/          # Guides, API reference, phase records, decisions
  RFC/           # Accepted design proposals
```

Package boundaries are enforced by tests: core cannot import Bun APIs or any
optional module.

---

## 🤝 Contributing

- Read [CONTRIBUTING.md](CONTRIBUTING.md).
- Use the pinned toolchain: **Bun 1.4.4**, **TypeScript 7.0.2**.
- Run `bun run validate` before opening a pull request.
- Security issues: follow [SECURITY.md](SECURITY.md); do not open a public issue.
- Design changes need an [RFC](RFC/README.md) or an [ADR](docs/decisions/README.md).

---

## 📄 License

[MIT](LICENSE) — decided in [ADR 0002](docs/decisions/0002-product-scope.md).

---

<p align="center">
  <strong>Build APIs that are easy to start, safe to operate, and fast enough to
  compete.</strong><br />
  ⚡ Bun · 🟦 TypeScript · 🧠 AI-native · 🛡️ secure by default
</p>
