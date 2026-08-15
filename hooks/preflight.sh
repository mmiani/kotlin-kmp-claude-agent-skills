#!/usr/bin/env bash
# Read-only KMP environment and repository preflight.
# Usage: preflight.sh <remote-base-ref>

set -euo pipefail

BASE_REF=${1:-}
if [ -z "$BASE_REF" ]; then
  echo "usage: $0 <remote-base-ref>" >&2
  exit 2
fi

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

git rev-parse --verify "$BASE_REF^{commit}" >/dev/null
BASE_SHA=$(git rev-parse "$BASE_REF^{commit}")
BRANCH=$(git branch --show-current)

echo "repository_root=$ROOT"
echo "branch=$BRANCH"
echo "base_ref=$BASE_REF"
echo "base_sha=$BASE_SHA"

if [ -x ./gradlew ]; then echo "gradle_wrapper=available"; else echo "gradle_wrapper=missing"; fi
if java -version >/dev/null 2>&1; then echo "java=available"; else echo "java=missing"; fi
if command -v xcodebuild >/dev/null 2>&1; then echo "xcodebuild=available"; else echo "xcodebuild=missing"; fi
if command -v gh >/dev/null 2>&1; then echo "github_cli=available"; else echo "github_cli=missing"; fi
