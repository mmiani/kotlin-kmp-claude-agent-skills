#!/usr/bin/env node

// Print the canonical change digest for the current working tree against an
// immutable base SHA. Validator and reviewer verdicts are recorded together
// with this digest, so evidence produced before a later edit is detectable.

import { collectManifest } from './lib/change-manifest.mjs';

const base = process.argv[2];
if (!base) {
  console.error('usage: change-digest.mjs <base-sha>');
  process.exit(2);
}

try {
  const manifest = collectManifest(base, process.cwd());
  console.log(`base_sha=${manifest.baseSha}`);
  console.log(`head_sha=${manifest.headSha}`);
  console.log(`branch=${manifest.branch}`);
  console.log(`change_digest=${manifest.digest}`);
  console.log(`changed_paths=${manifest.paths.length}`);
  for (const path of manifest.paths) console.log(`path\t${path}`);
} catch (error) {
  console.error(`change digest failed: ${error.message}`);
  process.exit(1);
}
