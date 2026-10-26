import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { App as CoreApp } from "@qutivex/core";
import { bunAdapter } from "@qutivex/http-bun";
import { compileRoutePattern, matchRoutePattern } from "@qutivex/router";
import { App as PublicApp } from "qutivex";

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
  test("resolves every package through its public name", () => {
    expect(typeof CoreApp).toBe("function");
    expect(typeof PublicApp).toBe("function");
    expect(typeof bunAdapter).toBe("function");
    expect(matchRoutePattern(compileRoutePattern("/users/:id"), "/users/42")).toEqual({
      params: { id: "42" },
    });
  });

  test("public App extends the core App and wires in Bun", () => {
    expect(Object.getPrototypeOf(PublicApp)).toBe(CoreApp);
  });

  test("keeps core's dependency surface limited to the router", async () => {
    const core = await readManifest("packages/core/package.json");
    const router = await readManifest("packages/router/package.json");

    expect(core.dependencies).toEqual({ "@qutivex/router": "workspace:*" });
    expect(core.peerDependencies ?? {}).toEqual({});
    expect(router.dependencies ?? {}).toEqual({});
  });

  test("keeps core independent of adapters and optional modules", async () => {
    const files = await workspaceFiles("packages/core/src/**/*.ts");
    expect(files.length).toBeGreaterThan(0);

    const forbidden = [
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

  test("limits adapter and umbrella dependencies to allowed packages", async () => {
    const httpBun = await readManifest("packages/http-bun/package.json");
    const umbrella = await readManifest("packages/qutivex/package.json");

    expect(httpBun.dependencies).toEqual({ "@qutivex/core": "workspace:*" });
    expect(umbrella.dependencies).toEqual({
      "@qutivex/core": "workspace:*",
      "@qutivex/http-bun": "workspace:*",
    });
  });

  test("publishes a types + import export for every package", async () => {
    for (const packagePath of ["core", "router", "http-bun", "qutivex"]) {
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
