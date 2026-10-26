import { describe, expect, test } from "bun:test";
import { PACKAGE } from "../src/index";

describe("@qutivex/http-bun", () => {
  test("exposes stable package identity", () => {
    expect(PACKAGE.name).toBe("@qutivex/http-bun");
    expect(PACKAGE.role).toBe("Bun.serve adapter and request/response bridge");
  });
});
