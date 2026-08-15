# Compose, coroutine, and concurrency rules

Implementing rendering, async work, and concurrent flows safely.

Reference material for the `kotlin-project-feature-implementation` skill. Read this file when the work touches these concerns.

---

## Compose implementation rules

### 1. Compose is for rendering, not heavy work

Avoid in composition:
- large filtering/sorting/mapping chains
- expensive derived calculations
- repeated object creation that could be stabilized
- broad state observation when a smaller slice is enough

Prefer:
- precomputed UI state
- smaller composables
- stable UI models
- `remember` only when justified
- `derivedStateOf` only when it materially helps
- state hoisting where appropriate

### 2. Recomposition discipline

Watch for:
- unstable parameters
- lambdas recreated unnecessarily
- list items depending on overly broad parent state
- derived values recalculated every recomposition
- collecting state too high in the tree

### 3. Side-effects correctness

Be careful with `LaunchedEffect`, `DisposableEffect`, `SideEffect`, `rememberCoroutineScope`, and `snapshotFlow`.

Do not:
- launch work from composition without lifecycle reasoning
- use incorrect keys
- accidentally restart work
- capture stale values

### 4. Lazy list discipline

For lists:
- use stable keys where appropriate
- extract item content cleanly
- avoid expensive per-item computation in composition
- avoid re-rendering whole lists due to broad state coupling

---

## Coroutine and threading rules

### 1. Use the right dispatcher

Be explicit about IO/network work, database/persistence work, CPU-heavy transformations, and testable dispatcher injection if the project pattern expects it.

### 2. Respect structured concurrency

All async work should have clear ownership and lifecycle.

Avoid:
- detached jobs
- work that outlives the screen/feature scope unintentionally
- nested launches that obscure cancellation or sequencing

### 3. Preserve cancellation semantics

Be careful with broad `catch`, blanket `runCatching`, and generic failure wrappers that also catch `CancellationException`.

Cancellation is not a normal failure and should usually propagate.

### 4. Error handling must be intentional

Prefer explicit error mapping, clear UI failure states, domain-level error modeling where useful, and observability for important failures.

### 5. Flow usage must be intentional

Use the right abstraction: `Flow`, `StateFlow`, `SharedFlow`.

Avoid:
- duplicate collectors without need
- replay misuse
- expensive transformations duplicated per collector
- collecting raw streams in UI when state should already be prepared upstream

---

## Concurrency and race-condition rules

Assume async interactions can race unless you deliberately prevent it.

Design flows to handle:
- repeated taps
- duplicate submissions
- stale responses arriving after newer ones
- retries
- refresh while another request is in flight
- partial failures
- concurrent state updates

Prefer:
- explicit coordination
- deterministic update rules
- idempotent or guarded submit behavior
- latest-wins or first-wins semantics chosen intentionally
- debounce/throttle where necessary
