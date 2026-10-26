# 📐 RFCs

Design proposals for Qutivex live here. Phase 0 accepted the initial set. An
accepted RFC records the agreed direction; implementation follows the roadmap
phase.

## Accepted RFCs

| RFC | Topic | Status | Target |
| --- | --- | --- | --- |
| [0001](0001-public-api.md) | Public API | ✅ Implemented (Phase 2–3) | Phase 2+ |
| [0002](0002-routing.md) | Routing | ✅ Implemented (Phase 3) | Phase 3 |
| [0003](0003-validation-openapi.md) | Validation + OpenAPI | ✅ Accepted | Phase 4 |
| [0004](0004-plugin-di.md) | Plugins + DI | ✅ Accepted | Phase 6 |
| [0005](0005-database.md) | Database + migrations | ✅ Accepted | Phase 7 |
| [0006](0006-ai-agents.md) | AI, agents, workflows | ✅ Accepted | Phase 11–12 |
| [0007](0007-configuration.md) | Configuration + settings | ✅ Accepted | Phase 5 |

## Process

1. Copy [`0000-template.md`](0000-template.md) to `NNNN-short-title.md`.
2. Open a pull request with status `Draft`.
3. Discuss in the pull request and linked issue.
4. A maintainer moves it to `Accepted`, `Rejected`, or `Superseded`.
5. Implementation proceeds in the relevant phase. Accepted RFCs are not
   rewritten; follow-up changes use a new RFC or an ADR when the change is
   operational rather than API design.

## Rules

- An RFC proposes a decision and states its consequences and alternatives.
- Public API sketches include type-inference expectations and failure behavior.
- Security-sensitive surfaces (auth, admin, tools, file upload, multi-tenancy)
  include a threat section.
- Performance-motivated proposals state the workload and measurement method;
  "faster" without evidence is not an argument.
- Engineering-foundation choices live in [`docs/decisions/`](../docs/decisions/).

## Status meanings

| Status | Meaning |
| --- | --- |
| Draft | Open for discussion; not a commitment. |
| Accepted | Agreed direction; implementation may follow. |
| Rejected | Not planned; rationale retained. |
| Superseded | Replaced by a newer RFC or decision; link to it. |
