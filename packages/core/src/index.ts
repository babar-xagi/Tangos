/**
 * Qutivex core — application lifecycle, route registry, errors, and hooks.
 *
 * Phase 1 scaffold: this package intentionally contains no HTTP behavior yet.
 * The `App` API, lifecycle states, and error normalization land in Phase 2.
 * Keeping the surface empty until then avoids committing to public API that
 * the Phase 0 RFCs have not reviewed.
 */

/** Stable package identity used by tooling, examples, and boundary tests. */
export const PACKAGE = {
  name: "@qutivex/core",
  role: "Application lifecycle, route registry, errors, and hooks",
} as const;

/**
 * Framework identity shared by the Phase 1 example.
 *
 * @internal Temporary scaffold export. It is replaced by the public `App`
 * surface once Phase 2 lands.
 */
export const FRAMEWORK = {
  name: "Qutivex",
  phase: 1,
} as const;
