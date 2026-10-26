import { describe, expect, test } from "bun:test";
import { PACKAGE } from "../src/index";

describe("@qutivex/router", () => {
  test("exposes stable package identity", () => {
    expect(PACKAGE.name).toBe("@qutivex/router");
    expect(PACKAGE.role).toBe("Public route definitions and registration");
  });
});
