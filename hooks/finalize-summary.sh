#!/usr/bin/env bash
# Read-only finalization summary against the exact approved base.
# Usage: finalize-summary.sh <base-ref-or-sha>

set -euo pipefail

BASE=${1:-}
if [ -z "$BASE" ]; then
  echo "usage: $0 <base-ref-or-sha>" >&2
  exit 2
fi

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
git rev-parse --verify "$BASE^{commit}" >/dev/null

BRANCH=$(git branch --show-current)
BASE_SHA=$(git rev-parse "$BASE^{commit}")

echo "FINALIZATION SUMMARY"
echo "repository_root=$ROOT"
echo "branch=$BRANCH"
echo "base=$BASE"
echo "base_sha=$BASE_SHA"
echo "head_sha=$(git rev-parse HEAD)"
echo
echo "Commits against approved base"
git log --oneline "$BASE_SHA..HEAD"
echo
echo "Files against approved base, including working tree"
git diff --stat "$BASE_SHA"
echo
echo "Working tree"
git status --short
