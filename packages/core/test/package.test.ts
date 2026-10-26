import { describe, expect, test } from "bun:test";
import { FRAMEWORK, PACKAGE } from "../src/index";

describe("@qutivex/core", () => {
  test("exposes stable package identity", () => {
    expect(PACKAGE.name).toBe("@qutivex/core");
    expect(PACKAGE.role).toBe("Application lifecycle, route registry, errors, and hooks");
  });

  test("declares the current foundation phase", () => {
    expect(FRAMEWORK.name).toBe("Qutivex");
    expect(FRAMEWORK.phase).toBe(1);
  });
});
