#!/usr/bin/env bash
# Attach re-derived run invariants to lifecycle commands. Never blocks.

set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$SCRIPT_DIR/inject-run-invariants.mjs" "$@"
