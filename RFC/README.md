# RFCs

Design proposals for Qutivex live here. Phase 0 calls for RFCs covering the
public route API, validation/OpenAPI, plugins and DI, configuration, database
integration, and AI/agent interfaces. None have been accepted yet.

## Process

1. Copy [`0000-template.md`](0000-template.md) to `NNNN-short-title.md`.
2. Open a pull request with status `Draft`.
3. Discuss in the pull request and linked issue.
4. A maintainer moves it to `Accepted`, `Rejected`, or `Superseded`.
5. Once accepted, implementation may proceed in the relevant phase. Accepted
   RFCs are not rewritten; follow-up changes use a new RFC or an ADR when the
   change is operational rather than API design.

## Rules

- An RFC proposes a decision and states its consequences and alternatives.
- Public API sketches include type-inference expectations and failure behavior.
- Security-sensitive surfaces (auth, admin, tools, file upload, multi-tenancy)
  include a threat section.
- Performance-motivated proposals state the workload and measurement method;
  "faster" without evidence is not an argument.
- Do not use an RFC to lock Phase 1 scaffolding. Phase 1 records engineering
  decisions in [`docs/decisions/`](../docs/decisions/).

## Status meanings

| Status | Meaning |
| ------ | ------- |
| Draft | Open for discussion; not a commitment. |
| Accepted | Agreed direction; implementation may follow. |
| Rejected | Not planned; rationale retained. |
| Superseded | Replaced by a newer RFC or decision; link to it. |
