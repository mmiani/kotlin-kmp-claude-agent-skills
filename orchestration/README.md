# Orchestration support files

These files are installed into `.claude/orchestration/`.

- `handoff-contracts.md` defines evidence exchanged between isolated roles.
- `validation-policy.md` defines diff-derived, target-aware KMP validation.
- `pipeline-policy.json` contains curated reusable rules and strategies.

## Policy lifecycle

Runtime agents consume only entries with `status: "active"` and an exact applicable scope or fingerprint. Valid entry states are `candidate`, `active`, `challenged`, `rejected`, and `retired`.

Run evidence is not written into this directory. Each run receives an immutable, uniquely named record under the repository's Git common directory, which avoids product-PR noise and concurrent last-writer-wins updates.

Learning is deliberate: a completed run may propose sanitized candidates, but a human reviews and promotes them in a normal repository change. Never copy ticket bodies, source excerpts, customer data, credentials, internal URLs, or raw logs into reusable policy.
