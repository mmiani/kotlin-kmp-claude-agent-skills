<div align="center">
<img src="https://upload.wikimedia.org/wikipedia/commons/7/74/Kotlin_Icon.png" alt="Kotlin" width="80" />

# Kotlin KMP Claude Agent Skills

**A public catalog of AI agent skills for Kotlin Multiplatform projects.**

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Skills](https://img.shields.io/badge/skills-14-brightgreen.svg)](#skills)
[![Kotlin Multiplatform](https://img.shields.io/badge/Kotlin-Multiplatform-7F52FF?logo=kotlin&logoColor=white)](https://kotlinlang.org/docs/multiplatform/multiplatform-discover-project.html)
[![Compose Multiplatform](https://img.shields.io/badge/Compose-Multiplatform-4285F4?logo=jetpackcompose&logoColor=white)](https://kotlinlang.org/docs/multiplatform/compose-multiplatform.html)

These skills are intentionally opinionated and grounded in official Android, Kotlin Multiplatform, and Gradle guidance. Built for reusable public use — not for one private codebase.

</div>

---

## Skills

### 🏗️ Architecture & Implementation

| Skill | What it does |
|---|---|
| [`kotlin-project-architecture-review`](skills/kotlin-project-architecture-review/SKILL.md) | Reviews KMP architecture, PRs, and layer boundaries. Produces a verdict, issue list, and concrete recommendations. |
| [`kotlin-project-feature-implementation`](skills/kotlin-project-feature-implementation/SKILL.md) | Guides feature implementation with a pre-coding checklist, layer-by-layer rules, and state pipeline design. Forward-looking only — not a review skill. |
| [`kotlin-project-modularization`](skills/kotlin-project-modularization/SKILL.md) | Reviews or designs module boundaries, dependency direction, visibility control, and granularity. |
| [`kotlin-project-state-management`](skills/kotlin-project-state-management/SKILL.md) | Covers state-holder pattern selection across KMP targets — ViewModel, shared presenter, MVI — including effect handling and `UiState` modeling. |

### 🎨 UI & Navigation

| Skill | What it does |
|---|---|
| [`kotlin-ui-compose-multiplatform`](skills/kotlin-ui-compose-multiplatform/SKILL.md) | Reviews shared Compose UI — state-driven architecture, composable decomposition, layout/modifier discipline, and previewability. |
| [`kotlin-ui-adaptive-resources`](skills/kotlin-ui-adaptive-resources/SKILL.md) | Reviews adaptive UI strategy — window-size classes, canonical layouts, navigation adaptation, and multi-window support. |
| [`kotlin-navigation-compose-multiplatform`](skills/kotlin-navigation-compose-multiplatform/SKILL.md) | Reviews Compose Multiplatform navigation — route modeling, back stack ownership, NavOptions, deep links, and browser URL binding. |

### 🔌 Platform Boundaries

| Skill | What it does |
|---|---|
| [`kotlin-platform-kmp-bridges`](skills/kotlin-platform-kmp-bridges/SKILL.md) | Reviews platform-specific integrations — source-set placement, hierarchical sharing, `expect`/`actual` usage, and entry-point wiring. |
| [`kotlin-platform-app-links-and-deep-links`](skills/kotlin-platform-app-links-and-deep-links/SKILL.md) | Reviews Android App Links and deep links — intent-filter design, host verification, `assetlinks.json`, and manifest scope. |

### 🗄️ Data, Testing & Build

| Skill | What it does |
|---|---|
| [`kotlin-data-kmp-data-layer`](skills/kotlin-data-kmp-data-layer/SKILL.md) | Reviews KMP data layers — repositories, data sources, source-of-truth design, conflict resolution, and error handling. |
| [`kotlin-testing-kmp`](skills/kotlin-testing-kmp/SKILL.md) | Reviews test strategy — `kotlin.test`, unit tests, instrumented tests, Compose UI tests, test doubles, and screenshot testing. |
| [`kotlin-build-kmp-gradle-governance`](skills/kotlin-build-kmp-gradle-governance/SKILL.md) | Reviews Gradle build structure — shared build logic, convention plugins, version catalogs, and source-set configuration. |

---

### 🐛 Bug Fix & Refactoring

| Skill | What it does |
|---|---|
| [`kotlin-project-bugfix`](skills/kotlin-project-bugfix/SKILL.md) | Guides root-cause analysis, minimal fix strategy, and regression prevention for KMP bugs. |
| [`kotlin-kmp-refactor-safety`](skills/kotlin-kmp-refactor-safety/SKILL.md) | Reviews refactoring safety — behavioral preservation, test coverage, migration strategies, and rollback plans. |

---

## Orchestration

The optional orchestration package executes one ticket through isolated custom agents while keeping lifecycle authority in the main orchestrator.

### Genuine custom agents

Each role has Claude Code YAML frontmatter, an independent context, an explicit tool list, a permission mode, an effort level, a turn limit, and an agent-scoped `PreToolUse` guard.

| Agent | Responsibility | Repository authority |
|---|---|---|
| [`kmp-ticket-planner`](agents/planner.md) | Confirm repository-grounded scope and validation intent | Read-only |
| [`kmp-ticket-implementer`](agents/implementer.md) | Apply the user-approved plan | Scoped source edits; no lifecycle operations |
| [`kmp-ticket-validator`](agents/validator.md) | Derive checks from the actual diff and configured targets | Read + verification commands |
| [`kmp-ticket-reviewer`](agents/reviewer.md) | Independently review code and evidence | Read-only |
| [`kmp-ticket-fixer`](agents/fixer.md) | Apply verified blocker/major fixes | Scoped source edits; no lifecycle operations |

The [`execute-ticket`](commands/execute-ticket.md) command invokes these agents through Claude Code's `Agent` tool. Reading their Markdown in one shared context is not considered role execution.

### Fail-closed lifecycle

```text
Frame problem and resolve target/base
  → fetch remote + enter isolated worktree
  → preflight toolchain and delivery capabilities
  → planner
  → explicit user approval
  → implementer
  → actual-diff validator
  → reviewer ↔ fixer ↔ validator (bounded)
  → moving-base check + final validation/review
  → machine finalization gate
  → commit + push + pull request
```

Unresolved validation failures, environment/configuration coverage gaps, security findings, blockers, or unapproved majors stop before commit, push, and PR creation. Exhausting the review budget is a blocked result, not warning-only success.

### Repository-neutral KMP validation

The pipeline discovers modules, source sets, targets, tasks, consumers, and static-analysis configuration from the target repository. It does not require a particular module layout, DI framework, UI toolkit, state-holder type, branch name, or fixed Gradle task.

Validation starts from the actual diff against an immutable base SHA. Shared changes cover every configured consumer; platform changes cover their configured targets; unavailable Apple or Android environments remain incomplete until an authorized environment supplies evidence. See [`validation-policy.md`](orchestration/validation-policy.md).

### Evidence and learning

Role handoffs use the contracts in [`handoff-contracts.md`](orchestration/handoff-contracts.md). Each run writes an immutable uniquely named record under the Git common directory, avoiding shared-file races and product-PR noise.

Reusable policy is deliberately curated in [`pipeline-policy.json`](orchestration/pipeline-policy.json). Agents consume only relevant active entries with exact fingerprints. Runtime results propose sanitized candidates; they do not automatically rewrite shared policy.

### Enforced hooks

| Hook | Purpose |
|---|---|
| [`guard-agent-boundaries.sh`](hooks/guard-agent-boundaries.sh) | Blocks role-incompatible shell commands and protected writes before execution |
| [`check-role-contract.sh`](hooks/check-role-contract.sh) | Refuses to let a role finish on a malformed, mismatched, or stale contract |
| [`inject-run-invariants.sh`](hooks/inject-run-invariants.sh) | Re-derives the run's base, branch, HEAD, and digest before a lifecycle command |
| [`lib/change-manifest.mjs`](hooks/lib/change-manifest.mjs) | Single Git-derived source of truth for the change manifest and its digest |
| [`lib/role-contracts.mjs`](hooks/lib/role-contracts.mjs) | Machine-checkable definition of what each role must return |
| [`preflight.sh`](hooks/preflight.sh) | Reports repository base and available local toolchain capabilities |
| [`collect-diff.sh`](hooks/collect-diff.sh) | Captures committed, staged, unstaged, deleted, renamed, and untracked changes |
| [`change-digest.sh`](hooks/change-digest.sh) | Derives the Git-only digest that binds each verdict to the tree it was produced against |
| [`check-finalization-gate.sh`](hooks/check-finalization-gate.sh) | Machine-checks validation/review evidence before lifecycle operations |
| [`validate-orchestration.sh`](hooks/validate-orchestration.sh) | Checks installed agents, contracts, policy, and fail-closed command invariants |
| [`finalize-summary.sh`](hooks/finalize-summary.sh) | Produces a read-only summary against the exact approved base |

### Permission model

[`settings.json`](settings.json) is conservative and shareable. Read and validation operations are allowed; edits and repository lifecycle operations ask for approval; sensitive files and destructive Git/shell operations are denied. The package does not install a broad `settings.local.json` override.

The role guard enforces three further boundaries for the five ticket agents, independently of settings:

- **No self-modification.** An agent cannot write to `.claude/`, the orchestration contracts, the hooks that constrain it, or `.github/workflows/`. Those files stay with the human-driven session.
- **Inspection cannot become execution.** Read commands are rejected when an option would write a file, page through a helper process, or relocate the build (`git diff --output`, `git grep -O`, `rg --pre`, `gradle --init-script`, and similar).
- **Validation cannot become delivery.** Gradle tasks, npm scripts, and `xcodebuild` actions that publish, upload, deploy, install, sign, or re-provision are blocked; the orchestrator alone performs delivery, with user approval.

Claude Code documentation: [custom subagents](https://code.claude.com/docs/en/sub-agents), [hooks](https://code.claude.com/docs/en/hooks), [permissions](https://code.claude.com/docs/en/permissions), and [worktrees](https://code.claude.com/docs/en/worktrees).

### GitHub Actions

Two workflow templates automate PR review and fixes:

[**`claude-pr-review.yml`**](.github/workflows/claude-pr-review.yml) — triggers on PR open/sync to `main`. Reviews the diff for architecture, KMP correctness, state management, Compose performance, coroutines, and missing tests. Skips Claude's own PRs and `[skip-review]` titles.

[**`claude-pr-fix.yml`**](.github/workflows/claude-pr-fix.yml) — triggers on `@claude fix` comments in PRs. Reads the diff and all review feedback, applies minimal targeted fixes, commits and pushes. Never expands scope. Because this job can write to the repository, it only responds to comments from an owner, member, or collaborator; comments from anyone else are ignored.

---

## Install

### Quick install (npx)

Run this from your KMP project root:

```bash
npx kotlin-kmp-agent-skills
```

The interactive installer lets you choose what to install:

1. **Everything** — skills + agents + commands + hooks + settings + GitHub workflows
2. **Skills only** — just the 14 KMP skill definitions
3. **Orchestration only** — agents + command + hooks + contracts + conservative settings
4. **Pick individually** — choose each component

Existing files are preserved by default (the installer asks before overwriting).

Commit or gitignore `.claude/` after installing. The pipeline derives the ticket change from the real working tree, so an untracked `.claude/` would otherwise be reported as part of the change under review.

### Manual install

Copy individual components as needed:

```bash
# Skills
cp -r skills/* .claude/skills/

# Agents + commands
cp -r agents .claude/agents
cp -r commands .claude/commands

# Hooks
cp -r hooks .claude/hooks

# Handoff, validation, and policy contracts
cp -r orchestration .claude/orchestration

# Settings
cp settings.json .claude/settings.json

# GitHub Actions
cp -r .github/workflows/* .github/workflows/
```

### Post-install

- Add `ANTHROPIC_API_KEY` to your repository secrets if you installed the GitHub workflows.
- Run `.claude/hooks/validate-orchestration.sh` from the target project.
- Keep project-specific commands and architecture in repository guidance; the validator discovers configured Gradle modules, targets, and tasks at runtime.
- Use a current Claude Code release with custom-agent frontmatter, hooks, and `EnterWorktree` support.

> The path `.claude/` is the default for Claude Code. Adjust if your agent framework uses a different directory.

---

## What these skills address

KMP projects tend to drift in predictable ways. This catalog focuses on where that drift happens most:

| Area | Common drift |
|---|---|
| **Source sets** | Platform code in `commonMain`; shared code that assumes one platform |
| **State ownership** | Multiple writable sources of truth; effects modeled as persistent state |
| **Data layer** | Repositories that only mirror endpoints; DTOs leaking into UI |
| **Navigation** | `NavController` passed deep into composables; stringly-typed routes |
| **Platform bridges** | `expect`/`actual` overused where interfaces would be simpler |
| **Deep links** | Unverified App Links; `assetlinks.json` misconfigured on one of several hosts |
| **Adaptive UI** | Phone layout stretched to tablet; no window-size-class strategy |
| **Testing** | Business logic only tested through UI; `kotlin.test` absent from shared source sets |
| **Modularization** | `common`/`core` modules as dumping grounds; cyclic dependencies |
| **Build** | Repeated Gradle config; no convention plugins; platform deps in common source sets |

---

## Design principles

These skills assume the following defaults unless a codebase has a strong reason to differ:

- **Layered architecture** — UI, domain (optional), data, platform
- **Single source of truth** — one clear owner per data type
- **Unidirectional data flow** — events up, state down
- **Immutable UI state** — exposed from state holders, rendered by UI
- **Effect separation** — one-time effects distinct from persistent `UiState`
- **Repository boundaries** — data sources hidden behind repositories
- **Source-set discipline** — shared code as high as valid, platform code at the edges
- **Minimal `expect`/`actual`** — used narrowly; interfaces preferred for complex abstractions
- **Test pyramid** — most confidence from lower-level tests, not UI/instrumented tests
- **Centralized build governance** — convention plugins, version catalogs, explicit repositories

---

## Naming convention

All skills follow:

```
kotlin-<category>-<functional-name>
```

Available categories:

| Category | Purpose |
|---|---|
| `project` | Cross-cutting KMP project-level concerns (architecture, modularization, state management) |
| `ui` | Compose UI, layout, adaptive behavior |
| `navigation` | Navigation structure, routes, deep links |
| `data` | Repositories, data sources, source-of-truth |
| `platform` | Platform bridges, `expect`/`actual`, Android-specific platform concerns |
| `testing` | Test strategy, test layers, test tooling |
| `build` | Gradle structure, convention plugins, version catalogs |
| `architecture` | Standalone architecture-pattern skills (rare) |

---

## Scope

This repository is for **public, reusable** skills only.

**Not included:**
- Secrets or private infrastructure details
- Internal hostnames or proprietary workflows
- Project-specific assumptions presented as universal KMP defaults

**Not assumed as universal baseline** (can be layered on top in project-specific variants):
- A specific DI framework
- A specific database library
- A specific CI provider
- A fixed AGP / Gradle / Kotlin compatibility matrix
- Stack-specific ProGuard / R8 rules

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## References

<details>
<summary>Android architecture</summary>

- [Android Architecture](https://developer.android.com/topic/architecture)
- [Architecture Recommendations](https://developer.android.com/topic/architecture/recommendations)
- [UI Layer](https://developer.android.com/topic/architecture/ui-layer)
- [Domain Layer](https://developer.android.com/topic/architecture/domain-layer)
- [Data Layer](https://developer.android.com/topic/architecture/data-layer)
- [Application Fundamentals](https://developer.android.com/guide/components/fundamentals)

</details>

<details>
<summary>Modularization and build</summary>

- [Guide to Android app modularization](https://developer.android.com/topic/modularization)
- [Common modularization patterns](https://developer.android.com/topic/modularization/patterns)
- [Gradle Convention Plugins](https://docs.gradle.org/current/userguide/implementing_gradle_plugins_convention.html)
- [Gradle Version Catalogs](https://docs.gradle.org/current/userguide/version_catalogs.html)
- [Android Kotlin Multiplatform Plugin](https://developer.android.com/kotlin/multiplatform/plugin)

</details>

<details>
<summary>Navigation and deep links</summary>

- [Navigation Principles](https://developer.android.com/guide/navigation/principles)
- [Navigate to a destination](https://developer.android.com/guide/navigation/use-graph/navigate)
- [Navigate with options](https://developer.android.com/guide/navigation/use-graph/navoptions)
- [Pass data between destinations](https://developer.android.com/guide/navigation/use-graph/pass-data)
- [Animate transitions](https://developer.android.com/guide/navigation/use-graph/animate-transitions)
- [Conditional navigation](https://developer.android.com/guide/navigation/use-graph/conditional)
- [Back stack](https://developer.android.com/guide/navigation/backstack)
- [About App Links](https://developer.android.com/training/app-links/about)
- [Create deep links](https://developer.android.com/training/app-links/create-deeplinks)
- [Add App Links](https://developer.android.com/training/app-links/add-applinks)
- [Configure website associations](https://developer.android.com/training/app-links/configure-assetlinks)

</details>

<details>
<summary>Adaptive UI and layout</summary>

- [Adaptive layouts in Compose](https://developer.android.com/develop/ui/compose/layouts/adaptive)
- [Support different display sizes](https://developer.android.com/develop/ui/compose/layouts/adaptive/support-different-display-sizes)
- [Window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)
- [Multi-window mode](https://developer.android.com/develop/ui/compose/layouts/adaptive/support-multi-window-mode)
- [Build adaptive navigation](https://developer.android.com/develop/ui/compose/layouts/adaptive/build-adaptive-navigation)
- [Canonical layouts](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts)
- [List-detail layout](https://developer.android.com/develop/ui/compose/layouts/adaptive/list-detail)
- [Supporting pane layout](https://developer.android.com/develop/ui/compose/layouts/adaptive/build-a-supporting-pane-layout)

</details>

<details>
<summary>Testing</summary>

- [Testing fundamentals](https://developer.android.com/training/testing/fundamentals)
- [What to test](https://developer.android.com/training/testing/fundamentals/what-to-test)
- [Test doubles](https://developer.android.com/training/testing/fundamentals/test-doubles)
- [Testing strategies](https://developer.android.com/training/testing/fundamentals/strategies)
- [Local unit tests](https://developer.android.com/training/testing/local-tests#location)
- [Robolectric](https://developer.android.com/training/testing/local-tests/robolectric)
- [Instrumented tests](https://developer.android.com/training/testing/instrumented-tests)
- [Screenshot testing](https://developer.android.com/training/testing/ui-tests/screenshot)

</details>

<details>
<summary>Kotlin Multiplatform and Compose Multiplatform</summary>

- [KMP project structure](https://kotlinlang.org/docs/multiplatform/multiplatform-discover-project.html)
- [KMP hierarchy](https://kotlinlang.org/docs/multiplatform/multiplatform-hierarchy.html)
- [Share code on similar platforms](https://kotlinlang.org/docs/multiplatform/multiplatform-share-on-platforms.html)
- [Expected and actual declarations](https://kotlinlang.org/docs/multiplatform/multiplatform-expect-actual.html)
- [Use platform-specific APIs](https://kotlinlang.org/docs/multiplatform/multiplatform-connect-to-apis.html)
- [Compose Multiplatform](https://kotlinlang.org/docs/multiplatform/compose-multiplatform.html)
- [Compose adaptive layouts](https://kotlinlang.org/docs/multiplatform/compose-adaptive-layouts.html)
- [Compose previews](https://kotlinlang.org/docs/multiplatform/compose-previews.html)
- [Navigation in Compose Multiplatform](https://kotlinlang.org/docs/multiplatform/compose-navigation.html)
- [Deep links in Compose navigation](https://kotlinlang.org/docs/multiplatform/compose-navigation-deep-links.html)
- [Navigation 3 (alpha)](https://kotlinlang.org/docs/multiplatform/compose-navigation-3.html)
- [Compose Multiplatform testing](https://kotlinlang.org/docs/multiplatform/compose-test.html)
- [KMP DSL reference](https://www.jetbrains.com/help/kotlin-multiplatform-dev/multiplatform-dsl-reference.html)

</details>

---

<div align="center">

Apache-2.0 · Built for [Claude](https://claude.ai) and compatible AI coding agents

</div>
