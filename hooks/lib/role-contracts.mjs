// Machine-checkable definition of what each role must return.
//
// The pipeline's rule is that no agent claim is taken on trust. Until now the
// envelope itself was checked by prose in the orchestrator prompt; this module
// makes it a check that runs whether or not the orchestrator remembers to look.

import { realpathSync } from 'node:fs';

import { collectManifest, currentBranch, repositoryRoot, resolveCommit } from './change-manifest.mjs';

// Git reports a fully resolved path while an agent may report the symlinked one
// it was handed, so both sides are resolved before comparison.
function samePath(left, right) {
  const resolve = (value) => {
    try {
      return realpathSync(String(value));
    } catch {
      return String(value).replace(/\/+$/, '');
    }
  };
  return resolve(left) === resolve(right);
}

export const ROLE_CONTRACTS = {
  'kmp-ticket-planner': {
    role: 'planner',
    verdicts: ['READY', 'BLOCKED'],
    requiresDigest: false,
  },
  'kmp-ticket-implementer': {
    role: 'implementer',
    verdicts: ['COMPLETE', 'DEVIATION_REQUIRES_APPROVAL', 'BLOCKED'],
    requiresDigest: false,
  },
  'kmp-ticket-validator': {
    role: 'validator',
    verdicts: ['PASS', 'FAIL', 'BLOCKED', 'BLOCKED_ENV', 'BLOCKED_CONFIG'],
    requiresDigest: true,
  },
  'kmp-ticket-reviewer': {
    role: 'reviewer',
    verdicts: ['APPROVE', 'REQUEST_CHANGES', 'BLOCK'],
    requiresDigest: true,
  },
  'kmp-ticket-fixer': {
    role: 'fixer',
    verdicts: ['COMPLETE', 'APPROVAL_REQUIRED', 'BLOCKED'],
    requiresDigest: false,
  },
};

/**
 * Pull the authoritative JSON object out of a role's final message. Roles are
 * asked for JSON followed by a human summary, so a fenced block wins and a bare
 * object is accepted as a fallback.
 */
export function extractContract(message) {
  const text = String(message || '');
  const fenced = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  const candidates = [];
  if (fenced) candidates.push(fenced[1]);

  const start = text.indexOf('{');
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) { candidates.push(text.slice(start, index + 1)); break; }
      }
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

/**
 * Validate one role's contract against its definition and the live repository.
 *
 * @returns {string[]} reasons the contract is unacceptable; empty means valid.
 */
export function validateContract(agentType, message, cwd) {
  const expected = ROLE_CONTRACTS[agentType];
  if (!expected) return [];

  const contract = extractContract(message);
  if (!contract) return [`${expected.role} did not return its required JSON contract`];

  const reasons = [];
  if (contract.contract_version !== 1) reasons.push('contract_version must be 1');
  if (contract.role !== expected.role) reasons.push(`role must be "${expected.role}"`);
  if (!expected.verdicts.includes(contract.verdict)) {
    reasons.push(`verdict must be one of ${expected.verdicts.join(' | ')}`);
  }

  const repository = contract.repository || {};
  if (!/^[0-9a-f]{40}$/i.test(repository.base_sha || '')) {
    reasons.push('repository.base_sha must be a full 40-character SHA');
  }

  // Identity is checked against the actual checkout, not just for well-formedness.
  let root = null;
  try {
    root = repositoryRoot(cwd);
    const branch = currentBranch(root);
    if (repository.branch && branch && repository.branch !== branch) {
      reasons.push(`repository.branch ${repository.branch} does not match the checked out ${branch}`);
    }
    if (!repository.branch) reasons.push('repository.branch is required');
    if (repository.worktree && !samePath(repository.worktree, root)) {
      reasons.push(`repository.worktree ${repository.worktree} is not this checkout`);
    }
    if (/^[0-9a-f]{40}$/i.test(repository.base_sha || '')) {
      try {
        resolveCommit(repository.base_sha, root);
      } catch {
        reasons.push('repository.base_sha does not exist in this repository');
      }
    }
  } catch (error) {
    reasons.push(`repository identity could not be verified: ${error.message}`);
  }

  // Verdicts that gate delivery must name the tree they were produced against.
  if (expected.requiresDigest) {
    if (!/^[0-9a-f]{64}$/i.test(contract.digest || '')) {
      reasons.push('digest must be the change digest supplied for the reviewed tree');
    } else if (root && /^[0-9a-f]{40}$/i.test(repository.base_sha || '')) {
      try {
        const manifest = collectManifest(repository.base_sha, root);
        if (manifest.digest !== contract.digest) {
          reasons.push('digest does not match the current working tree, so this verdict describes a different change');
        }
      } catch {
        // Identity problems are already reported above.
      }
    }
  }

  return reasons;
}
