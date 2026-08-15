# KMP-specific concerns, backward compatibility, and rollout safety

Reference material for the `kotlin-kmp-code-review` skill. Read this file when the change under review touches these concerns.

---

## Backward compatibility and migration safety

Review whether the implementation is resilient to evolving schemas, partial rollouts, and app upgrades.

Flag:
- brittle enum/string assumptions
- code that assumes fields are always present
- serialization changes that may break older persisted data
- local model changes without migration consideration
- non-defensive parsing of backend responses
- assumptions that all clients/backends are upgraded simultaneously
- logic that breaks when unknown enum values or new fields appear
- all-or-nothing rollout assumptions
- old cached state that becomes unreadable or misinterpreted

Prefer:
- tolerant readers where appropriate
- explicit handling of unknown/missing values
- rollout-safe behavior
- migration-aware persistence changes
- defensive parsing at boundaries

Review whether:
- fallback behavior is defined for new/unknown backend values
- feature flags or capability checks degrade safely
- storage changes require migration paths

---

## Rollout and feature isolation readiness

Review whether the implementation is safe to release incrementally.

Flag:
- unfinished dependencies wired as hard requirements
- weak handling of unavailable backend capabilities
- no clear isolation for risky new flows
- assumptions that everything is enabled simultaneously
- code paths that cannot degrade safely if partial rollout occurs
- no capability checks where the backend may lag behind the client
- new flows tightly coupled to unrelated existing flows

Prefer:
- graceful degradation
- clear feature boundaries
- rollout-safe assumptions
- safe handling of partially available functionality
- explicit feature capability handling where relevant

---

## KMP-specific review concerns

Because this is a KMP project, check for:
- unnecessary platform divergence
- common code that should remain common
- platform-specific logic introduced without justification
- APIs that reduce portability
- abstractions that will make iOS/Android behavior inconsistent
- threading assumptions that do not hold well across targets
- shared code using APIs that complicate testing or platform compatibility
- platform differences hidden in ways that make behavior hard to reason about
- shared logic depending indirectly on platform-only behavior
- platform abstractions that are too wide or too leaky

If the implementation starts changing source-set placement, shared-vs-platform ownership, or target-specific architectural boundaries, say that the change should also be reviewed with `kotlin-project-architecture-review`.
