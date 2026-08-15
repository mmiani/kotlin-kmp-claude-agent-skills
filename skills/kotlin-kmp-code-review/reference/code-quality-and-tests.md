# Reusability, internal API design, static analysis, tests, observability, and documentation

Reference material for the `kotlin-kmp-code-review` skill. Read this file when the change under review touches these concerns.

---

## Reusability and file organization

### 1. Reusable components

Check whether repeated UI patterns, validation rules, mappers, or helper logic should be extracted.

Flag:
- duplicated UI blocks
- repeated transformation logic
- repeated validation logic
- ad hoc extension functions scattered in the wrong place
- duplicated sealed state handling patterns
- slightly different copies of the same business rule across features

Prefer reusable extraction only when:
- duplication is real
- naming can be clear
- abstraction improves maintainability

### 2. Classes in their own files

Classes, interfaces, mappers, validators, reducers, and reusable components should usually live in their own files when they are meaningful standalone units.

Flag:
- large files with many unrelated classes
- nested declarations that reduce discoverability
- helper classes buried inside large files without a strong reason
- feature files that combine UI, mapping, and orchestration

Do not split tiny private helpers into separate files unless it materially improves structure.

### 3. File size and complexity

Review for:
- long files
- long methods
- high cyclomatic complexity
- deep nesting
- “private helper graveyards”
- unclear grouping of related logic

Prefer:
- focused files
- discoverable naming
- cohesive grouping of responsibilities
- extracted helpers only when they meaningfully improve structure

---

## Internal API design quality

Review the design of functions, classes, and module interfaces as internal APIs.

Flag:
- broad or ambiguous function signatures
- boolean parameter smells
- methods with too many responsibilities
- mutable public surfaces where immutability is preferable
- APIs that leak implementation details to callers
- poor naming or unclear ownership
- function parameters that require callers to understand too much internal detail
- extension functions in surprising or inappropriate layers
- command/query responsibilities mixed into a single confusing API
- callbacks whose ordering or contract is unclear

Prefer:
- narrow and intention-revealing interfaces
- cohesive responsibilities
- immutability by default
- clear ownership and discoverability
- APIs that are easy to call correctly and hard to misuse

Review whether:
- abstraction boundaries match real usage
- public methods expose too many low-level details
- naming reflects business intent rather than implementation details

---

## Static analysis and code quality expectations

Review with Kotlin linting and static analysis standards in mind.

Check for issues that would matter to tools such as:
- ktlint
- detekt
- Android/Kotlin lint
- Compose-specific static analysis where relevant

Review for:
- overly long methods
- overly long files
- high cyclomatic complexity
- magic numbers
- poor naming
- excessive nesting
- nullable misuse
- misuse of scope functions
- hidden side effects
- dead code
- unused parameters/imports/helpers
- weak visibility modifiers
- extension functions placed in the wrong layer
- inconsistent naming with the surrounding codebase

Even if tools are not run yet, review as if the code should pass serious static analysis.

---

## Testing expectations

Review testability and gaps, even if tests were not requested.

Check whether the implementation should have:
- unit tests for domain logic
- mapper tests
- validator tests
- reducer/state transformation tests
- ViewModel tests for important state transitions
- repository tests where nontrivial mapping/orchestration exists
- concurrency or race-condition tests where multiple async paths exist
- serialization or parsing tests when boundary handling is important
- snapshot/state rendering tests if the project uses them for meaningful UI states

Flag:
- logic hidden in composables that is hard to test
- code coupled too tightly to platform APIs
- missing abstraction seams that prevent testing
- high-risk logic shipped without test coverage
- no tests around failure/retry/empty/partial-data behavior
- no tests around duplicate-action protection or race-prone flows

Do not demand tests for trivial wiring, but do flag missing tests for meaningful logic.

---

## Observability and diagnosability

Review whether the implementation will be understandable in production when things go wrong.

Flag:
- silent failures
- unstructured or low-value logging
- missing context around high-risk operations
- excessive logging noise
- logging of sensitive data
- critical user flows with no useful diagnostic signals
- errors swallowed without analytics, logs, or surfaced state
- diagnostics that are impossible to correlate with the failing feature path
- no distinction between expected degraded states and genuine faults

Prefer:
- meaningful structured logs
- clear error propagation
- diagnostics around important flows
- privacy-safe logging and analytics
- enough context to understand failures without leaking sensitive information

Review whether:
- submit flows are traceable
- retry/failure states can be correlated with logs
- analytics events avoid leaking sensitive payloads
- production failures can be tied back to a specific feature path

---

## Documentation and discoverability

Review whether the code is understandable to future maintainers.

Flag:
- non-obvious decisions with no explanation
- reusable abstractions with unclear intended usage
- surprising constraints hidden in implementation details
- high-value architectural choices that are undocumented
- naming that makes responsibilities or ownership hard to discover
- behavior that depends on invariants not visible at call sites

Prefer:
- concise comments for non-obvious decisions
- discoverable naming
- lightweight documentation where it materially helps future work
- clear file and type organization
