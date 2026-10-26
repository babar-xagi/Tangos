/**
 * Qutivex router — public route definitions and registration.
 *
 * Phase 1 scaffold: routing is implemented in Phase 3. The intended first
 * implementation uses Bun's native route table, with a controlled fallback
 * handler only where needed (ROADMAP.md §3.2).
 */

/** Stable package identity used by tooling and boundary tests. */
export const PACKAGE = {
  name: "@qutivex/router",
  role: "Public route definitions and registration",
} as const;
