# Contributing to VehicleOS

Thank you for contributing. This repo uses a consistent feature-branch workflow so human and AI-assisted work stay aligned.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) 9.12.3 (see `packageManager` in root `package.json`)
- [GitHub CLI (`gh`)](https://cli.github.com/) — authenticated (`gh auth login`)

## Default branch

**`master`** is the integration branch. Do not use `main` unless remotes are explicitly updated.

**`master` is protected.** All changes must land via pull request. Do not push directly to `master` (including from Cursor or local CLI). After this repo’s CI workflow is merged, run once (repo admin):

```bash
chmod +x scripts/apply-master-branch-protection.sh
./scripts/apply-master-branch-protection.sh
```

That enforces: PR required + **CI** check must pass before merge.

### README badges

| Badge | Type | Notes |
|-------|------|-------|
| **CI** | Dynamic | GitHub Actions workflow status on `master` |
| **Website** | Dynamic | shields.io uptime for [vehicleos.app](https://vehicleos.app) |

License is shown via the GitHub **MIT license** tab and [`LICENSE`](./LICENSE) — no README badge needed.

## Starting a new feature

Always sync `master` before creating a branch:

```bash
git fetch origin
git checkout master
git pull origin master
git checkout -b <type>/<area>-<short-name>
```

### Branch naming

| Prefix | Use for |
|--------|---------|
| `feature/` | New product or user-facing capability |
| `chore/` | Tooling, CI, repo standards, refactors |
| `docs/` | Documentation-only changes |
| `fix/` | Bug fixes |

**Pattern:** `<type>/<area>-<short-name>`

Examples:

- `feature/apps-marketing-landing`
- `feature/api-receipt-upload`
- `chore/dev-workflow-repo-standards`
- `docs/adr-lakehouse-v2`

## Development

```bash
pnpm install
pnpm dev                    # all apps (parallel)
pnpm --filter @vehicleos/marketing dev   # http://localhost:3001
pnpm --filter @vehicleos/web dev         # http://localhost:3000
```

### Pre-PR verification

Run builds for apps you changed:

```bash
pnpm --filter @vehicleos/marketing build
pnpm --filter @vehicleos/web build
```

CI runs the same checks on pull requests to `master`. The required check name is **CI**.

### CD (Vercel preview + production)

Preview deploys and PR comment links come from the [Vercel GitHub integration](docs/deployment/vercel-setup.md) — not from GitHub Actions. Connect two Vercel projects (`apps/marketing`, `apps/web`) once; every PR gets preview URL(s).

## Commits

- Use imperative, concise subjects: `Add Phase A marketing site`
- Body: 1–3 sentences on **why**, not a file list
- One logical change per commit when possible
- Never commit: `.env`, secrets, `node_modules/`, `.next/`, build artifacts

## Pull requests

1. Push your branch: `git push -u origin <branch>`
2. Open PR against **`master`**:

   ```bash
   gh pr create --base master --title "..." --body-file .github/pull_request_template.md
   ```

   Or use the GitHub UI — the PR template auto-fills.

3. Ensure **CI** passes and Vercel preview deploys (after Vercel is connected)
4. Request review; merge via GitHub (squash merge preferred for feature PRs)

### PR scope

- **One feature per PR** — avoid mixing unrelated areas (e.g. marketing + lakehouse docs)
- Branch from latest `master`, not from another open feature branch
- If `master` moves while your PR is open: `git fetch origin && git rebase origin/master`

### Parallel features

| Scenario | Action |
|----------|--------|
| Different apps (`apps/marketing` vs `docs/`) | Work in parallel; branch from `master` |
| Same files (`README.md`, root `package.json`) | Merge or rebase one PR first; expect conflicts |
| Feature B depends on Feature A | Merge A first, or stack B on A intentionally |

## Cursor / AI-assisted work

Repo rules in [`.cursor/rules/vehicleos-git-pr-workflow.mdc`](./.cursor/rules/vehicleos-git-pr-workflow.mdc) encode this workflow for Cursor agents. Keep them updated when the process changes.

## Questions

Open a [GitHub Discussion](https://github.com/karantyagi/VehicleOS/discussions) or issue for design questions before large changes.
