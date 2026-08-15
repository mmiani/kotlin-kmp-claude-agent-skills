#!/usr/bin/env bash
# SubagentStop guard for the installed KMP ticket roles.

set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$SCRIPT_DIR/check-role-contract.mjs" "$@"
