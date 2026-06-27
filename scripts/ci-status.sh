#!/usr/bin/env bash
# Show live CI status for maintainers (private repos can't use README workflow badges).
# Requires: gh CLI authenticated (gh auth login)
set -euo pipefail

REPO="${GITHUB_REPO:-karantyagi/VehicleOS}"
WORKFLOW="${CI_WORKFLOW:-pr-frontend-build.yml}"
BRANCH="${1:-master}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install: https://cli.github.com/"
  exit 1
fi

VISIBILITY="$(gh api "repos/${REPO}" --jq '.private' 2>/dev/null || echo "unknown")"
if [[ "${VISIBILITY}" == "true" ]]; then
  echo "ℹ️  ${REPO} is private — README uses static CI badge. This script shows real status."
elif [[ "${VISIBILITY}" == "false" ]]; then
  echo "ℹ️  ${REPO} is public — README can use dynamic CI badge (see docs/maintainer/showcase-readiness.md)."
fi
echo ""

echo "Latest CI runs (workflow: ${WORKFLOW}):"
gh run list --repo "${REPO}" --workflow "${WORKFLOW}" --limit 8

echo ""
echo "Latest on branch ${BRANCH}:"
gh run list --repo "${REPO}" --workflow "${WORKFLOW}" --branch "${BRANCH}" --limit 1 \
  --json status,conclusion,displayTitle,url,createdAt,event \
  --jq '.[] | "  \(.conclusion // .status)  \(.event)  \(.displayTitle)\n  \(.url)\n  \(.createdAt)"'

echo ""
echo "Open Actions: https://github.com/${REPO}/actions/workflows/${WORKFLOW}"
