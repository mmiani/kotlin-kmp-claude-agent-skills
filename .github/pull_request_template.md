## Summary

Describe the skill or change.

## Change type

- [ ] KMP skill
- [ ] Agent/orchestration
- [ ] Installer/tooling
- [ ] GitHub workflow

## Skill category (when applicable)

- [ ] project
- [ ] ui
- [ ] navigation
- [ ] data
- [ ] platform
- [ ] testing
- [ ] build
- [ ] architecture

## Checklist

- [ ] Any new skill folder lives under `skills/` and has valid `SKILL.md` frontmatter
- [ ] Any custom agent has valid frontmatter and least-privilege tools
- [ ] Orchestration derives validation from the actual diff and fails closed on incomplete evidence
- [ ] Lifecycle operations remain owned by the orchestrator
- [ ] The content is public-safe (no private infra, no proprietary stack assumptions as defaults)
- [ ] The use case is focused and distinct from existing skills
- [ ] References include full URLs where official docs materially informed the skill
- [ ] Stack-specific examples (DI framework, specific library) are marked as optional, not universal defaults
- [ ] `npm test` and `npm run validate:orchestration` pass
