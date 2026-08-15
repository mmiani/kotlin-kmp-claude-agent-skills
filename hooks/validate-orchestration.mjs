#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const projectRoot = process.cwd();
const installedRoot = join(projectRoot, '.claude');
const sourceMode = existsSync(join(packageRoot, 'agents'));
const root = sourceMode ? packageRoot : installedRoot;
const agentsDir = join(root, 'agents');
const commandFile = join(root, 'commands', 'execute-ticket.md');
const orchestrationDir = join(root, 'orchestration');
const errors = [];

const expectedAgents = {
  'planner.md': { name: 'kmp-ticket-planner', writable: false },
  'implementer.md': { name: 'kmp-ticket-implementer', writable: true },
  'validator.md': { name: 'kmp-ticket-validator', writable: false },
  'reviewer.md': { name: 'kmp-ticket-reviewer', writable: false },
  'fixer.md': { name: 'kmp-ticket-fixer', writable: true },
};

function read(path) {
  if (!existsSync(path)) {
    errors.push(`missing ${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  return match?.[1] || '';
}

for (const [file, expected] of Object.entries(expectedAgents)) {
  const text = read(join(agentsDir, file));
  const yaml = frontmatter(text);
  if (!yaml) errors.push(`${file} has no YAML frontmatter`);
  for (const field of ['name:', 'description:', 'tools:', 'permissionMode:', 'model:', 'maxTurns:', 'hooks:']) {
    if (!yaml.includes(field)) errors.push(`${file} missing ${field.slice(0, -1)}`);
  }
  if (!yaml.includes(`name: ${expected.name}`)) errors.push(`${file} has unexpected agent name`);
  const tools = yaml.match(/^tools:\s*(.+)$/m)?.[1] || '';
  if (expected.writable && (!tools.includes('Write') || !tools.includes('Edit'))) {
    errors.push(`${file} must declare scoped write tools`);
  }
  if (!expected.writable && (tools.includes('Write') || tools.includes('Edit'))) {
    errors.push(`${file} must remain read-only`);
  }
  if (/bypassPermissions/.test(yaml)) errors.push(`${file} bypasses permissions`);
  if (!yaml.includes('guard-agent-boundaries.sh')) errors.push(`${file} does not wire the role guard`);
  if (!yaml.includes('check-role-contract.sh')) errors.push(`${file} does not wire the contract check`);
}

const command = read(commandFile);
for (const agent of Object.values(expectedAgents).map((entry) => entry.name)) {
  if (!command.includes(`Agent(${agent})`)) errors.push(`execute-ticket does not allow ${agent}`);
  if (!command.includes(`\`${agent}\``)) errors.push(`execute-ticket does not explicitly invoke ${agent}`);
}
for (const required of ['EnterWorktree', 'BLOCKED_REVIEW', 'gh pr create', 'immutable base SHA', 'actual diff', 'change-digest.sh']) {
  if (!command.includes(required)) errors.push(`execute-ticket missing ${required}`);
}
if (/proceed[^\n]*warning/i.test(command)) errors.push('execute-ticket contains a fail-open warning path');

for (const file of ['handoff-contracts.md', 'validation-policy.md', 'pipeline-policy.json']) {
  read(join(orchestrationDir, file));
}
for (const file of [
  'guard-agent-boundaries.sh',
  'guard-agent-boundaries.mjs',
  'check-role-contract.sh',
  'check-role-contract.mjs',
  'inject-run-invariants.sh',
  'inject-run-invariants.mjs',
  'collect-diff.sh',
  'change-digest.sh',
  'change-digest.mjs',
  'check-finalization-gate.sh',
  'check-finalization-gate.mjs',
  'preflight.sh',
  'finalize-summary.sh',
  join('lib', 'change-manifest.mjs'),
  join('lib', 'role-contracts.mjs'),
]) {
  read(join(root, 'hooks', file));
}

const policyPath = join(orchestrationDir, 'pipeline-policy.json');
if (existsSync(policyPath)) {
  try {
    const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
    const collections = ['process_rules', 'recurring_findings', 'fix_strategies'];
    const ids = [];
    for (const key of collections) {
      if (!Array.isArray(policy[key])) errors.push(`pipeline policy ${key} must be an array`);
      for (const entry of policy[key] || []) {
        if (!entry.id) errors.push(`pipeline policy ${key} entry missing id`);
        else ids.push(entry.id);
        if (!['candidate', 'active', 'challenged', 'rejected', 'retired'].includes(entry.status)) {
          errors.push(`pipeline policy ${entry.id || key} has invalid status`);
        }
      }
    }
    if (new Set(ids).size !== ids.length) errors.push('pipeline policy IDs must be unique');
  } catch (error) {
    errors.push(`invalid pipeline policy JSON: ${error.message}`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}

console.log(`Orchestration validation passed (${sourceMode ? 'package source' : 'installed project'}).`);
