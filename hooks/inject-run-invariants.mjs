#!/usr/bin/env node

// Re-state the run's invariants immediately before a lifecycle command.
//
// A ticket run is long enough to be compacted, and the orchestrator holds the
// base SHA, branch, and change digest in context. Compaction can summarise them
// away silently. `PostCompact` cannot inject context back, so instead the facts
// are re-derived from Git and the run evidence file and attached to the tool
// call that would act on them.
//
// This hook never blocks. It only adds context, and stays silent when it has
// nothing verifiable to say.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { collectManifest, currentBranch, git, headSha, repositoryRoot } from './lib/change-manifest.mjs';

const LIFECYCLE = /^\s*(?:git\s+(?:commit|push|add)\b|gh\s+pr\s+create\b)/;

function emit(context) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: context,
    },
  }));
  process.exit(0);
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

if (input.tool_name !== 'Bash') process.exit(0);
if (!LIFECYCLE.test(String(input.tool_input?.command || ''))) process.exit(0);

const cwd = input.cwd || process.cwd();

try {
  const root = repositoryRoot(cwd);
  const branch = currentBranch(root);
  const head = headSha(root);

  const lines = [
    'Run invariants, re-derived from Git for this lifecycle command:',
    `repository_root=${root}`,
    `branch=${branch || '(detached HEAD)'}`,
    `head_sha=${head}`,
  ];

  // The evidence file is the run's durable memory; prefer it over recall.
  const commonDir = git(['rev-parse', '--git-common-dir'], root).stdout.trim();
  const runsDir = commonDir ? join(root, commonDir, 'claude-pipeline-runs') : '';
  let evidence = null;
  if (runsDir && existsSync(runsDir)) {
    const candidates = readdirSync(runsDir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => join(runsDir, name))
      .map((path) => {
        try {
          const parsed = JSON.parse(readFileSync(path, 'utf8'));
          return { path, parsed, mtime: statSync(path).mtimeMs };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((entry) => !entry.parsed.repository?.branch || entry.parsed.repository.branch === branch)
      .sort((left, right) => right.mtime - left.mtime);
    evidence = candidates[0] || null;
  }

  if (evidence) {
    const repository = evidence.parsed.repository || {};
    lines.push(`run_evidence=${evidence.path}`);
    if (evidence.parsed.run_id) lines.push(`run_id=${evidence.parsed.run_id}`);
    if (evidence.parsed.status) lines.push(`recorded_status=${evidence.parsed.status}`);
    if (repository.base_sha) lines.push(`recorded_base_sha=${repository.base_sha}`);
    if (repository.target_branch) lines.push(`target_branch=${repository.target_branch}`);
    lines.push(`recorded_validation=${evidence.parsed.validation?.verdict || 'none'}`);
    lines.push(`recorded_review=${evidence.parsed.review?.verdict || 'none'}`);

    if (/^[0-9a-f]{40}$/i.test(repository.base_sha || '')) {
      try {
        const manifest = collectManifest(repository.base_sha, root);
        lines.push(`live_change_digest=${manifest.digest}`);
        lines.push(`live_changed_paths=${manifest.paths.length}`);
        if (evidence.parsed.diff?.digest && evidence.parsed.diff.digest !== manifest.digest) {
          lines.push('WARNING: recorded evidence is stale for this tree. Re-run the affected gates before finalizing.');
        }
      } catch {
        lines.push('WARNING: the recorded base SHA could not be resolved in this checkout.');
      }
    }
  } else {
    lines.push('run_evidence=none found for this branch');
  }

  lines.push('Finalization still requires .claude/hooks/check-finalization-gate.sh to emit FINALIZATION_GATE=PASS.');
  emit(lines.join('\n'));
} catch {
  process.exit(0);
}
