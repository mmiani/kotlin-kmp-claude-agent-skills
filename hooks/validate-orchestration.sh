#!/usr/bin/env bash
# Validate either this package source tree or an installed .claude orchestration.

set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$SCRIPT_DIR/validate-orchestration.mjs" "$@"
