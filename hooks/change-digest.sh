#!/usr/bin/env bash
# Canonical change digest for the working tree against an immutable base SHA.

set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$SCRIPT_DIR/change-digest.mjs" "$@"
