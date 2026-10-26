## Summary

<!-- What changes, and which package or phase does it belong to? -->

## Why

<!-- The problem this solves. Link an issue, RFC, or roadmap section when one exists. -->

## Changes

<!-- Bullet the important implementation and documentation changes. -->

## Testing

<!-- Paste the commands you ran and their result. -->

```sh
bun run validate
```

## Checklist

- [ ] `bun run validate` passes locally.
- [ ] New behavior has tests; fixed bugs have regression tests.
- [ ] Public behavior and error cases are documented.
- [ ] Package boundaries still hold (`tests/integration/workspace-boundaries.test.ts`).
- [ ] No secrets, generated `dist/`, `coverage/`, or platform-specific `node_modules` are included.
- [ ] The change matches the current roadmap phase, or the scope expansion is explained above.
- [ ] Public API, runtime, tooling, or release-policy changes are recorded in an RFC or ADR.

## Breaking changes

<!-- Describe user-visible or API-level breaks and the migration path. Write "None" if not applicable. -->

## Screenshots or output

<!-- Optional: before/after output for CLI, benchmark harness, or example changes. -->
