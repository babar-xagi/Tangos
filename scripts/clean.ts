import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

for (const group of ["packages", "examples"]) {
  for (const entry of await readdir(join(root, group), { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    await rm(join(root, group, entry.name, "dist"), { force: true, recursive: true });
  }
}

await rm(join(root, "coverage"), { force: true, recursive: true });

console.log("Removed build output and coverage reports.");
