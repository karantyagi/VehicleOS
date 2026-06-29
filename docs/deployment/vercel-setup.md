# Vercel deployment (CD)

VehicleOS uses **GitHub Actions for CI** (build verification on PRs) and **Vercel for CD** (preview + production URLs).

## Projects (one repo, two Vercel projects)

| Vercel project | Root directory | Production domain |
|----------------|----------------|-------------------|
| Marketing | `apps/marketing` | `vehicleos.app` |
| Product web | `apps/web` | `app.vehicleos.app` |

## One-time setup

### 1. Install Vercel GitHub integration

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New… → Project**
2. Import `karantyagi/VehicleOS`
3. Set **Root Directory** to `apps/marketing` (not repo root)
4. Framework: Next.js (auto-detected)
5. Repeat for `apps/web` → root `apps/web`

The GitHub App enables:

- **Preview deployments** on every PR (unique URL per commit)
- **PR comments** with “Visit Preview” links (visible CD signal)
- **Production deploy** when PRs merge to `master`

No custom deploy workflow is required if the GitHub integration is connected.

### 2. Domains

| Project | Domain |
|---------|--------|
| Marketing | `vehicleos.app` + `www.vehicleos.app` |
| Web | `app.vehicleos.app` |

Register `vehicleos.app` at your registrar → add DNS records Vercel provides.

### 3. Environment variables (marketing)

Optional overrides in Vercel project settings:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_GITHUB_URL` | GitHub repo link |
| `NEXT_PUBLIC_APP_URL` | Product app URL |
| `NEXT_PUBLIC_LINKEDIN_URL` | Contact CTA |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Footer email |

### 3b. Environment variables (web)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_MARKETING_URL` | Cross-links from `/design-preview` → marketing |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (preview pages, shell copy) |

`apps/product-playground` is **not** a Vercel project — local design lab on port 3002 only.

### 4. Ignored Build Step (optional, saves build minutes)

In each Vercel project → Settings → Git → **Ignored Build Step**:

```bash
# Marketing — only build when marketing or shared deps change
git diff HEAD^ HEAD --quiet apps/marketing packages pnpm-lock.yaml
```

Exit `0` = skip build, `1` = run build. Adjust per [Vercel monorepo docs](https://vercel.com/docs/monorepos).

## What you should see on PRs

After setup, each PR shows:

| Check / signal | Source |
|----------------|--------|
| **CI** (required) | GitHub Actions — `pnpm build` |
| **Vercel – &lt;project&gt;** | Preview deploy status |
| PR comment | Preview URL(s) from Vercel bot |

## CI vs CD

| | CI (GitHub Actions) | CD (Vercel) |
|--|---------------------|-------------|
| **Trigger** | PR + merge to `master` | PR (preview) + merge (production) |
| **Output** | Pass / fail | Live URL |
| **Purpose** | Block broken merges | Ship to users |

## Troubleshooting

- **No Vercel comment on PR** — confirm GitHub App is installed and project Root Directory is correct
- **Monorepo install fails** — `vercel.json` in each app runs `pnpm install` from repo root
- **Preview works, prod 404** — assign production domain in Vercel → Domains
