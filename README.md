<div align="center">
<img src="https://upload.wikimedia.org/wikipedia/commons/7/74/Kotlin_Icon.png" alt="Kotlin" width="80" />

# Kotlin KMP Agent Skills

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

Beyond individual skills, this repository includes a full **agent pipeline** for automated ticket execution, code review, and fixes. The orchestration system is designed to work with Claude Code and can be installed alongside the skills.

### Agent Pipeline

Five specialized agents work together in a structured pipeline. Agents communicate via structured JSON contracts and load skills dynamically based on what changed.

| Agent | Role | Definition |
|-------|------|------------|
| **Planner** | Analyzes tickets, inspects the codebase, loads pipeline memory, and produces structured plans with scope metadata | [`agents/planner.md`](agents/planner.md) |
| **Implementer** | Executes approved plans, loads diff-aware skills, respects memory constraints from past runs | [`agents/implementer.md`](agents/implementer.md) |
| **Validator** | Parallel escalating validation (metadata → android + tests + detekt concurrently → cross-module) | [`agents/validator.md`](agents/validator.md) |
| **Reviewer** | Cost-aware code review with file priority tiers, 10 categories, and recurring pattern detection | [`agents/reviewer.md`](agents/reviewer.md) |
| **Fixer** | Targeted fixes with confidence scoring and human-review flagging for uncertain fixes | [`agents/fixer.md`](agents/fixer.md) |

### 10-Phase Execution Pipeline

The [`execute-ticket`](commands/execute-ticket.md) command orchestrates a full ticket lifecycle:

```
Phase 1:  BRANCH       → Create feature branch from ticket ID
Phase 2:  PLAN         → Planner analyzes ticket + codebase + pipeline memory
                         ↳ User approval gate
Phase 3:  IMPLEMENT    → Implementer executes plan with diff-aware skills
Phase 4:  VALIDATE     → Validator runs parallel escalating checks
Phase 5–7: REVIEW LOOP → Up to 3 iterations of REVIEW → FIX → RE-VALIDATE
                         ↳ Exits early on APPROVE or low-confidence fix
Phase 8:  FINALIZE     → Stage, commit, push to remote
Phase 9:  METRICS      → Update pipeline metrics + recurring findings memory
Phase 10: OUTPUT       → Generate PR-ready summary with review stats
```

### Key improvements over a basic agent chain

**Iterative review loop** — the REVIEW → FIX → RE-VALIDATE cycle runs up to 3 times. If the fixer introduces a new issue, the reviewer catches it. Exits early when the reviewer approves (zero blockers + zero major issues).

**Diff-aware skill loading** — agents only load skills relevant to the changed code. A data-layer-only change won't load Compose UI or navigation skills, saving context and reducing noise.

**Parallel validation** — the validator combines independent Gradle tasks into single invocations. Level 1 (metadata) runs for all modules in parallel. After that, Android compilation, unit tests, and detekt run concurrently.

**Structured JSON contracts** — agents pass typed JSON between phases instead of free-form markdown. The planner's `scope` object drives decisions in every downstream agent (which skills to load, which validation levels to run, which review categories to prioritize).

**Pipeline memory** — recurring review findings are persisted in `.claude/pipeline-memory.json`. The planner reads this and injects constraints into the plan so the implementer avoids repeating known mistakes. Stale patterns are automatically pruned after 10 runs.

**Cost guardrails** — the reviewer classifies files by risk tier (high/medium/low) and adjusts review depth accordingly. For large PRs (>20 files), low-risk files are only scanned for blockers.

**Fixer confidence scoring** — the fixer reports confidence (high/medium/low) for each fix. Low-confidence fixes pause the pipeline for human input instead of guessing.

**Metrics tracking** — every run writes to `.claude/pipeline-metrics.json` with timing, findings, fix counts, and iteration data. Over time, this reveals patterns like average review iterations and first-pass approval rate.

### Validation Hooks

Shell scripts in [`hooks/`](hooks/) provide standalone validation:

| Hook | Purpose | Usage |
|------|---------|-------|
| [`validate-compile.sh`](hooks/validate-compile.sh) | Metadata compilation for a module | `./validate-compile.sh <filepath>` |
| [`validate-detekt.sh`](hooks/validate-detekt.sh) | Detekt code quality for a module | `./validate-detekt.sh <filepath>` |
| [`validate-tests.sh`](hooks/validate-tests.sh) | Unit tests for a module | `./validate-tests.sh :module:path` |
| [`finalize-summary.sh`](hooks/finalize-summary.sh) | Git state summary for end-of-pipeline | `./finalize-summary.sh` |

### Permission Model

Two settings files control what Claude Code can do:

[**`settings.json`**](settings.json) (base, conservative) — allows read operations, git read commands, gradlew tasks, and file inspection. Denies editing secrets/keystores/credentials and destructive git operations. Includes a PostToolUse hook that logs file modifications.

[**`settings.local.json`**](settings.local.json) (extended, for local/CI) — adds full edit/write, git commit/push/rebase, GitHub CLI, ADB commands, and destructive operations.

### GitHub Actions

Two workflow templates automate PR review and fixes:

[**`claude-pr-review.yml`**](.github/workflows/claude-pr-review.yml) — triggers on PR open/sync to `main`. Reviews the diff for architecture, KMP correctness, state management, Compose performance, coroutines, and missing tests. Skips Claude's own PRs and `[skip-review]` titles.

[**`claude-pr-fix.yml`**](.github/workflows/claude-pr-fix.yml) — triggers on `@claude fix` comments in PRs. Reads the diff and all review feedback, applies minimal targeted fixes, commits and pushes. Never expands scope.

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
3. **Orchestration only** — agents + commands + hooks + settings (no workflows)
4. **Pick individually** — choose each component

Existing files are preserved by default (the installer asks before overwriting).

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

# Settings
cp settings.json .claude/settings.json
cp settings.local.json .claude/settings.local.json

# GitHub Actions
cp -r .github/workflows/* .github/workflows/
```

### Post-install

- Add `ANTHROPIC_API_KEY` to your repository secrets if you installed the GitHub workflows.
- Edit the module-path patterns in `hooks/validate-compile.sh` and `hooks/validate-detekt.sh` to match your project's module structure.

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
