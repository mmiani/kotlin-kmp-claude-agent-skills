# Persistence, caching, source of truth, security, and privacy

Reference material for the `kotlin-kmp-code-review` skill. Read this file when the change under review touches these concerns.

---

## Persistence, caching, and source-of-truth discipline

Review how data is cached, persisted, and refreshed.

Flag:
- unclear source of truth
- duplicated state across memory, persistence, and UI without clear ownership
- stale cache risks
- persistence details leaking into unrelated layers
- optimistic updates without reconciliation strategy
- missing invalidation or refresh logic where needed
- local and remote state merged ad hoc in ViewModel/UI
- persistence models used too broadly across layers
- refresh logic that depends on hidden assumptions
- silent fallback to stale or partial data without a visible contract

Prefer:
- explicit source-of-truth decisions
- predictable refresh behavior
- narrow persistence boundaries
- cache behavior that is understandable and testable
- reconciliation strategies for optimistic or partial updates
- clear invalidation semantics

Review whether:
- retries can create duplicate writes
- partial failures leave local state inconsistent
- local state can be restored safely after process death if relevant
- pagination state and cache state are coordinated sensibly

---

## Security and privacy review

Review the implementation for client-side security, privacy, and trust-boundary issues.

Flag:
- secrets or tokens handled insecurely
- sensitive data logged, cached, or exposed unnecessarily
- role/permission checks enforced only in UI
- unsafe assumptions about backend authorization
- external input used without validation
- unsafe deep link, URL, WebView, file, or URI handling
- raw backend/internal error details exposed to users
- auth/session edge cases that could leak data or leave stale privileged state
- insecure local storage of sensitive values
- PII passed through layers that do not need it
- admin or privileged behaviors insufficiently isolated
- trusting client-side state for authorization-sensitive behavior
- user-supplied content rendered or routed without sufficient sanitization/validation
- sensitive values included in analytics or crash reporting

Prefer:
- minimal exposure of sensitive data
- privacy-safe logging
- explicit trust-boundary handling
- defensive parsing/validation of external input
- clear separation between UX gating and real authorization
- secure session cleanup and recovery behavior
- least-privilege handling of sensitive fields

Review also for:
- stale session state after logout
- cached privileged data remaining visible to a lower-privilege user
- assumptions that hidden UI equals protected behavior
- permissive WebView/navigation/deep link handling
- unvalidated IDs or routes flowing across boundaries
