# Coroutines, threading, and race-condition safety

Reference material for the `kotlin-kmp-code-review` skill. Read this file when the change under review touches these concerns.

---

## Coroutine and threading review rules

Be strict here.

### 1. Dispatcher/threading correctness

Review whether work is executed on the correct dispatcher/thread.

Flag and fix:
- blocking or expensive work on main thread
- ambiguous threading for IO/network/database/heavy mapping
- CPU-heavy transformations done in UI/ViewModel on main
- missing dispatcher injection where the project expects testable dispatching
- accidental thread hopping that adds complexity without benefit

Review whether:
- heavy mapping or sorting is done too late in the pipeline
- background work returns to main only where necessary
- thread decisions are visible and testable

### 2. Cancellation correctness

Review coroutine usage to ensure cancellation is handled properly.

Flag:
- swallowing cancellation accidentally
- broad `catch` blocks that intercept cancellation incorrectly
- long-running loops without cancellation awareness
- operations that ignore structured concurrency
- child jobs launched in a way that can leak or outlive expected scope

Make sure:
- cancellation exceptions are not incorrectly converted into generic failures
- concurrent work is scoped correctly
- work is tied to lifecycle-appropriate scopes
- `supervisorScope` / `coroutineScope` usage is intentional

### 3. Exception handling

Review for:
- silent failures
- overbroad `try/catch`
- missing recovery paths
- mixing domain errors with transport errors with UI errors without clear mapping
- exceptions converted to vague generic states without observability
- blanket `runCatching` misuse that hides failure semantics
- fallback behavior that masks real faults

Prefer:
- explicit error mapping
- domain-level error types where appropriate
- preserving cancellation semantics
- avoiding blanket `runCatching` misuse if it obscures failure paths

### 4. Flow and async stream correctness

Review usage of:
- `Flow`
- `StateFlow`
- `SharedFlow`

Flag:
- wrong hot vs cold stream choice
- unnecessary multiple collectors
- replay/buffer misuse
- `stateIn` / `shareIn` misuse
- expensive transformations duplicated across collectors
- collecting streams in the UI when state should already be prepared in ViewModel/presenter
- mutable streams exposed publicly
- event streams configured in ways that risk replay bugs or dropped events

Review whether:
- stream ownership is clear
- collector lifetimes match feature lifetimes
- sharing policy is intentional
- expensive upstream transformations are not repeated needlessly

---

## Concurrency and race-condition safety

Review for race conditions and coordination issues beyond basic coroutine correctness.

Flag:
- duplicate submissions from repeated taps/events
- stale responses overriding newer state
- concurrent jobs mutating the same state unsafely
- missing debounce/throttle where user input can trigger repeated work
- non-idempotent actions with weak protection against retries
- refresh/load interactions that can produce inconsistent UI state
- multiple async paths updating shared state without deterministic ordering
- retry flows that can replay destructive actions unsafely
- latest-wins vs first-wins behavior left accidental
- multiple requests for the same resource without coordination

Prefer:
- explicit coordination of concurrent work
- latest-wins or first-wins behavior chosen intentionally
- duplicate-action protection where needed
- deterministic state updates under concurrency
- idempotent or safely guarded submit flows where appropriate

Review whether:
- concurrent pagination and refresh can conflict
- optimistic UI and server confirmation can race
- restored state can be overwritten by slow in-flight work
- repeated navigation or effect dispatch can happen from racing state paths
