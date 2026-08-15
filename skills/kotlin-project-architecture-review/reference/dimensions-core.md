# Ownership, data flow, and layer responsibilities

Review dimensions 1-10: single source of truth, unidirectional data flow, Android entry-point discipline, UI layer, state-holder quality, domain layer, data layer, failure model, layering, and dependency lifetime.

Reference material for the `kotlin-project-architecture-review` skill. Read this file when the work touches these concerns.

---

## 1. Single source of truth

Check whether every important piece of data has one clear owner.

Questions:
- What is the source of truth for this data?
- Is there more than one writable owner?
- Is UI holding durable app truth that should live lower?
- Is repository ownership explicit?
- In offline-first or cache-backed flows, is local persistence treated as source of truth when appropriate?
- Is there a coherent ownership strategy across app memory, persistence, network, and UI?

Flag as a concern when:
- multiple layers mutate the same data independently
- UI owns business-critical state beyond screen-local concerns
- network payloads are treated as truth where resilient local ownership is needed
- memory, persistence, and remote state are merged ad hoc without a clear owner
- feature-level local caches bypass the intended source of truth

## 2. Unidirectional data flow

Expected shape:
- user events move upward into a state holder
- state is produced by state holders from data/domain inputs
- rendered UI consumes state
- updates come back as new state instead of ad hoc mutation

Check whether:
- UI renders from state instead of pulling dependencies directly
- state is not mutated from several unrelated places
- one-off events are not confused with long-lived UI state
- state restoration or background refresh still fits the same flow model

Flag as a concern when:
- composables call repositories directly
- business logic runs in rendering code
- navigation, snackbar, toast, or permission effects are mixed into persistent state without clear modeling
- side-entry flows bypass the main state pipeline

## 3. Android component entry-point discipline

Android components are entry points with distinct lifecycles, and Activities / Fragments primarily host UI.

Check whether:
- Activities and Fragments are treated as UI hosts and platform lifecycle boundaries
- Services are used only for real background/service responsibilities
- BroadcastReceivers are thin entry points that delegate quickly
- ContentProviders are used intentionally rather than as general architecture shortcuts
- platform entry points delegate to state holders, repositories, or other appropriate layers
- component boundaries still make sense under process death, restart, background delivery, and external invocation

Flag as a concern when:
- Activities or Fragments own business rules, repository coordination, transport parsing, or data orchestration
- Services are used as architecture dumping grounds
- BroadcastReceivers contain meaningful feature orchestration inline
- platform entry points become the effective source of truth
- entry-point behavior depends on hidden assumptions rather than explicit delegation

## 4. UI layer responsibilities

The UI layer should consume app data, render it, handle user interactions, and reflect event effects in UI state.

Check whether:
- UI is focused on rendering and interaction
- state holders sit between UI and lower layers
- UI models are shaped for rendering rather than mirroring transport models
- screen states include loading, success, empty, error, partial-data, and retry when needed
- presentation-specific formatting is kept in the presentation edge

Flag as a concern when:
- UI owns repository or data-source orchestration
- DTOs reach the UI directly
- UI performs large business transformations inline
- UI is responsible for interpreting backend semantics that belong lower

## 5. State-holder quality

The specific mechanism is less important than whether the contract is satisfied:
- one immutable observable state output
- separate one-time effects
- user actions as inputs
- no business logic in the UI layer

Check whether:
- there is a clear state-holder boundary such as ViewModel, presenter, reducer, or equivalent
- immutable state is exposed, not mutable state flows accessible from outside
- the state holder consumes user actions and produces UI state without being a two-way bridge
- state production is based on clear, traceable inputs and outputs
- one-time effects are modeled separately from persistent `UiState`
- similar screens use similar state-holder patterns unless there is a good reason not to

Flag as a concern when:
- no state holder exists despite meaningful screen complexity
- the state holder is a god object
- UI state and one-time effects are conflated into the same stream
- state holders absorb responsibilities that should belong to repositories, use cases, or coordinators

## 6. Domain layer usage

The domain layer is optional. It should exist when it reduces duplication or isolates meaningful business logic.

Check whether:
- domain use cases encapsulate complex or reusable business logic
- domain models stay independent of UI and transport concerns
- the domain layer adds clarity rather than indirection
- use cases own meaningful decisions rather than forwarding trivially

Flag as a concern when:
- a domain layer exists but only forwards calls
- trivial pass-through use cases add ceremony with no isolation benefit
- domain code depends on framework, UI, or transport details
- reusable business logic is duplicated across state holders instead of extracted
- the domain layer is omitted even though meaningful business rules are shared or complex

## 7. Data layer responsibilities

Repositories should expose data, centralize changes, resolve conflicts across sources, abstract sources, and own data-related coordination.

Check whether:
- repositories expose app/domain-facing outputs
- repositories centralize writes and coordination
- multiple data sources are resolved in one place
- the rest of the app is insulated from transport and persistence specifics
- cache / persistence / refresh behavior has a clear ownership model

Flag as a concern when:
- repositories merely mirror raw endpoints
- UI or state-holder coordinates local and remote data directly
- persistence and network details leak upward
- refresh / invalidation / reconciliation responsibilities are ambiguous
- repositories are so generic they stop owning meaningful app data decisions

## 8. Failure model and error-handling architecture

Check whether:
- the project has a consistent failure model
- failures are surfaced deliberately
- repository/data errors are normalized when needed
- user-facing messages are derived at the presentation edge
- retryable and non-retryable failures are distinguishable when relevant
- cancellation, timeout, auth failure, validation failure, and partial-data cases have structurally sensible treatment
- degraded-state behavior is intentionally modeled

Flag as a concern when:
- strings are the effective error model
- each layer invents its own failure contract
- transport messages are shown directly to users by default
- failure handling differs arbitrarily across similar features
- error pathways are only understandable by reading scattered implementation details

## 9. Layering and separation of concerns

Expected layers: presentation / UI · orchestration / state-holder · optional domain · data / repositories / persistence · platform integration.

Check whether:
- UI contains business rules
- domain depends on transport, UI, or platform details
- DTOs leak into domain or presentation
- repositories own data coordination
- mapping responsibility is explicit and stable

Flag as a concern when:
- one file or module mixes UI, networking, mapping, and business rules
- repository implementations live inside state holders
- domain models are actually transport models
- platform SDK types appear in shared business code
- abstractions exist but do not line up with real ownership

## 10. Dependency boundaries and lifetime design

Check whether:
- dependency ownership is clear
- stateful collaborators are scoped appropriately
- lifetimes align with feature, screen, session, or app ownership
- construction paths remain testable and explicit
- long-lived state is not accidentally held by short-lived components or vice versa

Flag as a concern when:
- major collaborators are instantiated ad hoc in feature code
- object lifetime is longer than necessary
- implicit dependency access or service-locator-like patterns obscure ownership
