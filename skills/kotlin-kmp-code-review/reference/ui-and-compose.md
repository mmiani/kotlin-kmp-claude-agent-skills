# Shared UI system, strings, Compose, and accessibility

Reference material for the `kotlin-kmp-code-review` skill. Read this file when the change under review touches these concerns.

---

## Shared UI system enforcement

The code must follow the existing project design system and shared UI conventions.

Review for correct use of:
- existing shared components already present in the codebase
- spacing tokens instead of raw dimensions where tokens should be used
- shared typography and theme styles
- approved app color usage
- existing design patterns and shared building blocks before creating new UI primitives

Flag and fix:
- direct use of generic Compose primitives when a project abstraction already exists
- inconsistent spacing values
- ad hoc styling
- hardcoded dimensions when tokens/components already exist
- UI duplication that should be extracted into reusable components
- mixing feature-specific styling with shared design-system responsibilities
- ignoring existing shared layout/content/error/loading patterns

When a reusable pattern appears more than once, consider extracting a component, but do not over-abstract prematurely.

Review whether:
- the code uses shared UI conventions consistently across states
- empty/loading/error states match existing patterns
- visual hierarchy and interaction patterns feel like the rest of the app
- reusable UI logic is placed in the correct shared layer

---

## Strings and localization rules

Do not allow hardcoded user-facing strings.

Review for:
- strings that should go into resource files
- default text that does not match the project’s language/tone conventions
- missing localization wiring
- feature code with embedded labels, button text, titles, placeholders, errors, or toasts/snackbars
- user-facing strings created in ViewModels/repositories/domain logic when they belong in presentation/resources
- raw backend strings surfaced to users

Prefer:
- string resources
- the project’s default product tone and language unless requirements say otherwise
- parameterized string resources where dynamic data is involved
- presentation-level formatting for user-facing values

Review whether:
- number/date/currency formatting is done in the correct layer
- pluralization and parameterized messages are handled properly
- fallback text is product-appropriate rather than developer-centric

---

## Compose review rules

### 1. Avoid unnecessary recomposition

Review composables for recomposition and rendering inefficiencies.

Flag and fix:
- unstable parameters passed unnecessarily
- creation of heavy objects during recomposition
- repeated sorting/filtering/mapping directly inside composables when it should be precomputed
- lambdas recreated unnecessarily where it creates avoidable churn
- reading broad state when only a small subset is needed
- large composables doing too much work in one place
- state hoisting problems
- missing memoization where appropriate
- derived UI data recalculated repeatedly in composition
- unnecessary use of `collectAsState` / state observation too high in the tree
- expensive formatting or resource selection repeated for each recomposition

Check for opportunities to use:
- smaller composables
- state hoisting
- `remember` when appropriate
- `derivedStateOf` when appropriate
- stable UI models
- immutable collections/models where the project pattern supports it

Do not mechanically add `remember` everywhere. Only use it when it improves correctness or performance.

### 2. Side effects correctness

Review use of:
- `LaunchedEffect`
- `DisposableEffect`
- `SideEffect`
- `rememberCoroutineScope`
- `snapshotFlow`

Flag:
- incorrect keys
- effects restarting unnecessarily
- launching work from composition without the right lifecycle handling
- collecting flows in the wrong place
- stale captured values
- lifecycle leaks
- side effects coupled too tightly to rendering code
- event consumption patterns that risk duplicate effects

### 3. Lazy layouts and lists

Review lists for:
- stable keys
- item content separation
- expensive per-item computation
- missing extraction of list item composables
- nested scrolling/performance traps
- avoidable recomposition of whole lists
- unstable item models
- inline derived state repeated across rows

### 4. State observation placement

Review whether state is observed at the right level in the tree.

Flag:
- collecting large screen state at the top and passing broad state everywhere
- child composables receiving more state than they need
- direct repository or use case reads inside composables
- UI observing raw data flows that should already be shaped by the state holder

### 5. Compose API hygiene

Review composable APIs for:
- too many parameters
- mixed concerns
- unstable or mutable inputs
- callbacks that are ambiguous or easy to misuse
- booleans controlling many branches instead of clearer UI models

---

## Accessibility and UX robustness

Review whether the implementation is robust and understandable for users across normal and degraded states.

Flag:
- unclear loading, empty, or error handling
- actions without feedback
- color-only communication of meaning
- poor accessibility semantics where relevant
- fragile flows under slow network or partial data
- retry/recovery paths that are missing or unclear
- confusing disabled states
- degraded-state UX that leaves the user stuck without guidance
- no distinction between “no data yet” and “failed to load”
- inaccessible click targets or semantics where the platform supports better patterns

Prefer:
- explicit user feedback
- resilient degraded-state UX
- accessible semantics where supported by the platform/pattern
- clear retry and recovery behavior
- recoverable user paths under partial backend failure
