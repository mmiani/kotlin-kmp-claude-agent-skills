#!/usr/bin/env node

// SubagentStop guard: a ticket role may not finish on a malformed, mismatched,
// or stale contract.
//
// Exit 2 keeps the subagent running and hands it the reasons, so it corrects
// its own output instead of the orchestrator discovering the problem later.
// `stop_hook_active` bounds this to one correction attempt per stop.

import { readFileSync } from 'node:fs';
import { ROLE_CONTRACTS, validateContract } from './lib/role-contracts.mjs';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  // A guard that cannot read its input must not strand the pipeline.
  process.exit(0);
}

const agentType = String(input.agent_type || '');
if (!ROLE_CONTRACTS[agentType]) process.exit(0);
if (input.stop_hook_active === true) process.exit(0);

const reasons = validateContract(agentType, input.last_assistant_message, input.cwd || process.cwd());
if (reasons.length === 0) process.exit(0);

console.error(`${agentType} returned an unacceptable role contract:`);
for (const reason of reasons) console.error(`- ${reason}`);
console.error('Return the JSON contract defined in .claude/orchestration/handoff-contracts.md, with values read from this checkout. Do not restate a verdict without correcting the contract.');
process.exit(2);
