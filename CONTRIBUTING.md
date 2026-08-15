# Contributing

Thanks for contributing.

## What belongs here

This repository is for public, reusable AI agent skills related to Kotlin Multiplatform.

A good submission should be:

- focused on a clear use case
- reusable across multiple KMP codebases
- specific enough to change implementation quality
- grounded in sound architecture and platform boundaries
- safe to publish publicly

## Required structure

Each skill must live in its own folder under `skills/` and include `SKILL.md`.

Example:

```text
skills/
  kotlin-project-architecture-review/
    SKILL.md
```

## Required frontmatter

Each `SKILL.md` must begin with YAML frontmatter and include at least:

- `name` — must match the folder name exactly. In a plugin, `name` becomes the command segment, so a mismatch silently renames the skill when the package is distributed
- `description` — must open with `Use when ...`, because this is the trigger text Claude reads to decide whether to load the skill. Keep it under 1024 characters; the skill listing truncates description text at 1536
- `allowed-tools` — read-only inspection tools the skill needs, normally `Read, Grep, Glob`
- `license` — must be `Apache-2.0` for public submissions
- `metadata.author`
- `metadata.version` — use semver, e.g. `"1.0.0"`

Use only these fields. They are the ones the [Agent Skills](https://agentskills.io) spec allows, so the skills stay loadable on claude.ai and through the Skills API, where an unknown key is a hard error. Claude Code-only fields such as `paths`, `when_to_use`, and `context` are deliberately avoided for that reason.

## Size

A loaded skill stays in context for the rest of the session, so every line is a recurring token cost. Keep `SKILL.md` to the decision rules an agent must apply, and move long reference material into a separate file in the skill folder that `SKILL.md` points to, so it loads only when needed. `npm test` fails any `SKILL.md` over 35,000 bytes.

Every skill must also appear in the README catalog, and the README skill-count badge must match.

## Naming

All skills must follow:

`kotlin-<category>-<functional-name>`

Use a category listed in `CATEGORIES`. If your skill does not fit any existing category, propose a new category entry in the same PR and explain why the existing ones do not cover it.

**Category guidance:**
- `project` — cross-cutting KMP project-level concerns (architecture, modularization, state management, feature implementation patterns)
- `ui` — Compose UI, layout, adaptive behavior
- `navigation` — navigation structure, routes, deep links in shared nav code
- `data` — repositories, data sources, source-of-truth design
- `platform` — platform bridges, expect/actual, Android-specific platform concerns
- `testing` — test strategy, test layers, test tooling
- `build` — Gradle structure, convention plugins, version catalogs
- `architecture` — reserved for standalone architecture-pattern skills not fitting `project` (rare)

## Writing guidance

A strong skill should:

- state clearly when it should be used (the `description` frontmatter field is the primary trigger text, not the body)
- define the architectural defaults it assumes
- give explicit decision criteria for what to flag and why
- separate high-severity from lower-severity issues with concrete examples
- include anti-patterns with enough specificity to be actionable
- include references when official guidance materially informs the skill

A skill should **not**:

- present one opinionated stack choice (a DI framework, a database library) as a universal KMP default
- embed fast-changing version numbers as timeless structural rules
- include anything that assumes a specific private codebase or internal infrastructure
- be so generic that it gives no better guidance than reading the official docs directly

## Public safety rules

Do not include:

- secrets
- private hostnames
- internal endpoints
- production identifiers
- customer data
- private logs
- unpublished proprietary architecture details

## Pull requests

Please explain:

- what the skill is for
- how it differs from existing skills
- what category it belongs to
- which official or primary references informed it, if relevant

## Agent and orchestration changes

Reusable orchestration must remain repository-neutral:

- custom agents declare explicit frontmatter, tools, permission mode, and enforced boundaries
- planner and reviewer roles are read-only
- implementer and fixer roles cannot manage branches, commits, pushes, pull requests, or external trackers
- validation is derived from the actual diff and discovered KMP targets/tasks rather than a fixed module layout
- Android, Apple, JVM, JS, Wasm, desktop, and other targets are required only when configured and affected
- unavailable required coverage blocks completion instead of becoming a skipped pass
- review-cycle exhaustion and unresolved blocker/security findings fail closed
- reusable policy contains sanitized patterns, never ticket bodies, source excerpts, private URLs, logs, or customer data
- per-run evidence uses unique immutable records so concurrent worktrees cannot overwrite each other

Run `npm test` and `npm run validate:orchestration` before opening a pull request.


## Build guidance scope

Build-related skills must distinguish between:

- official structural guidance from Android/Gradle/Kotlin docs
- stack-specific examples that are optional
- time-sensitive version compatibility advice that should not be treated as timeless defaults
