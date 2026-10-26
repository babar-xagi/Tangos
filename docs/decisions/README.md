# Architecture decision records

Short records of decisions that shape the repository, its boundaries, or its
release and security posture.

| ADR | Title | Status |
| --- | ----- | ------ |
| [0001](0001-engineering-foundation.md) | Engineering foundation decisions | Accepted (Phase 1) |
| [0002](0002-product-scope.md) | Product scope, license, and support | Accepted (Phase 0) |

## When to write an ADR

Write one when a change:

- adds, removes, or redirects a package boundary;
- changes the runtime, type checker, test runner, or publish model;
- changes the license, versioning, or support policy;
- adds a dependency with meaningful maintenance or security cost; or
- accepts a trade-off future contributors are likely to question.

Small implementation choices belong in code review or an RFC, not here.

## Format

- Number and title
- Status (proposed, accepted, superseded, rejected)
- Date and deciders
- Context
- Decision
- Consequences (positive, negative, follow-up)
- Alternatives considered
- Revisit triggers

Record the decision that was made, not a design document. Link to the RFC or
issue that carries detail.
