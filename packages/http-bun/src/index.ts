/**
 * Qutivex Bun HTTP adapter — the `Bun.serve()` request/response bridge.
 *
 * Phase 1 scaffold: server startup, shutdown, and lifecycle states are
 * implemented in Phase 2. This package owns all Bun-specific HTTP details so
 * the rest of the framework can stay behind a narrow internal adapter.
 */

/** Stable package identity used by tooling and boundary tests. */
export const PACKAGE = {
  name: "@qutivex/http-bun",
  role: "Bun.serve adapter and request/response bridge",
} as const;
