import { type FRAMEWORK, PACKAGE as CORE } from "@qutivex/core";
import type { PACKAGE as HTTP_BUN } from "@qutivex/http-bun";
import type { PACKAGE as ROUTER } from "@qutivex/router";

/**
 * Type-level tests. This file is included in `tsc --noEmit` but is not a
 * runtime test; it verifies that public package metadata keeps literal types.
 */

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

export type CoreNameIsLiteral = Expect<Equal<typeof CORE.name, "@qutivex/core">>;
export type CoreRoleIsLiteral = Expect<
  Equal<typeof CORE.role, "Application lifecycle, route registry, errors, and hooks">
>;
export type RouterNameIsLiteral = Expect<Equal<typeof ROUTER.name, "@qutivex/router">>;
export type HttpBunNameIsLiteral = Expect<Equal<typeof HTTP_BUN.name, "@qutivex/http-bun">>;
export type FrameworkPhaseIsLiteral = Expect<Equal<typeof FRAMEWORK.phase, 1>>;

/** Never executed; proves the compiler rejects mutation of package metadata. */
export function verifyReadonlyMetadata(): void {
  // @ts-expect-error — package metadata is declared read-only.
  CORE.name = "@qutivex/other";
}
