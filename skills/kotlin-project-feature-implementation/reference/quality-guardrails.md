# Quality guardrails

Security, tests, observability, rollout safety, accessibility, reusability, internal API design, and KMP portability rules to apply while implementing.

Reference material for the `kotlin-project-feature-implementation` skill. Read this file when the work touches these concerns.

---

## Security and privacy rules

Treat trust boundaries seriously.

### Never assume UI gating is real authorization

Do not rely on hidden buttons or client-side checks as security.

### Handle sensitive data minimally

Avoid:
- exposing tokens unnecessarily
- passing PII through layers that do not need it
- logging sensitive values
- including sensitive data in analytics or crash reporting
- caching sensitive data casually

### Be defensive with external input

Be careful with deep links, URLs, WebViews, file/URI handling, backend-provided text/data, user-provided input, and route parameters. Validate and parse defensively.

### Session/auth safety

Consider stale session state, logout cleanup, resume/re-entry paths, expired auth, and privileged state left hanging after session changes.

### Error exposure

Do not surface raw backend/internal errors directly to users unless explicitly appropriate.

---

## Tests

Write tests alongside implementation, not after.

At minimum, test:
- state-holder transitions for the new flow
- loading → success
- loading → error
- retry
- empty/partial-data handling where relevant
- business rules in new domain use cases, if any
- repository coordination logic, mappers, and error-handling paths
- navigation decision logic for any conditional routing
- parsing/serialization or boundary mapping where important
- concurrency-sensitive behavior where multiple async paths interact

Use shared tests where logic is shared. Use platform-specific test infrastructure only where the code is actually platform-specific.

Do not defer meaningful tests unless explicitly told to.

---

## Observability rules

For important flows, make failures diagnosable.

Prefer meaningful logs where the project expects them, explicit failure handling, useful diagnostics for critical paths, and privacy-safe logging and analytics.

Avoid silent failures, vague catch-and-ignore code, noisy logs with low value, and logs that expose sensitive data.

---

## Backward compatibility and rollout rules

Implement code so it can survive:
- partial rollout
- evolving backend schemas
- missing fields
- unknown enum values
- partially available backend functionality
- migration-sensitive local persistence changes

Prefer tolerant parsing where appropriate, graceful degradation, feature isolation, and rollout-safe assumptions.

Do not assume all clients, servers, and data are updated simultaneously.

---

## Accessibility and UX robustness rules

Implement UI that behaves well under slow network, partial data, empty states, errors, retries, and disabled states.

Ensure:
- users get feedback for important actions
- retry/recovery paths exist when needed
- degraded states are understandable
- accessibility semantics are added where relevant and supported by the existing pattern

---

## Reusability and file organization rules

### Reuse before creating

Before introducing a new component/helper/mapper, check for an existing one and extend or adapt existing patterns if appropriate.

### Extract only real reuse

Extract reusable code when duplication is real, the abstraction has a clear name, and it improves maintainability. Do not create generic abstractions too early.

### Keep files focused

Prefer one meaningful class/component/mapper/validator per file when appropriate, discoverable organization, and focused files.

Avoid giant files with multiple unrelated responsibilities, helper types buried inside unrelated files, and dumping many unrelated private utilities together.

---

## Internal API design rules

Treat internal code as APIs for future maintainers.

Prefer:
- intention-revealing names
- narrow interfaces
- immutable public surfaces by default
- parameters that are hard to misuse
- cohesive responsibilities

Avoid:
- boolean parameter smells
- broad signatures
- APIs that force callers to know too much
- weak naming
- mutable public state unless truly needed

---

## KMP-specific rules

Because this is KMP, always consider:

### Common vs platform-specific placement
Prefer common code unless platform-specific behavior is actually required. Do not introduce platform divergence casually.

### Portability
Avoid APIs or patterns that make shared code harder to port, test, or maintain.

### Cross-platform behavior consistency
Consider whether the implementation will behave consistently on iOS and Android.

### Cross-platform threading assumptions
Do not assume behavior that only makes sense for one target.
