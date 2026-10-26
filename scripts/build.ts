import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

interface PackageManifest {
  dependencies?: Record<string, string>;
  name?: string;
  peerDependencies?: Record<string, string>;
}

const root = join(import.meta.dir, "..");
const packagesDirectory = join(root, "packages");

let built = 0;

for (const entry of await readdir(packagesDirectory, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }

  const packageDirectory = join(packagesDirectory, entry.name);
  const manifestFile = Bun.file(join(packageDirectory, "package.json"));

  if (!(await manifestFile.exists())) {
    continue;
  }

  const manifest = (await manifestFile.json()) as PackageManifest;
  if (typeof manifest.name !== "string") {
    throw new Error(`Missing "name" in ${join(packageDirectory, "package.json")}`);
  }

  const outdir = join(packageDirectory, "dist");
  await rm(outdir, { force: true, recursive: true });

  const result = await Bun.build({
    entrypoints: [join(packageDirectory, "src/index.ts")],
    external: [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ],
    format: "esm",
    outdir,
    sourcemap: "linked",
    target: "bun",
  });

  if (!result.success) {
    console.error(`✗ ${manifest.name} failed to build`);
    for (const log of result.logs) {
      console.error(`  ${log.level}: ${log.message}`);
    }
    process.exitCode = 1;
    continue;
  }

  console.log(`✓ built ${manifest.name} → ${outdir}`);
  built += 1;
}

if (process.exitCode === undefined) {
  console.log(`\nBuild complete: ${built} package(s).`);
}
