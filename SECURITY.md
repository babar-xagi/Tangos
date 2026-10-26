# Security Policy

## Project status

Qutivex is pre-release software at version `0.0.0`. It is **not** production
ready, has no supported release line yet, and does not claim enterprise
security. Phase 1 is repository and engineering infrastructure only.

## Supported versions

| Version  | Supported          |
| -------- | ------------------ |
| `0.0.x`  | ❌ Pre-release only |

A supported-version policy will be introduced with the first public release.
Security work is planned in Phase 8 and Phase 15 of [ROADMAP.md](ROADMAP.md).

## Reporting a vulnerability

**Do not open a public issue, discussion, or pull request for a suspected
vulnerability.**

Use the repository's private vulnerability reporting channel:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include affected version/commit, reproduction steps, impact, and any
   suggested fix.

If private reporting is unavailable, contact the maintainers privately through
the repository's listed contact and ask for a secure channel before sharing
details.

Please include:

- the exact commit or version;
- runtime, OS, and dependency versions;
- a minimal reproduction, if possible;
- the security impact you believe applies;
- whether the issue is already public.

## What to expect

This is a pre-release, maintainer-led project without a 24/7 security team. We
will acknowledge reports as soon as practical, investigate, and coordinate a
fix and disclosure. No bug bounty or response-time SLA is offered at this
stage.

## Scope

During Phase 1 the relevant surface is limited to the repository, its scripts,
and the example server. Reports about the planned framework, authentication,
admin, AI/agent, and tool-execution surfaces become relevant as those phases
land.

## Dependency and secret hygiene

- Do not commit secrets, tokens, or private keys. `.env` files are ignored.
- Report a committed secret immediately so it can be rotated and removed from
  history.
- Dependencies are pinned exactly and reviewed deliberately. Dependency
  scanning and an inventory process arrive in later phases.
