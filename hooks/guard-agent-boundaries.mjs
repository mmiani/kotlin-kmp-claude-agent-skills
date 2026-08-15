#!/usr/bin/env node

// PreToolUse guard for the installed KMP ticket agents.
//
// Reads Claude Code hook JSON on stdin. Exit 0 allows the operation, exit 2
// blocks it with a reason on stderr. Unknown input fails closed.
//
// Two separate boundaries are enforced:
//   1. Credential and repository-internal paths are protected for every caller.
//   2. The five ticket roles additionally cannot modify the orchestration
//      control plane that constrains them, and can only run commands that
//      inspect or validate the repository — never commands that publish,
//      deploy, install, or execute code from outside the checkout.

import { readFileSync } from 'node:fs';

const READ_ONLY_ROLES = new Set(['kmp-ticket-planner', 'kmp-ticket-reviewer', 'kmp-ticket-validator']);
const WRITE_ROLES = new Set(['kmp-ticket-implementer', 'kmp-ticket-fixer']);
const KNOWN_ROLES = new Set([...READ_ONLY_ROLES, ...WRITE_ROLES]);
// Roles that may only inspect the build, never execute it.
const INSPECT_ONLY_ROLES = new Set(['kmp-ticket-planner', 'kmp-ticket-reviewer']);

function block(reason) {
  console.error(reason);
  process.exit(2);
}

function allow() {
  process.exit(0);
}

function normalize(value) {
  return String(value || '').replaceAll('\\', '/');
}

// Never writable, whoever asks.
function protectedPath(value) {
  const path = normalize(value);
  return /(^|\/)\.git(\/|$)/.test(path)
    || /(^|\/)\.env(?:\.|$)/i.test(path)
    || /(^|\/)(?:local\.properties|google-services\.json)$/i.test(path)
    || /\.(?:keystore|jks|p12|pfx|pem|key)$/i.test(path)
    || /(^|\/)(?:credentials?|signing|secrets?)(?:[._-]|\/|$)/i.test(path)
    || /(^|\/)pipeline-policy\.json$/i.test(path);
}

// The control plane a role must not rewrite to widen its own permissions.
function controlPlanePath(value) {
  const path = normalize(value);
  return /(^|\/)\.claude(\/|$)/.test(path)
    || /(^|\/)\.github\/workflows(\/|$)/.test(path)
    || /(^|\/)orchestration\/(?:handoff-contracts\.md|validation-policy\.md)$/.test(path)
    || /(^|\/)hooks\/(?:guard-agent-boundaries|check-finalization-gate|change-digest|collect-diff|validate-orchestration|preflight|finalize-summary)\.(?:sh|mjs)$/.test(path)
    || /(^|\/)hooks\/lib\/[^/]+\.mjs$/.test(path);
}

function tokenize(command) {
  const tokens = [];
  let current = '';
  let quote = null;
  let quoted = false;
  for (const char of command) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      quoted = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (current || quoted) tokens.push(current);
      current = '';
      quoted = false;
      continue;
    }
    current += char;
  }
  if (quote) return null;
  if (current || quoted) tokens.push(current);
  return tokens;
}

const optionName = (token) => token.split('=')[0];

// Short options accept an attached value (`-Ovim`), so a prefix match is
// required; long options are compared after stripping `=value`.
function hasDeniedOption(tokens, denied) {
  return tokens.some((token) => {
    if (!token.startsWith('-')) return false;
    if (denied.has(optionName(token))) return true;
    return [...denied].some((option) => /^-[A-Za-z]$/.test(option) && token.startsWith(option));
  });
}

// Options that write files, spawn helper processes, or relocate the build
// outside the checkout. Blocked even on otherwise read-only commands.
const GIT_DENIED_OPTIONS = new Set([
  '--output', '--ext-diff', '--exec', '--pager', '--open-files-in-pager', '-O',
  '--upload-pack', '--receive-pack', '--textconv', '--no-textconv-cache',
]);
const RIPGREP_DENIED_OPTIONS = new Set(['--pre', '--pre-glob', '--hostname-bin', '--generate']);
// Long forms only: `-o` means "only matching" for grep and ripgrep.
const GENERIC_DENIED_OPTIONS = new Set(['--output', '--output-file', '--output-dir']);
const GRADLE_DENIED_OPTIONS = new Set([
  '--init-script', '-I', '--gradle-user-home', '-g', '--include-build',
  '--project-cache-dir', '--project-dir', '-p', '--build-file', '-b', '--settings-file', '-c',
]);
const XCODEBUILD_DENIED_OPTIONS = new Set([
  '-exportArchive', '-exportOptionsPlist', '-exportPath', '-allowProvisioningUpdates',
  '-allowProvisioningDeviceRegistration', '-authenticationKeyPath', '-authenticationKeyID',
  '-authenticationKeyIssuerID',
]);

// Gradle options that consume the next token, so that token is not a task name.
const GRADLE_VALUE_OPTIONS = new Set([
  '--tests', '--console', '--max-workers', '--priority', '--exclude-task', '-x',
  '--warning-mode', '--include-build', '--project-cache-dir', '--write-locks',
]);

// Task or script name segments that mean "leave this machine" or "change what runs".
const DELIVERY_SEGMENTS = new Set([
  'publish', 'publishing', 'upload', 'deploy', 'deployment', 'distribute', 'distribution',
  'promote', 'push', 'sign', 'notarize', 'provision', 'install', 'wrapper', 'bootstrap',
  'artifactory', 'nexus', 'sonatype', 'bintray', 'jib', 'docker', 'firebase', 'crashlytics',
  'appcenter', 'fastlane', 'testflight', 'playstore', 'ghpages', 'release-please',
]);

const READ_ONLY_GRADLE_TASKS = new Set([
  'projects', 'tasks', 'properties', 'help', 'dependencies', 'dependencyinsight',
  'buildenvironment', 'javatoolchains', 'outgoingvariants', 'components', 'model',
  'kotlindslaccessorsreport', 'resolvableconfigurations',
]);

function segments(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+|\s+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}

const isDeliveryName = (name) => segments(name).some((part) => DELIVERY_SEGMENTS.has(part));

function gradleTasks(tokens) {
  const tasks = [];
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.startsWith('-')) {
      if (GRADLE_VALUE_OPTIONS.has(token)) index += 1;
      continue;
    }
    tasks.push(token);
  }
  return tasks;
}

function checkBash(role, command) {
  if (!command) block('empty command');
  if (/[\n\r;&|<>`]/.test(command)) {
    block('shell composition and redirection are outside this agent role');
  }
  // Reject variable and command expansion, which would hide the real command
  // from this check. An escaped `\$` stays available for source searches.
  if (/(?<!\\)\$[A-Za-z_{(]/.test(command)) {
    block('shell expansion is outside this agent role');
  }
  const tokens = tokenize(command);
  if (!tokens || tokens.length === 0) block('command could not be parsed safely');

  const program = tokens[0];
  const rest = tokens.slice(1);
  const inspectOnly = INSPECT_ONLY_ROLES.has(role);

  if (program === 'git') {
    const subcommand = rest.find((token) => !token.startsWith('-')) || '';
    const readSubcommands = new Set([
      'status', 'diff', 'show', 'log', 'blame', 'rev-parse', 'merge-base',
      'ls-files', 'ls-tree', 'grep', 'remote', 'branch', 'worktree',
    ]);
    if (rest[0] !== subcommand) block('git options before the subcommand are outside this agent role');
    if (!readSubcommands.has(subcommand)) block(`git ${subcommand || '<none>'} is outside the ${role} allowlist`);

    // These subcommands also mutate, so only their exact reporting form is
    // allowed. `git branch <name>` and `git worktree add` must never pass.
    const exact = { remote: ['remote', '-v'], branch: ['branch', '--show-current'], worktree: ['worktree', 'list'] };
    if (exact[subcommand] && rest.join(' ') !== exact[subcommand].join(' ')) {
      block(`only \`git ${exact[subcommand].join(' ')}\` is allowed`);
    }

    if (hasDeniedOption(tokens, GIT_DENIED_OPTIONS)) block('this git option can write files or run helper commands');
    // `git show <rev>:<path>` reads history, which must not become a way to
    // read a protected file that the write tools already refuse.
    if (rest.some((token) => token.includes(':') && protectedPath(token.slice(token.indexOf(':') + 1)))) {
      block('protected repository or credential path');
    }
    return allow();
  }

  if (['pwd', 'ls', 'rg', 'grep', 'head', 'tail', 'wc'].includes(program)) {
    if (hasDeniedOption(tokens, GENERIC_DENIED_OPTIONS)) block('redirecting output to a file is outside this agent role');
    if (program === 'rg' && hasDeniedOption(tokens, RIPGREP_DENIED_OPTIONS)) {
      block('this ripgrep option can run helper commands');
    }
    return allow();
  }

  if (['java -version', 'node --version', 'xcodebuild -version', 'swift --version'].includes(command.trim())) {
    return allow();
  }

  if (program === './gradlew' || program === 'gradle') {
    if (hasDeniedOption(tokens, GRADLE_DENIED_OPTIONS)) {
      block('this Gradle option can relocate the build or run an init script');
    }
    for (const token of tokens) {
      if (/^-D/.test(token) && /javaagent|agentlib|agentpath/i.test(token)) {
        block('injecting a JVM agent is outside this agent role');
      }
    }
    const tasks = gradleTasks(tokens);
    if (tasks.length === 0) block('a Gradle task is required');
    for (const task of tasks) {
      const name = task.split(':').filter(Boolean).pop() || task;
      if (isDeliveryName(name)) block(`Gradle task ${task} can publish, deploy, or install artifacts`);
      if (inspectOnly && !READ_ONLY_GRADLE_TASKS.has(name.toLowerCase())) {
        block(`${role} may only run read-only Gradle tasks`);
      }
    }
    return allow();
  }

  if (inspectOnly) block(`command is outside the ${role} allowlist`);

  if (['npm', 'pnpm', 'yarn'].includes(program)) {
    const [subcommand, script] = rest;
    if (subcommand === 'test') return allow();
    if (subcommand !== 'run') block(`${program} ${subcommand || '<none>'} is outside the ${role} allowlist`);
    if (!script || script.startsWith('-')) block('a script name is required');
    if (isDeliveryName(script)) block(`${program} script ${script} can publish or deploy`);
    return allow();
  }

  if (program === 'swift') {
    if (rest[0] !== 'test' && rest[0] !== 'build') block('only `swift test` and `swift build` are allowed');
    return allow();
  }

  if (program === 'xcodebuild') {
    if (hasDeniedOption(tokens, XCODEBUILD_DENIED_OPTIONS)) block('this xcodebuild option exports or provisions a build');
    const actions = rest.filter((token) => !token.startsWith('-'));
    for (const action of actions) {
      if (['archive', 'install', 'installsrc', 'installhdrs'].includes(action)) {
        block(`xcodebuild ${action} is outside the ${role} allowlist`);
      }
    }
    return allow();
  }

  block(`command is outside the ${role} allowlist`);
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  block('role guard received invalid hook JSON');
}

const role = String(input.agent_type || '');
const tool = String(input.tool_name || '');
const toolInput = input.tool_input || {};
const isWrite = tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit';

if (isWrite && protectedPath(toolInput.file_path)) block('protected repository or credential path');

if (!KNOWN_ROLES.has(role)) allow();

if (isWrite && controlPlanePath(toolInput.file_path)) {
  block('agents cannot modify the orchestration control plane; the orchestrator owns these files');
}

if (isWrite && READ_ONLY_ROLES.has(role)) block(`${role} is read-only`);

if (tool !== 'Bash') allow();

checkBash(role, String(toolInput.command || '').trim());
