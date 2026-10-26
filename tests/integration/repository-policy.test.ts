import { describe, expect, test } from "bun:test";
import { join } from "node:path";

interface RootManifest {
  engines?: { bun?: string };
  license?: string;
  packageManager?: string;
  private?: boolean;
  workspaces?: string[];
}

interface PackageManifest {
  name: string;
  private?: boolean;
  version: string;
}

const root = join(import.meta.dir, "../..");

async function readText(relativePath: string): Promise<string> {
  return Bun.file(join(root, relativePath)).text();
}

async function readJson<T>(relativePath: string): Promise<T> {
  return (await Bun.file(join(root, relativePath)).json()) as T;
}

describe("repository policy", () => {
  test("contains the files a clean clone needs", async () => {
    const required = [
      ".bun-version",
      ".editorconfig",
      ".gitignore",
      "LICENSE",
      "README.md",
      "VISION.md",
      "ARCHITECTURE.md",
      "CONTRIBUTING.md",
      "CODE_OF_CONDUCT.md",
      "SECURITY.md",
      "bun.lock",
      "bunfig.toml",
      "biome.json",
      "tsconfig.json",
      "CHANGELOG.md",
      "BENCHMARKS.md",
      "ROADMAP.md",
      "docs/README.md",
      "docs/quickstart.md",
      "docs/api/app.md",
      "docs/api/errors.md",
      "docs/phase-0-checklist.md",
      "docs/phase-1-checklist.md",
      "docs/phase-2-checklist.md",
      "docs/phase-3-checklist.md",
      "docs/competitive-matrix.md",
      "docs/reference-apps.md",
      "docs/support-policy.md",
      "docs/decisions/0002-product-scope.md",
      "docs/decisions/0003-route-matching.md",
      "RFC/0001-public-api.md",
      "RFC/0002-routing.md",
      "RFC/0003-validation-openapi.md",
      "RFC/0004-plugin-di.md",
      "RFC/0005-database.md",
      "RFC/0006-ai-agents.md",
      "RFC/0007-configuration.md",
      ".github/workflows/ci.yml",
    ];

    for (const file of required) {
      expect(await Bun.file(join(root, file)).exists()).toBe(true);
    }
  });

  test("pins one Bun version across metadata, CI, and docs", async () => {
    const pinned = (await readText(".bun-version")).trim();
    const manifest = await readJson<RootManifest>("package.json");
    const ci = await readText(".github/workflows/ci.yml");

    expect(pinned).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.packageManager).toBe(`bun@${pinned}`);
    expect(manifest.engines?.bun).toContain(`>=${pinned}`);
    expect(ci).toContain("bun-version-file: .bun-version");
  });

  test("declares the MIT license consistently", async () => {
    const manifest = await readJson<RootManifest>("package.json");
    const license = await readText("LICENSE");

    expect(manifest.license).toBe("MIT");
    expect(license).toContain("MIT License");
  });

  test("keeps workspace packages private and version-locked during 0.0.x", async () => {
    const manifest = await readJson<RootManifest>("package.json");
    expect(manifest.private).toBe(true);
    expect(manifest.workspaces).toEqual(["packages/*", "examples/*"]);

    for (const packagePath of ["core", "router", "http-bun", "qutivex"]) {
      const pkg = await readJson<PackageManifest>(`packages/${packagePath}/package.json`);
      expect(pkg.private).toBe(true);
      expect(pkg.version).toBe("0.0.0");
    }
  });

  test("runs the full quality gate in CI", async () => {
    const ci = await readText(".github/workflows/ci.yml");

    expect(ci).toContain("bun install --frozen-lockfile");
    expect(ci).toContain("bun run quality");
    expect(ci).toContain("bun run typecheck");
    expect(ci).toContain("bun run test:coverage");
    expect(ci).toContain("bun run build");
  });
});
