# Layer-by-layer implementation rules

What belongs in each layer, which model types cross which boundaries, source-set placement, module boundaries, navigation, and a default feature structure.

Reference material for the `kotlin-project-feature-implementation` skill. Read this file when the work touches these concerns.

---

## UI layer

- Render from immutable `UiState`
- No ad hoc dependency access in composables
- No repository or data-source calls from UI code
- No business rules in composables
- No DTOs or persistence models in `UiState`
- No platform-specific APIs in shared composables
- Handle all reachable states explicitly: loading, success, empty, error, partial-data, retry
- Handle responsive layout needs at this layer, not in lower layers
- Prefer stateless rendering composables where possible
- Keep one-time effects separate from persistent UI state

### Shared UI system rules

The feature must follow the existing project UI system.

Use and prefer:
- shared UI components already in the codebase
- layout abstractions when they already exist and fit
- spacing tokens instead of ad hoc spacing values
- shared typography and theme styles
- project-approved color and styling patterns
- existing shared primitives before creating new ones

Avoid:
- hardcoded spacing/dimensions when tokens already exist
- direct generic Compose primitives when a project abstraction already exists and fits
- duplicate UI patterns that should become shared components
- ad hoc styling inconsistent with the rest of the app

When a new reusable UI pattern is needed: extract it cleanly, give it a meaningful name, keep it focused, and place it in the right module/file. Do not over-abstract one-off UI fragments prematurely.

### Strings and localization rules

Do not hardcode user-facing strings.

All product-facing text should:
- use resource-based strings according to project conventions
- follow the app's default product tone and language unless the task says otherwise
- use parameterized resources where dynamic values are involved

This applies to titles, labels, button text, placeholders, snackbars, empty states, error messages, helper text, and accessibility text where relevant.

---

## State holder

- Expose exactly one immutable observable state stream, or the single state output pattern the project uses
- Separate one-time effects from persistent `UiState`
- Consume user actions/events as inputs; do not let UI coordinate work directly
- Coordinate lower layers; do not own data-layer logic inline
- Do not become a god object
- Keep lifecycle/platform wiring out of shared state-holder logic unless the project explicitly puts it there

A state holder is allowed to:
- receive user intents
- call use cases/repositories
- coordinate screen state
- expose state/effects
- do lightweight mapping from domain results into UI state

A state holder should not grow into:
- a workflow engine
- a validator bag
- a mapper dumping ground
- a formatting layer
- an analytics monolith
- a place for unrelated helper functions

When complexity rises: extract mappers, validators, state transformers/reducers, use cases/domain services, and split reusable logic into separate classes/files.

**Pattern note:**
On Android, ViewModel is the standard state holder and integrates with the lifecycle natively. On KMP targets without Android ViewModel, use the equivalent presenter or state-machine pattern the project has established. The shape must remain the same: one observable state output and separate effects regardless of the underlying implementation.

---

## Domain layer

Add a domain layer only when at least one of these is true:

- the business rule is reused by more than one state holder or flow
- the business rule is non-trivial and benefits from isolated testing
- extracting it makes the state holder meaningfully smaller and clearer
- the logic represents business concepts that should not live in the data or presentation layer

Do not add pass-through use cases to satisfy an architecture diagram. A use case that only forwards a repository call with no meaningful isolation is net-negative.

---

## Data layer

- Repositories expose domain-facing interfaces, not DTOs, not persistence schemas, not HTTP response shapes
- Repositories coordinate local and remote sources internally
- Callers should not see data-source coordination details
- DTOs and persistence models live below the repository boundary and do not cross it upward
- Preserve the project's established error model consistently across new repositories
- New data sources must have a single, narrow responsibility
- Source-of-truth decisions must be explicit

Be clear about:
- where reads come from
- where writes go
- how cache/local/remote coordination works
- how refresh/invalidation works
- how optimistic updates reconcile, if applicable

Do not merge local and remote state ad hoc in the UI/state holder unless the codebase explicitly already does that and it is justified.

---

## Source sets

Before placing any new file in `commonMain`, confirm it is valid for all declared targets.

Decision order:
1. Does it compile and behave correctly on all targets with no platform-specific API? → `commonMain`
2. Is it valid for a platform family? → intermediate source set such as `appleMain` or `iosMain`
3. Does it genuinely differ per target? → platform source set with a shared abstraction in `commonMain` if needed

Do not default to `expect`/`actual` before checking whether an interface plus injected implementation would be simpler.

Additional rules:
- do not place feature logic inside bridge implementations
- do not place platform APIs in shared code
- prefer shared business logic, mapping, validation, and state logic when it truly applies to all targets
- prefer platform-specific placement for OS integrations, permissions, storage APIs, platform navigation adapters, native SDK interop, or target-specific lifecycle wiring

---

## Module boundaries

- Keep feature changes local to the owning module wherever possible
- Do not bypass module APIs for implementation convenience
- If a change requires touching many modules, treat that as a signal that boundaries may need review; flag it in the plan
- New public module APIs should be as narrow as needed and no wider
- Do not let one feature reach directly into another feature's internal implementation details

---

## Navigation

- Follow the route model and entry-point patterns already established
- Do not re-architect navigation as part of a feature implementation unless explicitly scoped
- Preserve back/up behavior that matches user expectations
- Model deep-link entry realistically: the back stack after entry should be coherent, not empty
- Keep navigation decisions explicit and predictable
- Do not mix navigation events into persistent state

---

## Model and boundary rules

Each layer should speak in the right model type.

### Data layer models
Use DTOs / transport models, persistence entities, and remote/local data-source models. Do not leak these upward casually.

### Domain layer models
Use business-oriented models, use case input/output models, and validation/business concepts. Do not pollute domain models with Compose/UI concerns, persistence-only concerns, or transport-specific details.

### Presentation layer models
Use explicit UI state models and screen-specific UI models when needed. Do not pass a single "god model" through all layers just to reduce mapping work.

### Mapping rules
Mapping responsibilities must be explicit, predictable, easy to discover, and easy to test.

If a screen requires a screen-specific projection, create the right UI model instead of overloading a domain model.

---

## Recommended feature structure

When the project has no established feature structure, this shape is a reasonable default:

```text
feature-<name>/
  presentation/
    <FeatureName>Screen.kt
    <FeatureName>ViewModel.kt
    <FeatureName>UiState.kt
    <FeatureName>UiAction.kt
    <FeatureName>UiEffect.kt
    <FeatureName>Route.kt
  domain/
    <FeatureName>UseCase.kt
    <FeatureName>Model.kt
  data/
    <FeatureName>Repository.kt
    <FeatureName>RepositoryImpl.kt
    <FeatureName>RemoteSource.kt
    <FeatureName>LocalSource.kt
    <FeatureName>Dto.kt
    <FeatureName>Mapper.kt
  di/
    <FeatureName>Module.kt
```

The folder shape is not the goal. Cohesive ownership and predictable placement are. Match existing structure unless it is clearly broken.
