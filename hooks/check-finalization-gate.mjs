#!/usr/bin/env node

// Fail-closed machine gate before commit, push, and PR creation.
//
// Recorded verdicts are never trusted on their own. Every claim is bound to the
// tree that is about to be delivered: the gate recomputes the change manifest
// from Git and rejects evidence that describes a different or earlier state.

import { readFileSync } from 'node:fs';
import { collectManifest, isAncestor } from './lib/change-manifest.mjs';

const evidencePath = process.argv[2];
if (!evidencePath) {
  console.error('usage: check-finalization-gate.mjs <run-evidence.json>');
  process.exit(2);
}

const cwd = process.argv[3] || process.cwd();

let evidence;
try {
  evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
} catch (error) {
  console.error(`FINALIZATION_GATE=BLOCKED invalid evidence: ${error.message}`);
  process.exit(1);
}

const reasons = [];
const recorded = evidence.repository || {};
const recordedBase = String(recorded.base_sha || '');

let manifest = null;
if (!/^[0-9a-f]{40}$/i.test(recordedBase)) {
  reasons.push('missing immutable base SHA');
} else {
  try {
    manifest = collectManifest(recordedBase, cwd);
  } catch (error) {
    reasons.push(`recorded base SHA is not usable in this repository: ${error.message}`);
  }
}

if (manifest) {
  // Identity: the evidence must describe this checkout, not an earlier or foreign one.
  if (!isAncestor(manifest.baseSha, manifest.headSha, manifest.root)) {
    reasons.push('recorded base SHA is not an ancestor of HEAD');
  }
  if (!manifest.branch) {
    reasons.push('finalization requires a named branch, not a detached HEAD');
  } else if (recorded.branch && recorded.branch !== manifest.branch) {
    reasons.push(`evidence branch ${recorded.branch} does not match checked out ${manifest.branch}`);
  } else if (!recorded.branch) {
    reasons.push('evidence does not record the delivery branch');
  }
  if (!recorded.head_sha) {
    reasons.push('evidence does not record HEAD');
  } else if (recorded.head_sha !== manifest.headSha) {
    reasons.push('evidence HEAD does not match the current HEAD');
  }

  // Content: the recorded diff must be the actual diff.
  const recordedPaths = Array.isArray(evidence.diff?.files)
    ? evidence.diff.files.map((file) => (typeof file === 'string' ? file : file?.path)).filter(Boolean)
    : null;
  if (!recordedPaths || recordedPaths.length === 0) {
    reasons.push('actual diff is empty or missing');
  } else if (manifest.paths.length === 0) {
    reasons.push('working tree has no change against the recorded base SHA');
  } else {
    const actual = new Set(manifest.paths);
    const claimed = new Set(recordedPaths);
    const fabricated = [...claimed].filter((path) => !actual.has(path));
    const omitted = [...actual].filter((path) => !claimed.has(path));
    for (const path of fabricated) reasons.push(`evidence claims an unchanged path: ${path}`);
    for (const path of omitted) reasons.push(`actual change is missing from evidence: ${path}`);
  }

  // Freshness: verdicts must have been produced against this exact tree.
  if (evidence.diff?.digest !== manifest.digest) {
    reasons.push('recorded diff digest does not match the current working tree');
  }
  if (evidence.validation?.digest !== manifest.digest) {
    reasons.push('validation evidence is stale for the current working tree');
  }
  if (evidence.review?.digest !== manifest.digest) {
    reasons.push('review evidence is stale for the current working tree');
  }
}

if (evidence.validation?.verdict !== 'PASS') reasons.push('validator verdict is not PASS');
if ((evidence.validation?.coverage_gaps || []).length > 0) reasons.push('validation coverage gaps remain');
if (evidence.review?.verdict !== 'APPROVE') reasons.push('reviewer verdict is not APPROVE');
if (!Number.isInteger(evidence.review?.iterations) || evidence.review.iterations < 1) reasons.push('review iteration evidence is missing');
if ((evidence.review?.unresolved || []).length > 0) reasons.push('review findings remain unresolved');
for (const risk of evidence.residual_risks || []) {
  if (risk.approved !== true) reasons.push(`residual risk lacks approval: ${risk.id || 'unnamed'}`);
}

if (reasons.length) {
  for (const reason of reasons) console.error(`FINALIZATION_GATE=BLOCKED ${reason}`);
  process.exit(1);
}

console.log(`FINALIZATION_GATE=PASS change_digest=${manifest.digest}`);
