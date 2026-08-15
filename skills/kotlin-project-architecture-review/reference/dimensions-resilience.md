# Security, resilience, and long-term evolution

Review dimensions 16-22: security and privacy architecture, configuration resilience, resource and presentation boundaries, observability, rollout and migration safety, testability, and consistency with existing patterns.

Reference material for the `kotlin-project-architecture-review` skill. Read this file when the work touches these concerns.

---

## 16. Security and privacy architecture

Check whether:
- authorization-sensitive behavior is not trusted to UI alone
- external input boundaries are explicit
- deep links, WebView, URLs, intents, files, or externally supplied identifiers are handled defensively at an architectural level
- sensitive data stays in the minimum number of layers
- privileged/admin flows are isolated appropriately
- logging/analytics boundaries avoid leaking sensitive values by design
- session/auth state transitions are owned and bounded clearly

Flag as a concern when:
- permission checks are only enforced in UI
- client state is treated as trusted for privileged behavior
- external inputs can bypass intended ownership boundaries
- sensitive data spreads through layers that do not need it
- architecture assumes backend authorization without clear boundary handling
- post-logout or role-change state ownership is unclear
- observability design would require logging sensitive data to diagnose problems

## 17. Responsiveness and configuration resilience

Check whether:
- UI state production is resilient to configuration changes
- layout adaptation is structured rather than bolted on
- state holders remain valid across lifecycle/configuration changes where appropriate
- layout assumptions are not hard-coded to one form factor
- state restoration and re-entry do not break ownership assumptions

Flag as a concern when:
- configuration change handling is fragile
- adaptive layouts require rewriting feature logic
- architecture assumes one device class or one platform behavior
- restored state and fresh data paths are structurally incompatible

## 18. Resources and presentation boundaries

Check whether:
- localization and resources stay in presentation/platform concerns where appropriate
- shared business logic does not hard-code values that belong in resources
- locale-sensitive formatting happens at the presentation edge, not in repositories or use cases
- the feature can evolve to alternative resources, configurations, or locales without major refactoring

Flag as a concern when:
- user-facing strings are assembled or formatted in repositories or use cases
- locale-sensitive logic runs inside business rules rather than at the presentation edge
- presentation constants or hard-coded display values are buried in shared data or domain layers
- the design assumes a single language, locale, density, or configuration

## 19. Observability and diagnosability as architecture

Check whether:
- important flows have a diagnosable path
- failures can be surfaced with enough context to debug in production
- high-risk operations have structural places for logging, analytics, or error capture
- sensitive information is not required to diagnose common failures
- ownership of runtime faults is clear enough that teams can reason about failures quickly

Flag as a concern when:
- critical flows can fail silently
- diagnostics would require reading UI code paths only
- feature ownership and runtime failure ownership are unclear
- observability is bolted on in ways that cross too many boundaries
- there is no architecture-level place to capture or correlate meaningful failure context

## 20. Backward compatibility, migration, and rollout safety

Check whether:
- the design tolerates partial backend rollout
- unknown enum values, missing fields, and extra fields are survivable
- local persistence changes consider migration
- old and new app versions can coexist reasonably when needed
- new feature paths degrade safely when unavailable
- capability mismatches are handled explicitly where relevant

Flag as a concern when:
- the design assumes all backends and clients upgrade simultaneously
- persisted models change without migration thought
- server capabilities are treated as always available
- unknown values break business flows
- rollout requires risky all-at-once coupling
- the architecture gives no clean place to branch for capability differences

## 21. Testability as an architectural property

Check whether:
- business rules are isolated for unit tests
- mappers are pure and testable
- repositories can be tested with fakes/mocks
- state-holder logic can be tested without rendering UI
- key failure paths are testable
- platform entry points are thin enough that most logic is testable outside them

Flag as a concern when:
- critical logic is trapped in Activities, Services, Receivers, or other platform entry points
- key flows can only be tested end to end
- architecture relies on hidden global state
- async coordination is too implicit to test predictably

## 22. Architecture consistency with existing project patterns

Check whether:
- the proposal extends existing module, state-holder, and repository patterns where reasonable
- new abstractions are justified instead of introduced for novelty
- design choices are consistent with surrounding feature architecture
- the proposal avoids parallel patterns for the same problem

Flag as a concern when:
- the change introduces a competing architecture style without justification
- similar features would now require different mental models
- the proposal solves a local problem by creating long-term inconsistency
- existing patterns are bypassed without a documented reason
