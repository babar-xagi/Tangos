# Development guide

## Toolchain

| Tool       | Version | Source |
| ---------- | ------- | ------ |
| Bun        | 1.4.4   | [.bun-version](../.bun-version) |
| TypeScript | 7.0.2   | `devDependencies` |
| Biome      | 2.6.3   | `devDependencies` |

Node.js is not required. `bun install` installs the pinned compiler and linter
locally; do not substitute a global `tsc` or `biome`.

### Verify Bun

```sh
bun --version
# 1.4.4
```

If it reports a different version, install the pinned version:

```sh
curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.4"
```

or upgrade an existing Bun installation and confirm the version again:

```sh
bun upgrade
bun --version
```

CI reads `.bun-version`; changing the pin is a reviewed change that must update
`.bun-version`, `packageManager`, `engines.bun`, and this guide together.

## First setup

```sh
bun install --frozen-lockfile
bun run validate
```

The install must not modify `bun.lock`. If it does, either the lockfile is stale
or a manifest changed; commit both together after review.

## Daily commands

```sh
bun run quality       # format + lint + import order (CI gate)
bun run fix           # apply formatting, lint fixes, and import sorting
bun run typecheck     # TypeScript 7, no emit
bun test              # unit + integration
bun run test:coverage # with 90% threshold and LCOV
bun run build         # bundle packages to dist/
bun run smoke         # real-socket example check
bun run bench         # baseline-only harness
bun run clean         # remove dist/ and coverage/
```

`bun run format` and `bun run lint` remain available as focused, single-purpose
commands; `bun run quality` is the gate and also enforces import ordering.

`bun run validate` runs the full CI gate locally. Run it before pushing.

## Running the example

```sh
bun run example
# Qutivex Phase 1 example listening at http://127.0.0.1:3000/
```

Use another port with `PORT`:

```sh
PORT=8080 bun run example
```

The example binds `127.0.0.1` by default so it is not exposed on the network.
It is a plain Bun server; the framework `App` arrives in Phase 2.

## Why `tsc` instead of `bun check`

Bun 1.4.4 ships a working `bun check`, and it is a useful fast local command.
The repository still gates CI on the pinned reference compiler
(`tsc --noEmit`) for three reasons:

- Type inference is a core product feature, so the reference compiler is the
  authority for what "type-checks" means.
- Editors run TypeScript, and the repository pins the same major version
  (`7.0.2`) so editor and CI behavior agree.
- Declaration emission in later packaging work will use `tsc`; keeping one
  compiler avoids maintaining two type stories.

This decision is recorded in
[ADR 0001](decisions/0001-engineering-foundation.md). Revisit it if `bun check`
matches `tsc` on the type-test corpus over a stable release window.

## Windows and WSL

Bun's optional platform packages are OS-specific. `@biomejs/biome` installs a
native binary for the current platform, so a `node_modules` tree produced on
Windows cannot be used unchanged from WSL, and vice versa.

If you switch environments:

```sh
rm -rf node_modules
bun install --frozen-lockfile
```

CI runs the quality gate on both `ubuntu-latest` and `windows-latest`. macOS is
not yet in the matrix.

## Editor setup

- Install the Biome extension recommended in
  [.vscode/extensions.json](../.vscode/extensions.json).
- The workspace recommends Biome as the default formatter and enables format on
  save plus Biome quick fixes.
- TypeScript uses the workspace's pinned compiler via the project's
  `node_modules`; see [.vscode/settings.json](../.vscode/settings.json).

## Troubleshooting

### Biome fails to find its native binary

Symptom: `Cannot find module '@biomejs/cli-win32-x64/biome.exe'` (or the
Linux/macOS equivalent).

Cause: a linker layout or platform-specific optional dependency problem.

1. Confirm `bunfig.toml` uses `linker = "hoisted"`.
2. Remove `node_modules` and reinstall from the lockfile.
3. Confirm you are not sharing a Windows `node_modules` with WSL.

### `bun install` says the lockfile would change

Do not force through with `--no-save`. Determine whether a `package.json`
changed. Update the lockfile with `bun install` and commit both files in the
same change.

### Port already in use

The example exits if port `3000` is occupied. Set `PORT` to `0` to pick an
ephemeral port, or choose another free port.

### Tests bind sockets

Integration tests bind `127.0.0.1:0` and close their server in `finally`.
If a test fails while holding a server, the test file must be fixed rather than
relying on process exit. Never bind a fixed public port in tests.
