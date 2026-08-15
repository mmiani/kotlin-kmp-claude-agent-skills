#!/usr/bin/env bash
# PreToolUse guard for the installed KMP ticket agents.
# Reads Claude Code hook JSON on stdin and exits 2 to block an operation.

set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$SCRIPT_DIR/guard-agent-boundaries.mjs" "$@"
