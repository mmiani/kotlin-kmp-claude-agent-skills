#!/usr/bin/env bash
# Fail-closed machine gate before commit, push, and PR creation.

set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$SCRIPT_DIR/check-finalization-gate.mjs" "$@"
