# Diff-derived KMP validation policy

Validation answers one question: does the actual change have sufficient evidence for every affected configured target and consumer?

## Discover before selecting tasks

1. Use the immutable base SHA supplied by the orchestrator.
2. Collect committed, staged, unstaged, deleted, renamed, and untracked files.
3. Read Gradle settings and build files to discover modules, plugins, Kotlin targets, compilations, source-set hierarchies, and task names.
4. Use Gradle task output to confirm a task exists before claiming it as a gate.
5. Inspect CI and repository guidance for environment-only checks and non-Gradle artifacts.

The planner's scope is context, not authority. When scope and diff disagree, the diff wins and the discrepancy is reported.

## Command boundaries

Validation runs build, test, and analysis tasks only. Tasks that publish, upload, deploy, distribute, install, sign, or re-provision artifacts are blocked by the role guard and are never evidence, even when the repository defines them as part of a check. The same applies to options that relocate the build or load an external init script. When a required check genuinely needs such a task, report it as `BLOCKED_CONFIG` and let the orchestrator raise it with the user.

## Coverage rules

- A `commonMain` or other shared production change affects every configured target that consumes that source set.
- A platform source-set change affects that target and its production consumer.
- A shared public, sealed, serialized, or generated contract change requires every discovered production consumer and test fake.
- Test source-set changes require the test compilation and execution task that owns them.
- Build-logic and convention-plugin changes require representative consumers, not only compilation of the build-logic project.
- Static analysis passes only for files demonstrably covered by the executed configuration.
- Repository-local server, script, schema, migration, or generated artifacts use their own documented checks. Missing checks are visible gaps.
- Unknown modules, source sets, targets, or task mappings fail as `BLOCKED_CONFIG` until resolved.

Do not invent Android or Apple targets that the repository does not configure. Conversely, never omit a configured target because the current host cannot execute it.

## Environment outcomes

- `PASS`: required command ran successfully and covers the claimed artifacts.
- `FAIL`: required command ran and detected an introduced failure.
- `BLOCKED_ENV`: the host lacks required tooling, credentials, simulator/device, or operating system. Completion requires evidence from an authorized environment.
- `BLOCKED_CONFIG`: required coverage exists but no reliable task or mapping can be discovered.
- `NOT_APPLICABLE`: repository evidence proves the check does not apply.

`BLOCKED_ENV` and `BLOCKED_CONFIG` are not successful final verdicts.

## Base-debt discrimination

When a configured gate already fails on the target base:

1. retain named diagnostics from the ticket worktree;
2. reproduce the suspected baseline diagnostics at the exact base SHA in an isolated checkout or trusted CI artifact;
3. compare identities and changed-file intersections, not only counts;
4. fail any new, changed, or moved diagnostic introduced by the ticket;
5. report unresolved attribution as a coverage gap.

## Regression sensitivity

For bug fixes, business rules, concurrency, caching, security behavior, and plan deviations, evidence must detect recurrence. Prefer a safe mutation or counterfactual demonstration: remove or invert the intended behavior, observe the targeted test fail for the expected reason, restore it, and observe it pass. When mutation is unsafe or impractical, explain the alternative proof and let the reviewer judge the gap.

## Final gate

Final `PASS` requires:

- repository identity matches the approved handoff;
- all actual files are mapped or explicitly proven non-production;
- all required configured targets and consumers have evidence;
- all required tests and static analysis pass;
- no introduced failures;
- no required environment or configuration gaps;
- regression sensitivity is adequate for the change risk;
- the verdict records the change digest of the tree it was produced against.

A verdict is valid only for that exact tree. Any later edit, including a fixer edit, requires re-validation.
