# Architecture, models, state, and dependency injection

Reference material for the `kotlin-kmp-code-review` skill. Read this file when the change under review touches these concerns.

---

## Core review rules

### 1. Keep business logic out of UI

Business logic should live primarily in domain/use-case/domain model layers, not in composables and not scattered through ViewModels.

Flag and fix cases where:
- composables decide business rules
- composables transform raw backend data into business decisions
- ViewModels contain complex decision trees, pricing logic, validation logic, filtering rules, mapping logic, orchestration that should be delegated, or workflow rules
- repositories contain UI-oriented logic
- DTOs leak into UI or domain layers directly

Prefer:
- domain models
- use cases / interactors
- dedicated mappers
- reducer/state transformation helpers
- validators in dedicated files/classes
- repository interfaces returning app-oriented models, not raw transport models where avoidable

### 2. Avoid large ViewModels

A ViewModel should orchestrate state, not become the system.

Flag and fix ViewModels that:
- are too large
- contain excessive private helper methods
- mix UI state, business rules, mapping, analytics, validation, networking coordination, and navigation decisions all together
- are hard to test in isolation
- own responsibilities that should be extracted

When reviewing ViewModels:
- identify responsibilities
- extract business rules to domain layer
- extract mapping to mapper classes/files
- extract validation logic
- extract reusable state logic where appropriate
- keep the ViewModel focused on intent handling, state exposure, and coordination

### 3. Separation of concerns and project pattern fit

Check that responsibilities are cleanly separated across:
- UI / presentation
- state holder / ViewModel / presenter
- domain / use cases / business rules
- data / repository / API / persistence
- mapping / adapter layers
- navigation
- design-system reusable components

Watch for:
- feature modules reaching into each other improperly
- UI code directly depending on transport/network models
- shared abstractions being bypassed
- platform-specific code leaking into common code without a good reason
- helper code copied into feature modules instead of reused from the correct shared location
- local changes that quietly introduce a competing pattern

Prefer review against the existing project architecture, not an imaginary rewrite. Flag meaningful drift, but prefer incremental improvements over speculative redesign.

---

## Model and boundary integrity

Review whether each architectural layer uses the correct model type.

Flag:
- DTOs escaping the data layer
- domain models polluted with UI or persistence concerns
- screen logic depending directly on backend response shapes
- excessive reuse of one model across unrelated layers
- unclear or duplicated mapping responsibilities
- “god models” reused everywhere for convenience
- persistence entities leaking into presentation or domain without clear justification

Prefer:
- transport/data models in the data layer
- domain models for business concepts
- UI models for screen-specific rendering needs when appropriate
- explicit mappers/adapters in predictable locations
- clear ownership of mapping logic

Also review whether:
- nullability is modeled intentionally
- optional fields are handled in the right layer
- unknown enum or backend values are tolerated where appropriate
- conversion between models is testable and discoverable

---

## State management correctness

Review state design for clarity, predictability, and testability.

Flag:
- contradictory state flags
- impossible state combinations
- one-off effects modeled as persistent state incorrectly
- state updated from too many sources without clear ownership
- event handling that risks replay or duplication
- ad hoc mutation patterns that are hard to reason about
- state models that mix durable UI state with transient navigation/toast/snackbar effects
- partial updates that can produce invalid state
- mutable state leaked beyond its owner

Prefer:
- explicit state models
- predictable state transitions
- clear separation between durable UI state and transient effects
- reducers/state transformers where complexity justifies them
- state ownership that is easy to trace and test
- immutable public state surfaces

Review whether:
- loading, success, empty, error, partial-data, and retry states are modeled appropriately
- submit/refresh/load-more/restore flows can coexist safely
- stale data and fresh data interactions are intentional
- event-triggered state changes are deterministic

---

## Dependency injection and object lifetime

Review whether dependencies are created and scoped correctly.

Flag:
- direct instantiation of significant collaborators in feature code
- singleton use where narrower scoping is more appropriate
- stateful objects shared too broadly
- lifecycle mismatches between owner and dependency
- hidden service locators or ad hoc dependency access
- dependencies that make testing harder because construction is implicit
- objects whose lifetime is longer than their owning feature actually needs

Prefer:
- explicit dependency injection
- correct scoping aligned with lifecycle and ownership
- clear dependency graphs
- easily testable construction paths
- narrow object lifetime where possible

Also review:
- whether dispatchers are injected where the project expects it
- whether stateful caches, coordinators, or managers are scoped appropriately
- whether shared instances can accidentally leak state between features or sessions

---

## Navigation, state, and data handling review

Check that:
- navigation decisions are not scattered inconsistently
- state models are explicit and predictable
- loading/empty/error/success states are handled
- partial or missing backend data is handled safely
- role/permission/session-dependent behavior is not assumed blindly
- optimistic assumptions about backend fields are avoided
- nullability is handled intentionally, not defensively everywhere
- effect dispatch does not create duplicate navigation or repeated snackbars

Flag:
- navigation logic mixed unpredictably across UI and state holder
- brittle route assumptions
- state transitions that can trigger duplicate navigation
- UI paths that assume backend completeness
