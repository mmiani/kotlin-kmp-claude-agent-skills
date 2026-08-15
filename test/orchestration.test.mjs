import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    input: options.input,
    env: { ...process.env, ...options.env },
  });
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, 'expected YAML frontmatter');
  return match[1];
}

function walk(directory) {
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walk(path));
    else result.push(path);
  }
  return result;
}

test('custom agents declare least-privilege role contracts', () => {
  const roles = {
    planner: { name: 'kmp-ticket-planner', writable: false },
    implementer: { name: 'kmp-ticket-implementer', writable: true },
    validator: { name: 'kmp-ticket-validator', writable: false },
    reviewer: { name: 'kmp-ticket-reviewer', writable: false },
    fixer: { name: 'kmp-ticket-fixer', writable: true },
  };

  for (const [file, expected] of Object.entries(roles)) {
    const yaml = frontmatter(read(`agents/${file}.md`));
    assert.match(yaml, new RegExp(`^name: ${expected.name}$`, 'm'));
    for (const field of ['description', 'tools', 'permissionMode', 'model', 'effort', 'maxTurns', 'hooks']) {
      assert.match(yaml, new RegExp(`^${field}:`, 'm'), `${file} missing ${field}`);
    }
    const tools = yaml.match(/^tools:\s*(.+)$/m)?.[1] || '';
    assert.equal(tools.includes('Write') || tools.includes('Edit'), expected.writable);
    assert.doesNotMatch(yaml, /bypassPermissions|Agent\(/);
    assert.match(yaml, /guard-agent-boundaries\.sh/);
  }
});

test('execute-ticket explicitly invokes agents and fails closed', () => {
  const command = read('commands/execute-ticket.md');
  for (const role of ['planner', 'implementer', 'validator', 'reviewer', 'fixer']) {
    assert.match(command, new RegExp(`Agent\\(kmp-ticket-${role}\\)`));
    assert.match(command, new RegExp('Invoke `kmp-ticket-' + role + '`'));
  }
  assert.match(command, /EnterWorktree/);
  assert.match(command, /immutable base SHA/);
  assert.match(command, /actual diff/);
  assert.match(command, /BLOCKED_REVIEW/);
  assert.match(command, /FINALIZATION_GATE=PASS/);
  assert.match(command, /gh pr create --base <target> --head <branch>/);
  assert.doesNotMatch(command, /proceed[^\n]*warning/i);
  assert.doesNotMatch(command, /git diff --name-only main\.\.\.HEAD/);
});

const guardScript = join(root, 'hooks', 'guard-agent-boundaries.sh');
const guard = (agent_type, tool_name, tool_input) => run('bash', [guardScript], {
  input: JSON.stringify({ agent_type, tool_name, tool_input }),
});

test('role guard blocks lifecycle and protected writes', () => {
  assert.equal(guard('kmp-ticket-planner', 'Write', { file_path: '/tmp/Source.kt' }).status, 2);
  assert.equal(guard('kmp-ticket-reviewer', 'Bash', { command: 'git push origin branch' }).status, 2);
  assert.equal(guard('kmp-ticket-implementer', 'Bash', { command: 'git commit -m change' }).status, 2);
  assert.equal(guard('kmp-ticket-fixer', 'Write', { file_path: '/repo/.env.local' }).status, 2);
  assert.equal(guard('kmp-ticket-validator', 'Bash', { command: './gradlew :sample:allTests' }).status, 0);
  assert.equal(guard('kmp-ticket-implementer', 'Write', { file_path: '/repo/src/commonMain/Source.kt' }).status, 0);
});

test('role guard closes write and execution escapes in read commands', () => {
  const blocked = [
    ['kmp-ticket-validator', 'git diff --output=/tmp/exfil.patch HEAD'],
    ['kmp-ticket-reviewer', 'git grep -O vim pattern'],
    ['kmp-ticket-reviewer', 'git log --ext-diff'],
    ['kmp-ticket-implementer', 'git -c core.pager=sh diff'],
    ['kmp-ticket-validator', 'rg --pre curl pattern'],
    ['kmp-ticket-implementer', 'grep --output-file=/tmp/out pattern src'],
    // Attached short-option values must not slip past the option check.
    ['kmp-ticket-reviewer', 'git grep -Ovim pattern'],
    // Mutating forms of otherwise reporting subcommands.
    ['kmp-ticket-implementer', 'git branch ticket/new --show-current'],
    ['kmp-ticket-implementer', 'git worktree add /tmp/escape list'],
    ['kmp-ticket-implementer', 'git remote add evil https://example.invalid -v'],
    // History must not become a way to read protected files.
    ['kmp-ticket-validator', 'git show HEAD:app/google-services.json'],
    ['kmp-ticket-validator', 'git show HEAD:local.properties'],
    // Expansion would hide the real command from this check.
    ['kmp-ticket-implementer', './gradlew $TASK'],
    ['kmp-ticket-implementer', 'git diff ${BASE}'],
  ];
  for (const [role, command] of blocked) {
    assert.equal(guard(role, 'Bash', { command }).status, 2, `expected block: ${command}`);
  }

  const allowed = [
    ['kmp-ticket-reviewer', 'git diff --stat HEAD'],
    ['kmp-ticket-validator', 'git ls-files --others --exclude-standard'],
    ['kmp-ticket-implementer', 'rg -g *.kt viewModel src'],
    ['kmp-ticket-reviewer', 'grep -rn expect src'],
    ['kmp-ticket-reviewer', 'grep -o actual src/commonMain/Example.kt'],
    ['kmp-ticket-validator', 'rg -o expect src'],
    ['kmp-ticket-reviewer', 'git remote -v'],
    ['kmp-ticket-reviewer', 'git branch --show-current'],
    ['kmp-ticket-reviewer', 'git worktree list'],
    ['kmp-ticket-reviewer', 'git show HEAD:src/commonMain/Example.kt'],
    // Kotlin string templates stay searchable.
    ['kmp-ticket-reviewer', "rg '\\$state' src"],
  ];
  for (const [role, command] of allowed) {
    assert.equal(guard(role, 'Bash', { command }).status, 0, `expected allow: ${command}`);
  }
});

test('role guard blocks publishing, deploying, and build relocation', () => {
  const blocked = [
    './gradlew publishToMavenLocal',
    './gradlew :app:appDistributionUploadRelease',
    './gradlew installDebug',
    './gradlew wrapper --gradle-version 8.9',
    './gradlew --init-script /tmp/evil.gradle test',
    './gradlew -I /tmp/evil.gradle test',
    './gradlew --gradle-user-home /tmp/home test',
    './gradlew -Dorg.gradle.jvmargs=-javaagent:/tmp/a.jar test',
    './gradlew --build-file /tmp/evil.gradle build',
  ];
  for (const command of blocked) {
    assert.equal(guard('kmp-ticket-implementer', 'Bash', { command }).status, 2, `expected block: ${command}`);
  }

  const allowed = [
    './gradlew testReleaseUnitTest',
    './gradlew :shared:allTests --tests SomeTest',
    './gradlew assembleDebug',
    './gradlew build -x lint',
  ];
  for (const command of allowed) {
    assert.equal(guard('kmp-ticket-validator', 'Bash', { command }).status, 0, `expected allow: ${command}`);
  }

  assert.equal(guard('kmp-ticket-implementer', 'Bash', { command: 'npm run deploy' }).status, 2);
  assert.equal(guard('kmp-ticket-implementer', 'Bash', { command: 'npm publish' }).status, 2);
  assert.equal(guard('kmp-ticket-implementer', 'Bash', { command: 'npm test' }).status, 0);
  assert.equal(guard('kmp-ticket-implementer', 'Bash', { command: 'xcodebuild -exportArchive -exportPath /tmp/out' }).status, 2);
  assert.equal(guard('kmp-ticket-implementer', 'Bash', { command: 'xcodebuild -scheme Sample test' }).status, 0);
});

test('inspect-only roles cannot execute the build', () => {
  assert.equal(guard('kmp-ticket-planner', 'Bash', { command: './gradlew tasks' }).status, 0);
  assert.equal(guard('kmp-ticket-reviewer', 'Bash', { command: './gradlew projects' }).status, 0);
  assert.equal(guard('kmp-ticket-reviewer', 'Bash', { command: './gradlew test' }).status, 2);
  assert.equal(guard('kmp-ticket-planner', 'Bash', { command: 'npm test' }).status, 2);
});

test('agents cannot rewrite the orchestration control plane', () => {
  const controlPlane = [
    '/repo/.claude/settings.json',
    '/repo/.claude/settings.local.json',
    '/repo/.claude/agents/validator.md',
    '/repo/.claude/hooks/guard-agent-boundaries.mjs',
    '/repo/.claude/orchestration/handoff-contracts.md',
    '/repo/.github/workflows/claude-pr-fix.yml',
    '/repo/hooks/lib/change-manifest.mjs',
    '/repo/orchestration/pipeline-policy.json',
  ];
  for (const file_path of controlPlane) {
    for (const role of ['kmp-ticket-implementer', 'kmp-ticket-fixer']) {
      assert.equal(guard(role, 'Write', { file_path }).status, 2, `expected block: ${file_path}`);
      assert.equal(guard(role, 'Edit', { file_path }).status, 2, `expected block: ${file_path}`);
    }
  }

  // The human-driven session keeps ownership of its own configuration.
  assert.equal(guard('', 'Write', { file_path: '/repo/.claude/settings.json' }).status, 0);
  // Credential protection still applies to every caller.
  assert.equal(guard('', 'Write', { file_path: '/repo/app/google-services.json' }).status, 2);
});

test('diff collector includes staged, unstaged, deleted, renamed, and untracked files', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'kmp-diff-fixture-'));
  try {
    assert.equal(run('git', ['init', '-q'], { cwd: fixture }).status, 0);
    run('git', ['config', 'user.email', 'example@example.com'], { cwd: fixture });
    run('git', ['config', 'user.name', 'Example'], { cwd: fixture });
    for (const [file, content] of Object.entries({
      'staged.kt': 'one\n',
      'unstaged.kt': 'one\n',
      'deleted.kt': 'delete me\n',
      'renamed.kt': 'rename me\n',
    })) writeFileSync(join(fixture, file), content);
    run('git', ['add', '.'], { cwd: fixture });
    run('git', ['commit', '-qm', 'base'], { cwd: fixture });
    const base = run('git', ['rev-parse', 'HEAD'], { cwd: fixture }).stdout.trim();

    writeFileSync(join(fixture, 'staged.kt'), 'two\n');
    run('git', ['add', 'staged.kt'], { cwd: fixture });
    writeFileSync(join(fixture, 'unstaged.kt'), 'two\n');
    unlinkSync(join(fixture, 'deleted.kt'));
    renameSync(join(fixture, 'renamed.kt'), join(fixture, 'moved.kt'));
    run('git', ['add', 'renamed.kt', 'moved.kt'], { cwd: fixture });
    writeFileSync(join(fixture, 'untracked.kt'), 'new\n');

    const result = run('bash', [join(root, 'hooks', 'collect-diff.sh'), base], { cwd: fixture });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /M\s+staged\.kt/);
    assert.match(result.stdout, /M\s+unstaged\.kt/);
    assert.match(result.stdout, /D\s+deleted\.kt/);
    assert.match(result.stdout, /R\d+\s+renamed\.kt\s+moved\.kt/);
    assert.match(result.stdout, /\?\?\s+untracked\.kt/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

function gateFixture() {
  const fixture = mkdtempSync(join(tmpdir(), 'kmp-gate-fixture-'));
  assert.equal(run('git', ['init', '-q'], { cwd: fixture }).status, 0);
  run('git', ['config', 'user.email', 'example@example.com'], { cwd: fixture });
  run('git', ['config', 'user.name', 'Example'], { cwd: fixture });
  writeFileSync(join(fixture, 'Example.kt'), 'base\n');
  run('git', ['add', '.'], { cwd: fixture });
  run('git', ['commit', '-qm', 'base'], { cwd: fixture });
  const base = run('git', ['rev-parse', 'HEAD'], { cwd: fixture }).stdout.trim();

  writeFileSync(join(fixture, 'Example.kt'), 'implemented\n');
  writeFileSync(join(fixture, 'ExampleTest.kt'), 'test\n');

  // Run evidence lives outside the working tree, so it never becomes part of
  // the change it describes.
  const evidenceDir = mkdtempSync(join(tmpdir(), 'kmp-gate-evidence-'));
  return {
    fixture,
    base,
    evidencePath: join(evidenceDir, 'evidence.json'),
    cleanup: () => {
      rmSync(fixture, { recursive: true, force: true });
      rmSync(evidenceDir, { recursive: true, force: true });
    },
  };
}

// Read the digest the pipeline is required to record with each verdict.
function changeState(fixture, base) {
  const result = run('node', [join(root, 'hooks', 'change-digest.mjs'), base], { cwd: fixture });
  assert.equal(result.status, 0, result.stderr);
  const field = (name) => result.stdout.match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1] || '';
  return {
    digest: field('change_digest'),
    headSha: field('head_sha'),
    branch: field('branch'),
    paths: [...result.stdout.matchAll(/^path\t(.+)$/gm)].map((match) => match[1]),
  };
}

function evidenceFor(base, state, overrides = {}) {
  return {
    repository: { base_sha: base, branch: state.branch, head_sha: state.headSha },
    diff: { digest: state.digest, files: state.paths.map((path) => ({ path })) },
    validation: { verdict: 'PASS', digest: state.digest, coverage_gaps: [] },
    review: { verdict: 'APPROVE', digest: state.digest, iterations: 1, unresolved: [] },
    residual_risks: [],
    ...overrides,
  };
}

test('machine finalization gate rejects every non-approved state', () => {
  const { fixture, base, evidencePath, cleanup } = gateFixture();
  const gate = join(root, 'hooks', 'check-finalization-gate.mjs');
  const state = changeState(fixture, base);
  const passing = evidenceFor(base, state);
  const check = (evidence) => {
    writeFileSync(evidencePath, JSON.stringify(evidence));
    return run('node', [gate, evidencePath], { cwd: fixture });
  };

  try {
    assert.equal(check(passing).status, 0, check(passing).stderr);
    assert.notEqual(check(evidenceFor(base, state, { validation: { verdict: 'FAIL', digest: state.digest, coverage_gaps: [] } })).status, 0);
    assert.notEqual(check(evidenceFor(base, state, { validation: { verdict: 'BLOCKED_ENV', digest: state.digest, coverage_gaps: [] } })).status, 0);
    assert.notEqual(check(evidenceFor(base, state, { validation: { verdict: 'PASS', digest: state.digest, coverage_gaps: ['ios'] } })).status, 0);
    assert.notEqual(check(evidenceFor(base, state, { review: { verdict: 'REQUEST_CHANGES', digest: state.digest, iterations: 3, unresolved: ['M1'] } })).status, 0);
    assert.notEqual(check(evidenceFor(base, state, { review: { verdict: 'APPROVE', digest: state.digest, iterations: 0, unresolved: [] } })).status, 0);
    assert.notEqual(check(evidenceFor(base, state, { residual_risks: [{ id: 'R1', approved: false }] })).status, 0);
  } finally {
    cleanup();
  }
});

test('machine finalization gate rejects stale and fabricated evidence', () => {
  const { fixture, base, evidencePath, cleanup } = gateFixture();
  const gate = join(root, 'hooks', 'check-finalization-gate.mjs');
  const state = changeState(fixture, base);
  const check = (evidence) => {
    writeFileSync(evidencePath, JSON.stringify(evidence));
    return run('node', [gate, evidencePath], { cwd: fixture });
  };

  try {
    // A base SHA that does not exist in this repository cannot anchor evidence.
    assert.notEqual(check(evidenceFor('a'.repeat(40), state)).status, 0);

    // Claiming a file that was never touched.
    const fabricated = evidenceFor(base, state);
    fabricated.diff.files.push({ path: 'src/commonMain/Invented.kt' });
    const fabricatedResult = check(fabricated);
    assert.notEqual(fabricatedResult.status, 0);
    assert.match(fabricatedResult.stderr, /claims an unchanged path/);

    // Hiding a real change from the reviewed file set.
    const omitted = evidenceFor(base, state);
    omitted.diff.files = omitted.diff.files.slice(0, 1);
    const omittedResult = check(omitted);
    assert.notEqual(omittedResult.status, 0);
    assert.match(omittedResult.stderr, /missing from evidence/);

    // Reporting a HEAD other than the one being delivered.
    assert.notEqual(check(evidenceFor(base, { ...state, headSha: 'b'.repeat(40) })).status, 0);

    // Evidence that passed, followed by a further edit, must not still pass.
    const passing = evidenceFor(base, state);
    assert.equal(check(passing).status, 0);
    writeFileSync(join(fixture, 'Example.kt'), 'edited after review\n');
    const staleResult = check(passing);
    assert.notEqual(staleResult.status, 0);
    assert.match(staleResult.stderr, /stale for the current working tree/);

    // Re-running the gates against the new tree is the only way forward.
    assert.equal(check(evidenceFor(base, changeState(fixture, base))).status, 0);
  } finally {
    cleanup();
  }
});

test('subagent stop guard rejects malformed, mismatched, and stale contracts', () => {
  const { fixture, base, cleanup } = gateFixture();
  const guardPath = join(root, 'hooks', 'check-role-contract.mjs');
  const state = changeState(fixture, base);
  const stop = (agent_type, last_assistant_message, extra = {}) => run('node', [guardPath], {
    input: JSON.stringify({
      hook_event_name: 'SubagentStop',
      agent_type,
      cwd: fixture,
      last_assistant_message,
      ...extra,
    }),
  });
  const contract = (overrides = {}) => JSON.stringify({
    contract_version: 1,
    role: 'validator',
    verdict: 'PASS',
    repository: { worktree: fixture, branch: state.branch, base_sha: base },
    digest: state.digest,
    ...overrides,
  });

  try {
    // A well-formed contract for this exact tree lets the role finish.
    assert.equal(stop('kmp-ticket-validator', `Here is the result:\n\`\`\`json\n${contract()}\n\`\`\`\nAll targets passed.`).status, 0);
    // Roles outside the pipeline are untouched.
    assert.equal(stop('Explore', 'no contract here').status, 0);

    // No contract at all.
    assert.equal(stop('kmp-ticket-validator', 'Everything passed, trust me.').status, 2);
    // Verdict outside the role's vocabulary.
    assert.equal(stop('kmp-ticket-validator', contract({ verdict: 'APPROVE' })).status, 2);
    // Wrong role identity.
    assert.equal(stop('kmp-ticket-validator', contract({ role: 'reviewer' })).status, 2);
    // Identity that does not match the checkout.
    assert.equal(stop('kmp-ticket-validator', contract({
      repository: { worktree: fixture, branch: 'some-other-branch', base_sha: base },
    })).status, 2);
    assert.equal(stop('kmp-ticket-validator', contract({
      repository: { worktree: fixture, branch: state.branch, base_sha: 'a'.repeat(40) },
    })).status, 2);
    // A gating verdict without the digest that binds it to a tree.
    assert.equal(stop('kmp-ticket-validator', contract({ digest: undefined })).status, 2);
    assert.equal(stop('kmp-ticket-validator', contract({ digest: 'b'.repeat(64) })).status, 2);

    // A symlinked spelling of the same checkout is the same checkout.
    assert.equal(stop('kmp-ticket-validator', contract({
      repository: { worktree: `${fixture}/`, branch: state.branch, base_sha: base },
    })).status, 0);
    // A genuinely different path is still rejected.
    assert.equal(stop('kmp-ticket-validator', contract({
      repository: { worktree: tmpdir(), branch: state.branch, base_sha: base },
    })).status, 2);

    // Roles that do not gate delivery are not required to carry a digest.
    assert.equal(stop('kmp-ticket-implementer', JSON.stringify({
      contract_version: 1,
      role: 'implementer',
      verdict: 'COMPLETE',
      repository: { worktree: fixture, branch: state.branch, base_sha: base },
    })).status, 0);

    // The loop guard bounds this to one correction attempt.
    assert.equal(stop('kmp-ticket-validator', 'still no contract', { stop_hook_active: true }).status, 0);
  } finally {
    cleanup();
  }
});

test('lifecycle commands carry re-derived run invariants', () => {
  const { fixture, base, cleanup } = gateFixture();
  const hook = join(root, 'hooks', 'inject-run-invariants.mjs');
  const state = changeState(fixture, base);
  const fire = (command, tool_name = 'Bash') => run('node', [hook], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name, cwd: fixture, tool_input: { command } }),
  });

  try {
    // Non-lifecycle work is left alone.
    assert.equal(fire('./gradlew test').stdout, '');
    assert.equal(fire('anything', 'Read').stdout, '');

    const before = fire('git commit -m "ticket"');
    assert.equal(before.status, 0);
    const payload = JSON.parse(before.stdout);
    assert.equal(payload.hookSpecificOutput.hookEventName, 'PreToolUse');
    const context = payload.hookSpecificOutput.additionalContext;
    assert.match(context, new RegExp(`head_sha=${state.headSha}`));
    assert.match(context, new RegExp(`branch=${state.branch}`));
    assert.match(context, /FINALIZATION_GATE=PASS/);
    // Never blocks, so a broken evidence store cannot strand a run.
    assert.doesNotMatch(context, /recorded_base_sha/);

    // With run evidence present, the recorded state and live digest both appear.
    const runsDir = join(fixture, '.git', 'claude-pipeline-runs');
    mkdirSync(runsDir, { recursive: true });
    writeFileSync(join(runsDir, 'run.json'), JSON.stringify({
      run_id: 'example-1',
      status: 'in_progress',
      repository: { branch: state.branch, base_sha: base, target_branch: 'main' },
      diff: { digest: state.digest },
      validation: { verdict: 'PASS' },
      review: { verdict: 'APPROVE' },
    }));
    const withEvidence = JSON.parse(fire('gh pr create --base main').stdout).hookSpecificOutput.additionalContext;
    assert.match(withEvidence, new RegExp(`recorded_base_sha=${base}`));
    assert.match(withEvidence, new RegExp(`live_change_digest=${state.digest}`));
    assert.match(withEvidence, /recorded_review=APPROVE/);
    assert.doesNotMatch(withEvidence, /WARNING: recorded evidence is stale/);

    // Once the tree moves on, the injected context says so.
    writeFileSync(join(fixture, 'Example.kt'), 'edited after review\n');
    const stale = JSON.parse(fire('git push origin HEAD').stdout).hookSpecificOutput.additionalContext;
    assert.match(stale, /WARNING: recorded evidence is stale/);
  } finally {
    cleanup();
  }
});

test('clean orchestration install is complete, conservative, and non-destructive', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'kmp-install-fixture-'));
  try {
    writeFileSync(join(fixture, 'settings.gradle.kts'), 'rootProject.name = "fixture"\n');
    const install = run('node', [join(root, 'bin', 'install.mjs')], { cwd: fixture, input: '3\nn\n' });
    assert.equal(install.status, 0, install.stderr);
    for (const path of [
      '.claude/agents/planner.md',
      '.claude/agents/validator.md',
      '.claude/commands/execute-ticket.md',
      '.claude/hooks/guard-agent-boundaries.sh',
      '.claude/hooks/guard-agent-boundaries.mjs',
      '.claude/hooks/change-digest.sh',
      '.claude/hooks/check-finalization-gate.sh',
      '.claude/hooks/check-role-contract.sh',
      '.claude/hooks/inject-run-invariants.sh',
      '.claude/hooks/lib/change-manifest.mjs',
      '.claude/hooks/lib/role-contracts.mjs',
      '.claude/orchestration/handoff-contracts.md',
      '.claude/orchestration/validation-policy.md',
      '.claude/orchestration/pipeline-policy.json',
      '.claude/settings.json',
    ]) assert.ok(statSync(join(fixture, path)).isFile(), `missing ${path}`);
    assert.ok((statSync(join(fixture, '.claude/hooks/guard-agent-boundaries.sh')).mode & 0o111) !== 0);
    assert.throws(() => statSync(join(fixture, '.claude/settings.local.json')));

    const validate = run('bash', [join(fixture, '.claude/hooks/validate-orchestration.sh')], { cwd: fixture });
    assert.equal(validate.status, 0, validate.stderr);

    const planner = join(fixture, '.claude/agents/planner.md');
    writeFileSync(planner, 'sentinel\n');
    const reinstall = run('node', [join(root, 'bin', 'install.mjs')], { cwd: fixture, input: '3\nn\n' });
    assert.equal(reinstall.status, 0, reinstall.stderr);
    assert.equal(readFileSync(planner, 'utf8'), 'sentinel\n');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('orchestration policy validation rejects duplicate or invalid entries', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'kmp-policy-fixture-'));
  try {
    writeFileSync(join(fixture, 'settings.gradle.kts'), 'rootProject.name = "fixture"\n');
    assert.equal(run('node', [join(root, 'bin', 'install.mjs')], { cwd: fixture, input: '3\nn\n' }).status, 0);
    const policyPath = join(fixture, '.claude/orchestration/pipeline-policy.json');
    const policy = {
      schema_version: 1,
      updated_at: null,
      process_rules: [{ id: 'RULE-1', status: 'active' }],
      recurring_findings: [{ id: 'RULE-1', status: 'active' }],
      fix_strategies: [{ id: 'FIX-1', status: 'unknown' }],
    };
    writeFileSync(policyPath, JSON.stringify(policy));
    const result = run('bash', [join(fixture, '.claude/hooks/validate-orchestration.sh')], { cwd: fixture });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unique|invalid status/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('orchestration content is public-safe and architecture-neutral', () => {
  const relevant = [
    ...walk(join(root, 'agents')),
    ...walk(join(root, 'commands')),
    ...walk(join(root, 'hooks')),
    ...walk(join(root, 'orchestration')),
  ];
  const content = relevant.map((path) => readFileSync(path, 'utf8')).join('\n');

  for (const forbidden of ['/Users/', 'IdeaProjects/', 'Source/Github/', 'atlassian.net']) {
    assert.ok(!content.includes(forbidden), `found non-public path or host: ${forbidden}`);
  }
  for (const prefix of [['M', 'O', 'B', '-'].join(''), ['W', 'E', 'B', '-'].join('')]) {
    assert.doesNotMatch(content, new RegExp(`${prefix}\\d+`, 'i'));
  }
  for (const marker of (process.env.PRIVATE_MARKERS || '').split(',').map((value) => value.trim()).filter(Boolean)) {
    assert.ok(!content.toLowerCase().includes(marker.toLowerCase()), 'found externally supplied private marker');
  }

  assert.doesNotMatch(read('agents/validator.md'), /compileDebugKotlinAndroid|testDebugUnitTest|:shared:|feature\/\{name\}/);
  assert.doesNotMatch(read('agents/implementer.md'), /always constructor injection|Each module exposes a DI module|ViewModel \+ `StateFlow/);
  assert.match(read('agents/implementer.md'), /repository's actual architecture/);
  assert.match(read('agents/validator.md'), /Never assume directory names or fixed Android/);
});

test('review workflow is truly read-only', () => {
  const workflow = read('.github/workflows/claude-pr-review.yml');
  const permissionsLine = workflow.match(/additional_permissions:\s*"([^"]+)"/)?.[1] || '';
  assert.doesNotMatch(permissionsLine, /Write|Edit/);
  assert.match(workflow, /^on:\n\s+pull_request:/m, 'review must not run in a pull_request_target context');
  assert.match(workflow, /permissions:\n\s+contents: read/);
});

test('write-enabled fix workflow only responds to trusted commenters', () => {
  const workflow = read('.github/workflows/claude-pr-fix.yml');
  const condition = workflow.match(/if: \|\n([\s\S]*?)\n {4}steps:/)?.[1] || '';
  assert.match(condition, /github\.event\.comment\.author_association/);
  for (const association of ['OWNER', 'MEMBER', 'COLLABORATOR']) {
    assert.match(condition, new RegExp(association));
  }
  for (const association of ['CONTRIBUTOR', 'FIRST_TIME_CONTRIBUTOR', 'NONE']) {
    assert.doesNotMatch(condition, new RegExp(association));
  }
  assert.match(workflow, /^on:\n\s+issue_comment:/m, 'fix must not run in a pull_request_target context');
});
