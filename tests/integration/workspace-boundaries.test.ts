import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { PACKAGE as CORE } from "@qutivex/core";
import { PACKAGE as HTTP_BUN } from "@qutivex/http-bun";
import { PACKAGE as ROUTER } from "@qutivex/router";

interface PackageManifest {
  dependencies?: Record<string, string>;
  name: string;
  peerDependencies?: Record<string, string>;
  private?: boolean;
  version: string;
}

const root = join(import.meta.dir, "../..");

async function readManifest(relativePath: string): Promise<PackageManifest> {
  return (await Bun.file(join(root, relativePath)).json()) as PackageManifest;
}

async function workspaceFiles(glob: string): Promise<string[]> {
  const files: string[] = [];
  for await (const file of new Bun.Glob(glob).scan({ cwd: root })) {
    files.push(file);
  }
  return files;
}

function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => typeof specifier === "string");
}

describe("Bun workspace wiring", () => {
  test("resolves every initial package through its public name", () => {
    expect([CORE.name, ROUTER.name, HTTP_BUN.name]).toEqual([
      "@qutivex/core",
      "@qutivex/router",
      "@qutivex/http-bun",
    ]);
  });

  test("keeps core free of runtime dependencies", async () => {
    const core = await readManifest("packages/core/package.json");

    expect(core.dependencies ?? {}).toEqual({});
    expect(core.peerDependencies ?? {}).toEqual({});
  });

  test("keeps core independent of adapters and optional modules", async () => {
    const files = await workspaceFiles("packages/core/src/**/*.ts");
    expect(files.length).toBeGreaterThan(0);

    const forbidden = [
      "@qutivex/router",
      "@qutivex/http-bun",
      "@qutivex/validation",
      "@qutivex/openapi",
      "@qutivex/database",
      "@qutivex/admin",
      "@qutivex/ai",
      "@qutivex/agents",
      "@qutivex/workflows",
      "qutivex",
    ];

    for (const file of files) {
      const source = await Bun.file(join(root, file)).text();

      for (const specifier of importSpecifiers(source)) {
        expect(forbidden).not.toContain(specifier);
      }

      // Core stays runtime-agnostic; Bun-specific behavior belongs in http-bun.
      expect(source).not.toMatch(/\bBun\./);
    }
  });

  test("publishes a types + import export for every package", async () => {
    for (const packagePath of ["core", "router", "http-bun"]) {
      const manifest = (await Bun.file(
        join(root, "packages", packagePath, "package.json"),
      ).json()) as {
        exports?: Record<string, { types?: string; import?: string }>;
      };
      const rootExport = manifest.exports?.["."];

      expect(rootExport?.types).toBe("./src/index.ts");
      expect(rootExport?.import).toBe("./src/index.ts");
    }
  });
});
