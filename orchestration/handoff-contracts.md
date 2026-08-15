# Orchestration handoff contracts

All role handoffs are JSON objects followed by an optional human summary. JSON is the authoritative portion. Reject malformed output, missing required evidence, unknown contract versions, or repository identity mismatches.

## Common envelope

Every role output contains:

```json
{
  "contract_version": 1,
  "role": "planner | implementer | validator | reviewer | fixer",
  "verdict": "role-specific verdict",
  "repository": {
    "worktree": "/absolute/path",
    "branch": "ticket branch",
    "base_ref": "remote target ref",
    "base_sha": "40-character SHA"
  }
}
```

The orchestrator verifies these fields before accepting any other claims, and a `SubagentStop` hook enforces the envelope independently: a role cannot finish while its contract is missing, carries the wrong role or an unknown verdict, names a branch, worktree, or base SHA that is not this checkout, or, for the validator and reviewer, omits the digest of the tree it judged or carries one that no longer matches. The role is handed the reasons and gets one attempt to correct itself.

## Orchestrator-to-role handoff

Pass only what the role needs:

```json
{
  "contract_version": 1,
  "run_id": "example-123-YYYYMMDDTHHMMSSZ-random",
  "ticket": {
    "id": "EXAMPLE-123",
    "type": "feature | bug | refactor | maintenance",
    "requirements": [],
    "acceptance_criteria": []
  },
  "framing": {
    "status": "confirmed",
    "problem": "...",
    "evidence": [],
    "accepted_assumptions": [],
    "unverified_contracts": []
  },
  "repository": {
    "worktree": "/absolute/path",
    "branch": "ticket branch",
    "target_branch": "default-or-integration-branch",
    "base_ref": "origin/default-or-integration-branch",
    "base_sha": "40-character SHA"
  },
  "approval": {"approved": false, "approved_at": null, "approved_scope_hash": null},
  "preflight": {
    "gradle_wrapper": "available | missing",
    "java": "available | missing",
    "configured_targets": [],
    "capabilities": [],
    "limitations": []
  },
  "active_policy": [],
  "prior_role_outputs": {}
}
```

Production-file writers require `approval.approved: true` and a scope hash matching the plan shown to the user.

## Actual diff manifest

The orchestrator and validator derive this independently from the immutable base SHA:

```json
{
  "base_sha": "40-character SHA",
  "head_sha": "40-character SHA or null before commit",
  "digest": "change digest from .claude/hooks/change-digest.sh",
  "files": [
    {
      "path": "relative/path",
      "status": "added | modified | deleted | renamed | untracked",
      "old_path": null,
      "module": ":discovered:module | null",
      "source_set": "commonMain | iosMain | custom | null",
      "consumers": []
    }
  ],
  "unmapped_files": [],
  "configured_targets": [],
  "required_targets": []
}
```

An unmapped production change is a validation gap, not permission to skip it.

The digest is derived only from Git: the status, path, rename source, and content id of every changed and untracked file. Any later edit changes it, so evidence produced before that edit is provably stale.

## Filtered reviewer-to-fixer handoff

Include only:

- common envelope and actual base SHA
- verified blocker and major findings
- code-caused validation gaps
- required outcomes
- exact-match active policy strategies
- approved plan constraints relevant to those findings

Exclude minor findings, strengths, passing files, full transcripts, and unrelated policy.

## Immutable run evidence

Store one JSON file per run under the Git common directory's `claude-pipeline-runs/`. A run file is append-free after finalization; corrections create a new event file referencing the original run.

```json
{
  "schema_version": 1,
  "run_id": "example-123-YYYYMMDDTHHMMSSZ-random",
  "status": "complete | blocked | failed",
  "ticket_id": "EXAMPLE-123",
  "repository": {
    "remote": "sanitized remote name",
    "worktree": "local path",
    "branch": "ticket branch",
    "target_branch": "target branch",
    "base_sha": "full SHA",
    "head_sha": "full SHA at gate time",
    "final_sha": "full SHA or null"
  },
  "agents": [{"role": "planner", "agent_type": "kmp-ticket-planner", "agent_id": "optional"}],
  "phases": [],
  "diff": {"digest": "change digest", "files": [{"path": "relative/path"}]},
  "validation": {"verdict": "PASS | non-pass", "digest": "change digest at verdict time", "checks": [], "coverage_gaps": []},
  "review": {"iterations": 0, "verdict": "APPROVE | non-approve", "digest": "change digest at verdict time", "unresolved": []},
  "approvals": [],
  "residual_risks": [],
  "delivery": {"push": "complete | failed | not_attempted", "pr_url": null, "tracker_sync": "complete | failed | not_configured"},
  "learning_candidates": []
}
```

Do not put ticket descriptions, source code, credentials, private URLs, customer data, or raw agent transcripts in reusable policy or aggregate metrics.
