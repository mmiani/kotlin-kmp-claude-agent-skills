#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, chmodSync, readdirSync, statSync, readFileSync } from 'fs';
import { resolve, join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = resolve(__dirname, '..');
const PROJECT_ROOT = process.cwd();

let inputLines = [];
let inputIndex = 0;

if (!process.stdin.isTTY) {
  // When piped, read all input upfront
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  inputLines = Buffer.concat(chunks).toString().split('\n');
}

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
const ask = (q) => {
  if (inputLines.length > 0) {
    const answer = inputLines[inputIndex++] || '';
    process.stdout.write(q + answer + '\n');
    return Promise.resolve(answer);
  }
  return new Promise((res) => rl.question(q, res));
};

const COMPONENTS = {
  skills: {
    src: 'skills',
    dest: '.claude/skills',
    label: 'Skills (14 KMP agent skills)',
  },
  agents: {
    src: 'agents',
    dest: '.claude/agents',
    label: 'Agents (planner, implementer, validator, reviewer, fixer)',
  },
  commands: {
    src: 'commands',
    dest: '.claude/commands',
    label: 'Commands (execute-ticket pipeline)',
  },
  hooks: {
    src: 'hooks',
    dest: '.claude/hooks',
    label: 'Hooks (compile, detekt, tests, finalize)',
  },
  settings: {
    src: null, // handled specially
    dest: '.claude',
    label: 'Settings (permissions + hook config)',
  },
  workflows: {
    src: '.github/workflows',
    dest: '.github/workflows',
    label: 'GitHub Actions (PR review + PR fix)',
  },
};

function countFiles(dir) {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) count += countFiles(join(dir, entry.name));
    else count++;
  }
  return count;
}

function copyDir(src, dest, overwrite = false) {
  let copied = 0;
  let skipped = 0;
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      const result = copyDir(srcPath, destPath, overwrite);
      copied += result.copied;
      skipped += result.skipped;
    } else {
      if (existsSync(destPath) && !overwrite) {
        skipped++;
      } else {
        cpSync(srcPath, destPath);
        copied++;
      }
    }
  }
  return { copied, skipped };
}

function makeExecutable(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry.endsWith('.sh')) {
      chmodSync(join(dir, entry), 0o755);
    }
  }
}

async function main() {
  console.log('');
  console.log('  Kotlin KMP Agent Skills — Installer');
  console.log('  ====================================');
  console.log('');
  console.log(`  Target: ${PROJECT_ROOT}`);
  console.log('');

  // Check we're in a project root (has .git or build.gradle.kts or settings.gradle.kts)
  const markers = ['.git', 'build.gradle.kts', 'settings.gradle.kts', 'build.gradle', 'package.json'];
  const isProject = markers.some((m) => existsSync(join(PROJECT_ROOT, m)));
  if (!isProject) {
    console.log('  ⚠  No project root detected (no .git, build.gradle.kts, etc.)');
    const proceed = await ask('  Continue anyway? [y/N] ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('  Aborted.');
      rl.close();
      process.exit(0);
    }
    console.log('');
  }

  // Choose what to install
  console.log('  What would you like to install?\n');
  console.log('  1) Everything (skills + orchestration + workflows)');
  console.log('  2) Skills only');
  console.log('  3) Orchestration only (agents + commands + hooks + settings)');
  console.log('  4) Pick components individually');
  console.log('');

  const choice = await ask('  Choice [1]: ');
  const mode = choice.trim() || '1';

  let selected = {};

  if (mode === '1') {
    selected = { skills: true, agents: true, commands: true, hooks: true, settings: true, workflows: true };
  } else if (mode === '2') {
    selected = { skills: true };
  } else if (mode === '3') {
    selected = { agents: true, commands: true, hooks: true, settings: true };
  } else if (mode === '4') {
    console.log('');
    for (const [key, comp] of Object.entries(COMPONENTS)) {
      const answer = await ask(`  Install ${comp.label}? [Y/n] `);
      selected[key] = answer.trim().toLowerCase() !== 'n';
    }
  } else {
    console.log('  Invalid choice. Aborted.');
    rl.close();
    process.exit(1);
  }

  // Ask about overwriting
  console.log('');
  const overwriteAnswer = await ask('  Overwrite existing files? [y/N] ');
  const overwrite = overwriteAnswer.trim().toLowerCase() === 'y';

  console.log('');
  console.log('  Installing...');
  console.log('');

  let totalCopied = 0;
  let totalSkipped = 0;

  for (const [key, comp] of Object.entries(COMPONENTS)) {
    if (!selected[key]) continue;

    if (key === 'settings') {
      // Copy settings files individually
      const dest = join(PROJECT_ROOT, comp.dest);
      mkdirSync(dest, { recursive: true });
      for (const file of ['settings.json', 'settings.local.json']) {
        const srcPath = join(PKG_ROOT, file);
        const destPath = join(dest, file);
        if (existsSync(destPath) && !overwrite) {
          console.log(`    SKIP ${join(comp.dest, file)} (exists)`);
          totalSkipped++;
        } else {
          cpSync(srcPath, destPath);
          console.log(`    ✓ ${join(comp.dest, file)}`);
          totalCopied++;
        }
      }
      continue;
    }

    const srcDir = join(PKG_ROOT, comp.src);
    const destDir = join(PROJECT_ROOT, comp.dest);

    if (!existsSync(srcDir)) {
      console.log(`    SKIP ${comp.label} (source not found)`);
      continue;
    }

    const result = copyDir(srcDir, destDir, overwrite);
    totalCopied += result.copied;
    totalSkipped += result.skipped;

    if (result.copied > 0) {
      console.log(`    ✓ ${comp.dest}/ (${result.copied} files)`);
    }
    if (result.skipped > 0) {
      console.log(`    SKIP ${comp.dest}/ (${result.skipped} files exist)`);
    }
  }

  // Make hooks executable
  if (selected.hooks) {
    makeExecutable(join(PROJECT_ROOT, '.claude/hooks'));
  }

  console.log('');
  console.log(`  Done: ${totalCopied} files copied, ${totalSkipped} skipped.`);

  if (selected.workflows) {
    console.log('');
    console.log('  → Add ANTHROPIC_API_KEY to your repo secrets for GitHub Actions.');
  }

  if (selected.hooks) {
    console.log('  → Hook scripts in .claude/hooks/ are executable.');
    console.log('  → Edit the module-path patterns in validate-compile.sh / validate-detekt.sh');
    console.log('    to match your project\'s module structure.');
  }

  console.log('');
  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
