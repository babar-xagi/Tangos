# Release process (manual)

Qutivex has no published release yet. Phase 1 documents a manual process rather
than adding changesets or a release bot before there is a package to publish.
This satisfies the roadmap requirement for "changeset/release automation **or**
a documented manual versioning process" while keeping the toolchain small.

Revisit automation when the first public `0.1.0` release exists and the package
boundaries have survived real use.

## Versioning policy

- Semantic Versioning, `0.y.z` while pre-1.0.
- All workspace packages move in lockstep during the pre-release series. Mixed
  package versions add release complexity without user value while the public
  API is still being designed.
- Breaking changes in `0.y` should still be documented in `CHANGELOG.md` and,
  once packages are public, in upgrade notes.
- The root `qutivex-monorepo` package is private and is never published.
- Initial packages remain `private: true` and version `0.0.0` until the first
  release checklist is completed.

## Pre-release checklist

- [ ] Working tree is clean and based on `main`.
- [ ] `bun install --frozen-lockfile` succeeds.
- [ ] `bun run validate` passes locally.
- [ ] CI is green on Linux and Windows for the release commit.
- [ ] `CHANGELOG.md` has a dated section for the release and no unreleased
      changes remain.
- [ ] Every documented public API has tests and docs.
- [ ] Package boundaries still pass.
- [ ] Dependencies are pinned and `bun.lock` is committed.
- [ ] License, security policy, and contribution files are current.
- [ ] A clean clone installs, validates, and runs the example.
- [ ] Any security issue in the release is resolved or explicitly documented as
      a known limitation; it does not ship silently.

## Steps

1. **Choose the version** using SemVer and the change log.
2. **Update package versions** in every publishable `package.json` (and the
   root if the root version is used for tooling). Keep them equal.
3. **Update `CHANGELOG.md`:** move the release entries from `[Unreleased]` to a
   dated heading, then start a fresh `[Unreleased]` section.
4. **Regenerate the lockfile** with `bun install` so workspace versions match.
   Commit `bun.lock` with the manifests.
5. **Run the gate:** `bun run validate` and a clean-clone check.
6. **Review the diff** for generated output, secrets, and accidental private
   API exposure.
7. **Tag** the release from the validated commit:
   ```sh
   git tag -a v0.1.0 -m "v0.1.0"
   git push origin v0.1.0
   ```
8. **Publish** only after the release checklist allows it. For scoped packages
   remove `"private": true` in the same change, build, then publish each
   package explicitly, for example:
   ```sh
   bun run build
   bun publish --access public --cwd packages/core
   ```
   Publish in dependency order (`core`, then `router`/`http-bun`). Never publish
   from a dirty tree.
9. **Create the GitHub release** from the tag with the changelog section and
   the exact supported Bun/TypeScript versions.
10. **Verify install** from the registry in a clean directory with the pinned
    Bun version.

## Deprecation and upgrades

- Deprecate before removal; document the replacement and the last supported
  version.
- Keep upgrade notes for any change that requires user action.
- Support windows for published versions are defined in Phase 15. Until then,
  no compatibility promise exists.

## Rollback

- If a release is defective, publish a patch that reverts or fixes it; do not
  mutate the tag.
- If a security issue is involved, follow [SECURITY.md](../SECURITY.md) and
  coordinate disclosure before publishing details.

## Emergency security release

1. Fix privately, following the security policy.
2. Run the full gate plus the relevant security regression tests.
3. Publish a patch and a security advisory.
4. Add the incident to the changelog without exposing exploit details before
   users can upgrade.

## Automation trigger

Adopt changesets, release-please, or an equivalent only when all of the
following are true:

- package names and boundaries are stable across at least one public release;
- independent versioning is actually needed; and
- the release runbook has been exercised at least once manually.
