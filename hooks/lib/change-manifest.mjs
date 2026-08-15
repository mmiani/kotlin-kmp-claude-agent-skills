// Canonical change manifest for one pipeline run.
//
// The manifest is derived only from Git, never from an agent report, so the
// finalization gate can prove that recorded evidence describes the tree that
// is actually about to be committed.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw new Error(`git ${args[0]} failed: ${result.error.message}`);
  return result;
}

function gitOrThrow(args, cwd) {
  const result = git(args, cwd);
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || '').trim()}`);
  }
  return result.stdout;
}

function splitNul(text) {
  return text.split('\0').filter((value) => value !== '');
}

export function repositoryRoot(cwd) {
  return gitOrThrow(['rev-parse', '--show-toplevel'], cwd).trim();
}

export function resolveCommit(ref, cwd) {
  const result = git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], cwd);
  if (result.status !== 0) throw new Error(`unknown commit: ${ref}`);
  return result.stdout.trim();
}

export function currentBranch(cwd) {
  return gitOrThrow(['branch', '--show-current'], cwd).trim();
}

export function headSha(cwd) {
  return gitOrThrow(['rev-parse', 'HEAD'], cwd).trim();
}

export function isAncestor(ancestor, descendant, cwd) {
  return git(['merge-base', '--is-ancestor', ancestor, descendant], cwd).status === 0;
}

// Content identity of the paths that exist in the working tree. Deleted paths
// contribute a fixed marker so a deletion still changes the digest.
function blobIds(paths, cwd) {
  const ids = new Map();
  const batch = 200;
  for (let index = 0; index < paths.length; index += batch) {
    const slice = paths.slice(index, index + batch);
    const output = gitOrThrow(['hash-object', '--', ...slice], cwd).trim();
    const lines = output === '' ? [] : output.split('\n');
    if (lines.length !== slice.length) throw new Error('git hash-object returned an unexpected number of ids');
    slice.forEach((path, offset) => ids.set(path, lines[offset].trim()));
  }
  return ids;
}

/**
 * Collect every change against an immutable base SHA: committed, staged,
 * unstaged, deleted, renamed, and untracked.
 *
 * @returns {{baseSha: string, headSha: string, branch: string, entries: object[], paths: string[], digest: string}}
 */
export function collectManifest(baseRef, cwd) {
  const root = repositoryRoot(cwd);
  const baseSha = resolveCommit(baseRef, root);

  const records = splitNul(gitOrThrow(['diff', '--name-status', '-M', '-z', baseSha], root));
  const entries = [];
  for (let index = 0; index < records.length; index += 1) {
    const status = records[index];
    if (/^[RC]/.test(status)) {
      entries.push({ status, path: records[index + 2], oldPath: records[index + 1] });
      index += 2;
    } else {
      entries.push({ status, path: records[index + 1], oldPath: null });
      index += 1;
    }
  }
  for (const path of splitNul(gitOrThrow(['ls-files', '--others', '--exclude-standard', '-z'], root))) {
    entries.push({ status: '??', path, oldPath: null });
  }

  const present = entries.filter((entry) => !entry.status.startsWith('D')).map((entry) => entry.path);
  const ids = blobIds([...new Set(present)], root);
  for (const entry of entries) {
    entry.blob = entry.status.startsWith('D') ? 'deleted' : ids.get(entry.path);
  }

  entries.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));

  const digest = createHash('sha256')
    .update(entries.map((entry) => `${entry.status}\t${entry.path}\t${entry.oldPath || ''}\t${entry.blob}`).join('\n'))
    .digest('hex');

  // A rename touches both paths, so both must appear in recorded evidence.
  const paths = new Set();
  for (const entry of entries) {
    paths.add(entry.path);
    if (entry.oldPath) paths.add(entry.oldPath);
  }

  return {
    root,
    baseSha,
    headSha: headSha(root),
    branch: currentBranch(root),
    entries,
    paths: [...paths].sort(),
    digest,
  };
}
