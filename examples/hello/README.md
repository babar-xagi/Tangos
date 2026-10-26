# Hello example (Phase 1)

The smallest runnable server in the repository. It proves that Bun workspaces,
the pinned toolchain, scripts, and the test harness all work together.

This is **not** the Qutivex `App` API yet. Phase 2 introduces the minimal HTTP
core; this example will then be rewritten to use it.

```sh
bun install
bun run example
```

Then open <http://127.0.0.1:3000/>. Use `PORT` to bind another port:

```sh
PORT=8080 bun run example
```

Endpoints:

| Path      | Response                                  |
| --------- | ----------------------------------------- |
| `/`       | Framework identity and Phase 1 status     |
| `/health` | `{ "status": "ok", "phase": 1 }`          |
| anything  | JSON `404` body                           |
