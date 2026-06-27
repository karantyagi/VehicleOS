# Maintainer guide — private repo, CI, badges, protection

For **repo owner** (you). README badges are static while the repo is private; use this guide for real status and showcase prep.

## Current repo visibility

```bash
gh api repos/karantyagi/VehicleOS --jq '{private, visibility}'
```

While **private**:

| What | Where you see real status |
|------|---------------------------|
| **CI pass/fail** | `./scripts/ci-status.sh` or [Actions tab](https://github.com/karantyagi/VehicleOS/actions/workflows/pr-frontend-build.yml) (logged in) |
| **PR checks** | PR merge box → **CI** check |
| **README CI badge** | Static link only — not live pass/fail |

```bash
chmod +x scripts/ci-status.sh
./scripts/ci-status.sh          # latest on master
./scripts/ci-status.sh my-branch  # latest on a branch
```

---

## Showcase readiness checklist

Work through when preparing resume / public launch.

### 1. CI (done — use script to verify anytime)

- [x] GitHub Actions workflow on PRs + `master`
- [ ] Run `./scripts/ci-status.sh` after merges to confirm green

### 2. Branch protection on `master`

```bash
./scripts/apply-master-branch-protection.sh
```

**Requires GitHub Pro or a public repository** on the free plan. If the script returns HTTP 403, either:

- **Make the repo public** (recommended for showcase), then re-run the script, or
- **Upgrade to GitHub Pro**, or
- Rely on **PR-only discipline** + Cursor rules until public (no hard block on direct push)

Until protection is applied, still use feature branches + PRs — protection is enforcement, not the workflow itself.

### 3. “Real” README badges (when public)

After `Settings → General → Change visibility → Public`, update `README.md`:

```markdown
[![CI](https://github.com/karantyagi/VehicleOS/actions/workflows/pr-frontend-build.yml/badge.svg?branch=master)](https://github.com/karantyagi/VehicleOS/actions/workflows/pr-frontend-build.yml)
[![License: MIT](https://img.shields.io/github/license/karantyagi/VehicleOS)](./LICENSE)
```

Website badge — only after Vercel + domain:

```markdown
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fvehicleos.app&label=vehicleos.app)](https://vehicleos.app)
```

### 4. Vercel CD (you set up)

Follow [`docs/deployment/vercel-setup.md`](../deployment/vercel-setup.md):

- [ ] Vercel project: `apps/marketing` → `vehicleos.app`
- [ ] Vercel project: `apps/web` → `app.vehicleos.app`
- [ ] Confirm PR preview comment on next feature PR
- [ ] Swap website README badge to uptime shield (step 3)

### 5. GitHub repo polish (optional)

- [ ] About → Website: `https://vehicleos.app`
- [ ] Topics: `nextjs`, `monorepo`, `ai-native`, `typescript`

---

## Quick reference

| Goal | Command / link |
|------|----------------|
| My CI status now | `./scripts/ci-status.sh` |
| Last PR checks | `gh pr checks` (on open PR) |
| Lock `master` | `./scripts/apply-master-branch-protection.sh` (public or Pro) |
| Vercel setup | `docs/deployment/vercel-setup.md` |
