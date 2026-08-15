#!/usr/bin/env bash
# Emit the complete working-tree change manifest against an immutable base SHA.
# Includes committed, staged, unstaged, deleted, renamed, and untracked files.

set -euo pipefail

BASE=${1:-}
if [ -z "$BASE" ]; then
  echo "usage: $0 <base-sha>" >&2
  exit 2
fi

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
git rev-parse --verify "$BASE^{commit}" >/dev/null

git diff --name-status -M "$BASE"
git ls-files --others --exclude-standard | while IFS= read -r file; do
  printf '??\t%s\n' "$file"
done
