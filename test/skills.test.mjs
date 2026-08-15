import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(root, 'skills');

const skills = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

function frontmatter(name) {
  const text = readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, `${name} has no YAML frontmatter`);
  const fields = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([a-zA-Z-]+):\s*(.*)$/);
    if (field) fields[field[1]] = field[2].trim();
  }
  return { fields, body: text.slice(match[0].length), raw: text };
}

// Fields the Agent Skills spec allows outside Claude Code. Staying inside this
// set keeps every skill loadable on claude.ai and through the Skills API, where
// an unknown key is a hard error rather than a warning.
const PORTABLE_FIELDS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);

// Directories predating the naming convention. Renaming one changes the command
// users type, so these stay until that break is chosen deliberately.
const LEGACY_CATEGORY_NAMES = new Set(['kotlin-kmp-code-review', 'kotlin-kmp-refactor-safety']);

// Ratchet, not a target: no skill may grow past today's largest. Splitting the
// biggest skills into loaded-on-demand reference files should lower this.
const MAX_SKILL_BYTES = 35_000;

test('every skill has a valid, portable frontmatter contract', () => {
  assert.ok(skills.length > 0, 'no skills found');

  for (const name of skills) {
    const { fields } = frontmatter(name);

    // In a plugin, `name` becomes the command segment, so a mismatch silently
    // renames the skill when the package is distributed as a plugin.
    assert.equal(fields.name, name, `${name}: frontmatter name must match the directory`);

    assert.ok(fields.description, `${name}: description is required`);
    assert.ok(
      /^Use when\b/i.test(fields.description),
      `${name}: description must open with a "Use when ..." trigger so model invocation is reliable`,
    );
    assert.ok(
      fields.description.length <= 1024,
      `${name}: description is ${fields.description.length} chars; the listing truncates description plus when_to_use at 1536`,
    );

    for (const field of Object.keys(fields)) {
      if (field === 'author' || field === 'version') continue; // nested under metadata
      assert.ok(PORTABLE_FIELDS.has(field), `${name}: "${field}" is outside the portable Agent Skills field set`);
    }
  }
});

test('skill names follow the documented category convention', () => {
  const categories = readFileSync(join(root, 'CATEGORIES'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const name of skills) {
    assert.match(name, /^kotlin-[a-z0-9-]+$/, `${name}: must be kotlin-<category>-<functional-name>`);
    if (LEGACY_CATEGORY_NAMES.has(name)) continue;
    const category = name.split('-')[1];
    assert.ok(categories.includes(category), `${name}: category "${category}" is not listed in CATEGORIES`);
  }
});

test('skill bodies stay within the context budget', () => {
  for (const name of skills) {
    const bytes = statSync(join(skillsDir, name, 'SKILL.md')).size;
    assert.ok(
      bytes <= MAX_SKILL_BYTES,
      `${name}: SKILL.md is ${bytes} bytes. A loaded skill stays in context across turns, so move detail into a reference file the skill points to.`,
    );
  }
});

test('every skill is listed in the README catalog', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  for (const name of skills) {
    assert.ok(readme.includes(`skills/${name}/SKILL.md`), `${name}: missing from the README catalog`);
  }
  const badge = readme.match(/badge\/skills-(\d+)-/)?.[1];
  assert.equal(Number(badge), skills.length, 'README badge does not match the number of skills');
});

test('skill content is public-safe and free of broken link artifacts', () => {
  for (const name of skills) {
    const { raw } = frontmatter(name);
    for (const forbidden of ['/Users/', 'IdeaProjects/', 'Source/Github/', 'atlassian.net']) {
      assert.ok(!raw.includes(forbidden), `${name}: found non-public path or host ${forbidden}`);
    }
    const issueKeys = [...raw.matchAll(/\b([A-Z][A-Z0-9]{1,9})-\d+\b/g)]
      .map((match) => match[1])
      .filter((key) => !['EXAMPLE', 'TICKET', 'PROJECT', 'ISO', 'RFC', 'UTF', 'SHA', 'HTTP', 'OAUTH', 'SPDX', 'API'].includes(key));
    assert.deepEqual([...new Set(issueKeys)], [], `${name}: found what looks like a real issue-tracker key`);
    assert.doesNotMatch(raw, /\((https?:\/\/[^)]+)\)\(\1\)/, `${name}: duplicated link artifact`);
  }
});
