import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";

interface MarkdownFile {
  relativePath: string;
  source: string;
}

const root = join(import.meta.dir, "../..");
const LINK_PATTERN = /!?\[[^\]]*\]\(([^)]+)\)/g;

function isIgnored(relativePath: string): boolean {
  return ["node_modules", ".git", "dist", "coverage", ".bun-cache"].some((part) =>
    relativePath.split("/").includes(part),
  );
}

function localTarget(rawTarget: string): string | undefined {
  const target = rawTarget.trim();

  if (
    target.startsWith("http://") ||
    target.startsWith("https://") ||
    target.startsWith("mailto:") ||
    target.startsWith("#") ||
    target.startsWith("/")
  ) {
    return undefined;
  }

  const withoutFragment = target.split("#")[0]?.split("?")[0] ?? "";
  if (withoutFragment === "") {
    return undefined;
  }

  return decodeURIComponent(withoutFragment.replace(/^<|>$/g, ""));
}

describe("documentation links", () => {
  test("every relative Markdown link points at an existing file or directory", async () => {
    const files: MarkdownFile[] = [];

    for await (const relativePath of new Bun.Glob("**/*.md").scan({ cwd: root })) {
      if (isIgnored(relativePath)) {
        continue;
      }

      files.push({
        relativePath,
        source: await Bun.file(join(root, relativePath)).text(),
      });
    }

    expect(files.length).toBeGreaterThan(10);

    const broken: string[] = [];

    for (const file of files) {
      for (const match of file.source.matchAll(LINK_PATTERN)) {
        const rawTarget = match[1];
        if (rawTarget === undefined) {
          continue;
        }

        const target = localTarget(rawTarget);
        if (target === undefined) {
          continue;
        }

        const absolute = resolve(dirname(join(root, file.relativePath)), target);
        const normalized = normalize(absolute);

        if (!normalized.startsWith(root)) {
          broken.push(`${file.relativePath} → ${rawTarget} (escapes repository)`);
          continue;
        }

        if (!existsSync(normalized)) {
          broken.push(`${file.relativePath} → ${rawTarget}`);
        }
      }
    }

    expect(broken, `Broken links:\n${broken.join("\n")}`).toEqual([]);
  });
});
