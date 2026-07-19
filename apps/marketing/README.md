# VehicleOS Marketing Site

Public product landing page - Phase A (thin and honest).

**Deploy target:** `vehicleos.app` (primary product URL)
**Local dev:** `pnpm dev` from monorepo root, or `pnpm --filter @vehicleos/marketing dev` → http://localhost:3001

## Phase A sections (shipped)

- Hero — problem + one-liner from playbook
- Core loop — Evidence → State → Policy → Action → Memory + diagram
- Demo placeholder — "coming soon" until Loom exists
- Architecture diagram + 3 ADR links
- Built AI-native blurb (from operating-model.md)
- Shipped / in-progress / planned table
- CTAs: GitHub · Contact/LinkedIn
- Minimal footer (Phase 0 sitemap)

## Not built yet (by design)

- `/product/intake`, blog, pricing
- Phase 2 footer columns
- Loom embed (swap into `#demo` section)

## Environment variables (optional)

| Variable | Default |
|----------|---------|
| `NEXT_PUBLIC_GITHUB_URL` | `https://github.com/karantyagi/VehicleOS` |
| `NEXT_PUBLIC_APP_URL` | `https://app.vehicleos.app` |
| `NEXT_PUBLIC_LINKEDIN_URL` | LinkedIn profile |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `hello@vehicleos.app` |

## Vercel deploy

1. New Vercel project → import GitHub repo
2. Root Directory: `apps/marketing`
3. Framework: Next.js (auto-detected)
4. Custom domain: `vehicleos.app` (or apex + www)
5. Separate project for `apps/web` → `app.vehicleos.app`


## Stack

Next.js 14 (App Router), static-first, diagrams in `public/diagrams/`.

Product app lives in [`../web/`](../web/) — keep marketing deployable independently.
