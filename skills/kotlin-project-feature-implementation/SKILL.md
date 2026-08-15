---
name: kotlin-project-feature-implementation
description: Use when implementing or extending a feature in a Kotlin Multiplatform project. Provides pre-coding inspection, KMP source-set discipline, state pipeline design, architectural defaults, security/performance guardrails, and implementation rules. Forward-looking only — not a review skill.
allowed-tools: Read, Grep, Glob
license: Apache-2.0
metadata:
  author: Mariano Miani
  version: "3.0.0"
---

# Kotlin Multiplatform Feature Implementation

Use this skill when **implementing** a new feature or extending an existing flow in a Kotlin Multiplatform project.

This skill is forward-looking only. It is not a review skill. It does not produce verdicts or issue severity ratings. For post-implementation or PR review, use `kotlin-project-architecture-review` instead.

Your job is to deliver production-grade code that fits the existing architecture, respects the shared UI system, preserves module boundaries, and remains easy to maintain over time.

Do not optimize for speed of output alone.  
Optimize for correctness, scalability, maintainability, security, consistency, and clean evolution of the existing codebase.

---

## What this skill does

- Provides a pre-coding inspection checklist to read the codebase before writing anything
- States the architectural defaults to implement against
- Gives layer-by-layer implementation rules
- Defines KMP source-set placement discipline
- Defines state pipeline and data ownership expectations
- Enforces shared UI system usage
- Adds performance, coroutine, concurrency, and security guardrails
- Defines the expected output format for an implementation plan

---

## Primary goals

For every implementation, optimize for:

1. **Architectural consistency**
2. **Small, coherent diffs**
3. **Business logic in the right layer**
4. **Strong separation of concerns**
5. **Model and boundary integrity**
6. **Predictable state management**
7. **Shared UI system consistency**
8. **Composable, reusable design**
9. **Compose performance**
10. **Coroutine and threading correctness**
11. **Concurrency and race-condition safety**
12. **Security and privacy safety**
13. **Source-of-truth discipline**
14. **Testability**
15. **Migration and rollout safety**
16. **Long-term maintainability**

---

## Default architecture assumptions

Unless the project clearly does otherwise, implement features using:

- UI driven from immutable state
- user events flowing into a state holder
- repositories owning data access and coordination
- domain layer only when business logic is complex, reused, or meaningfully reduces state-holder complexity
- shared logic in `commonMain` only when valid for all declared targets
- platform code at the edges
- narrow module APIs and cohesive feature ownership
- tests alongside new logic, not deferred

Do not invent new structure if the codebase already has a valid one. Match conventions unless there is a clear reason not to, and state that reason explicitly in the implementation plan.

---

## Implementation philosophy

Before writing code, understand how the existing app already solves similar problems.

Do not introduce parallel patterns unless the current pattern is clearly broken and the task explicitly requires changing it.

Default behavior:
- preserve existing architecture
- extend existing modules rather than creating shadow flows
- reuse existing components before creating new ones
- make the smallest coherent implementation that solves the task correctly
- keep business logic out of UI
- avoid unrelated refactors
- prefer explicit, readable code over clever abstractions

---

## Step 0: Read before writing

Inspect the relevant existing feature before writing any code. Identify:

1. **Module boundaries** — which modules own the feature area, and what their public APIs are
2. **Source-set placement** — what is in `commonMain` vs platform source sets; where new code belongs
3. **Route and navigation ownership** — where routes are defined, how new screens integrate
4. **State-holder pattern in use** — ViewModel, presenter, state machine; what the existing contract looks like
5. **Repository and data-source abstractions** — existing interfaces, implementations, source-of-truth rules, error model
6. **Domain layer presence and rationale** — whether it exists, whether it adds value, whether new logic belongs there
7. **Error-model conventions** — exceptions, result wrappers, sealed error types; what the project uses consistently
8. **Existing tests** — test locations, test doubles, patterns already established
9. **Shared UI system usage** — existing shared components, spacing tokens, typography patterns, strings/localization patterns
10. **Similar flows already implemented** — find the closest existing feature and copy the pattern, not just the visual result

Do not start coding before grounding the implementation in the current codebase.

---

## Required workflow

Follow this workflow for every feature unless explicitly told otherwise.

### Step 1: Inspect first
Before implementing:
- identify the feature/module involved
- identify navigation entry points
- identify existing presentation/state patterns
- identify domain/use case patterns
- identify repository/data/API boundaries
- identify existing shared UI components
- identify similar features/screens already implemented
- identify whether the change belongs in shared code or platform-specific code
- identify source-of-truth expectations
- identify security/trust-boundary implications if the feature touches auth, session, deep links, payments, files, web content, roles, or PII

### Step 2: Plan before editing
Before making changes, produce a short implementation plan that includes:
1. files to inspect
2. files likely to change
3. new files likely to be added
4. business logic placement
5. data ownership and source-of-truth decisions
6. state pipeline changes required
7. API/data implications
8. source-set placement decisions
9. risks and edge cases
10. tests that should be added

### Step 3: Implement the smallest coherent slice
Implement only what is required for the requested slice.

Prefer vertical slices such as:
- models + mapper + repository contract
- ViewModel/state changes
- UI rendering for known state
- API integration for one path
- loading/error handling
- one interaction flow at a time

Avoid broad end-to-end rewrites unless explicitly requested.

### Step 4: Self-check before finishing
Before considering the task done, check for:
- architecture drift
- large ViewModels
- logic in the wrong layer
- DTO leakage across boundaries
- ambiguous or contradictory state
- shared UI system misuse
- hardcoded strings
- Compose recomposition risks
- coroutine/threading issues
- cancellation and exception handling issues
- race conditions or duplicate-submission risks
- source-of-truth confusion
- security/privacy issues
- missing tests

---
## Detailed implementation rules

The full rule sets live in this skill's `reference/` folder. Read only the files the feature actually touches; do not load them all by default.

| File | Covers |
|---|---|
| [`reference/layer-rules.md`](reference/layer-rules.md) | UI layer; Shared UI system rules; Strings and localization; State holder; Domain layer; Data layer; Source sets; Module boundaries; Navigation; Model and boundary rules; Recommended feature structure |
| [`reference/state-and-data.md`](reference/state-and-data.md) | State management rules; Data ownership decisions; State pipeline design; Dependency injection and construction |
| [`reference/compose-and-concurrency.md`](reference/compose-and-concurrency.md) | Compose implementation rules; Coroutine and threading rules; Concurrency and race-condition rules |
| [`reference/quality-guardrails.md`](reference/quality-guardrails.md) | Security and privacy; Tests; Observability; Backward compatibility and rollout; Accessibility and UX robustness; Reusability and file organization; Internal API design; Lint and static analysis; KMP-specific rules |

`reference/layer-rules.md` and `reference/state-and-data.md` apply to nearly every feature. Read the other two as the work reaches them.

## Anti-patterns to prevent

- starting to write code before reading the existing structure
- multiple writable sources of truth for the same data type
- direct repository or data-source access from composables
- pass-through use cases that add ceremony without isolation benefit
- DTOs or persistence models flowing into `UiState`
- platform-specific APIs in `commonMain`
- feature logic embedded in bridge implementations
- treating loading, error, empty, and partial-data states as afterthoughts
- inconsistent error modeling relative to the rest of the codebase
- new module APIs wider than the feature needs
- massive ViewModels
- business logic in composables
- broad state observation causing extra recomposition
- blocking work on main
- swallowing cancellation
- unstructured coroutine launches
- race conditions in submit/refresh flows
- duplicated UI patterns that should be components
- giant files with mixed responsibilities
- insecure token/session handling
- sensitive data in logs
- unclear source of truth
- brittle schema assumptions
- APIs that are easy to misuse
- hardcoded user-facing strings
- raw spacing/dimensions instead of design tokens where the system already provides them

---

## Required output format

When using this skill to guide implementation, produce:

1. **Pre-coding inspection summary**
   - modules and source sets affected
   - state-holder pattern in use
   - repository/data-source conventions observed
   - domain layer presence and rationale
   - error model in use
   - existing UI system patterns
   - existing test patterns

2. **Data ownership decisions**
   - source of truth for each new data type
   - who owns writes, who owns reads
   - offline/cache considerations if relevant

3. **State pipeline design**
   - `UiState` shape
   - user actions/events
   - one-time effects
   - loading → success
   - loading → error
   - retry
   - empty state
   - partial-data path if relevant

4. **Layer plan**
   - which files to create or modify
   - in which module
   - in which source set
   - what stays in shared code vs platform code
   - domain layer: yes/no and why

5. **Implementation**
   - code changes

6. **Tests to add**
   - state-holder transition tests
   - domain use case tests if applicable
   - repository/mapper tests
   - concurrency/boundary tests if needed
   - which test source set each test lives in

7. **Risks and edge cases**
   - source-set correctness risks
   - navigation edge cases
   - partial-data and error-path risks
   - concurrency/retry risks
   - security/trust-boundary risks
   - configuration/lifecycle edge cases

8. **Assumptions**
   - any architectural assumption made that is not directly verified in the codebase

If the task is clearly an editing task and not just analysis, keep the plan concise and then proceed with implementation.

---

## Default response structure

When asked to implement a feature, respond in this structure unless told otherwise:

1. **Pre-coding inspection summary**
2. **Data ownership decisions**
3. **State pipeline design**
4. **Layer plan**
5. **Risks and edge cases**
6. **Implementation**
7. **Tests added or recommended**
8. **Assumptions**

---

## Final instruction

Implement like an architect who will have to maintain this code for years.

Be strict about:
- correctness
- architecture boundaries
- scalability
- maintainability
- consistency
- performance
- security
- privacy
- testability
- rollout safety

Do not optimize for cleverness.  
Do not optimize for broad refactors.  
Optimize for clean, production-grade evolution of the existing codebase.

---

## References

- Android architecture recommendations — https://developer.android.com/topic/architecture/recommendations
- Android UI layer — https://developer.android.com/topic/architecture/ui-layer
- Android domain layer — https://developer.android.com/topic/architecture/domain-layer
- Android data layer — https://developer.android.com/topic/architecture/data-layer
- Android modularization — https://developer.android.com/topic/modularization
- Android navigation principles — https://developer.android.com/guide/navigation/principles
- Android configuration changes — https://developer.android.com/guide/topics/resources/runtime-changes
- Kotlin Multiplatform project structure — https://kotlinlang.org/docs/multiplatform/multiplatform-discover-project.html
- Compose Multiplatform — https://kotlinlang.org/docs/multiplatform/compose-multiplatform.html
- Navigation in Compose Multiplatform (Navigation 2, stable) — https://kotlinlang.org/docs/multiplatform/compose-navigation.html
- Navigation 3 in Compose Multiplatform (alpha as of mid-2025 — verify before adopting) — https://kotlinlang.org/docs/multiplatform/compose-navigation-3.html
