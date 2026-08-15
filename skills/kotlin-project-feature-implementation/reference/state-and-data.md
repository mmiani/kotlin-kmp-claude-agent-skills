# State, data ownership, and dependency rules

Designing the state pipeline, deciding source of truth, and wiring dependencies.

Reference material for the `kotlin-project-feature-implementation` skill. Read this file when the work touches these concerns.

---

## State management rules

State must be predictable and testable.

### Prefer explicit state

Avoid ambiguous collections of booleans that create contradictory states.

Prefer:
- clear state data classes
- sealed sub-states when appropriate
- explicit fields with clear ownership
- state transformations that are easy to follow

### Separate durable state from transient effects

Do not mix:
- screen state
- navigation events
- snackbars/toasts
- permission requests
- one-time confirmations or one-time errors

Handle transient effects explicitly and safely.

### State ownership

A screen's state should have clear ownership. Do not let multiple unrelated async paths mutate shared state in ways that are hard to reason about.

### Avoid impossible states

Always ask:
- can this screen end up loading and success and blocking error at once?
- can stale data remain visible incorrectly?
- can a retried request corrupt the state?
- can multiple async updates interleave unpredictably?

---

## Data ownership decisions

For each new data type or flow, define:

- source of truth
- who owns reads
- who owns writes
- whether there is caching
- whether offline behavior matters
- how refresh/retry/invalidation works
- whether partial data is acceptable
- whether optimistic updates exist and how they reconcile

Do not create multiple writable sources of truth for the same data type unless this is clearly intentional and carefully coordinated.

---

## State pipeline design

For each feature flow, define:

- `UiState` shape
- user actions/events
- one-time effects
- loading → success path
- loading → error path
- retry path
- empty-state handling
- partial-data handling
- stale-response handling if multiple requests can overlap

State transitions should be explicit and easy to test.

---

## Dependency injection and construction rules

Use the project's DI pattern consistently.

Avoid:
- ad hoc construction of important collaborators inside feature code
- hidden service locator patterns
- singleton everything
- stateful dependencies with overly broad scope

Prefer:
- explicit dependency injection
- scope aligned to ownership/lifecycle
- construction that is easy to test
- small, well-defined dependency surfaces
