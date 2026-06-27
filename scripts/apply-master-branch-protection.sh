#!/usr/bin/env bash
# Apply branch protection on master: PRs required + CI check required.
# Run once after the CI workflow is merged (needs the "CI" check to exist).
# Requires: gh CLI, repo admin access.
# Note: private repos on GitHub Free need Pro or public visibility (HTTP 403 otherwise).

set -euo pipefail

REPO="${GITHUB_REPO:-karantyagi/VehicleOS}"
BRANCH="${1:-master}"

echo "Applying branch protection to ${REPO}@${BRANCH}..."

gh api \
  --method PUT \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      { "context": "CI", "app_id": null }
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": false
}
EOF

echo "Done. Direct pushes to ${BRANCH} are blocked; merges require PR + passing CI."
