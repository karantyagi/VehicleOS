# Supabase Postgres (hosted Owners)

**Architecture decision:** [ADR-004 Phase 0 hosted deployment](../docs-lite/adr/ADR-004-phase0-hosted-deployment.md) — constraints, alternatives, revisit triggers.

VehicleOS uses **Supabase for managed Postgres** — not a separate Railway/Render database.

The hosted Owners app (`apps/web` on Vercel) runs API route handlers that connect to Supabase via `DATABASE_URL`. No extra compute provider is required for the golden-path slice.

## Architecture

| Layer | Host | Role |
|-------|------|------|
| Marketing | Vercel (`apps/marketing`) | `vehicleos.app` |
| Owners app + API | Vercel (`apps/web`) | `app.vehicleos.app` + `/api/*` route handlers |
| Postgres | Supabase | Event store + vehicle rows (`DATABASE_URL`) |
| Local Fastify API | `apps/api` (optional) | Same handlers via `@vehicleos/server`; use when developing API without Next |

`apps/worker` stays local/optional until background jobs ship. When they do, you can add Railway/Fly **only for the worker** — Postgres still lives on Supabase.

## One-time Supabase setup

1. [Supabase Dashboard](https://supabase.com/dashboard) → **New project**
2. **Project Settings → Database** → copy the **Connection string (URI)**
   - Prefer the **Transaction pooler** URL for Vercel serverless (`?pgbouncer=true` / port `6543`)
   - Use **Session mode** / direct URL (`5432`) for local migrations
3. Run migrations against the database:

```bash
cd VehicleOS
export DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
./scripts/db-migrate.sh
```

Or paste `db/migrations/*.sql` into the Supabase SQL editor (in order).

## Supabase Auth (Google + GitHub)

1. **Authentication → Providers** → enable **Google** and **GitHub**
2. For each provider, use OAuth credentials from Google Cloud Console / GitHub Developer Settings
3. **Authentication → URL configuration** → add redirect URLs:
   - `https://app.vehicleos.app/auth/callback`
   - `http://localhost:3000/auth/callback` (local dev)
4. Copy **Project URL** and **anon key** from **Project Settings → API** into Vercel env vars

Site URL in Supabase should be `https://app.vehicleos.app` (or `http://localhost:3000` for local).

## Vercel env vars (`apps/web` project)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes (production) | Supabase Postgres URI (pooler recommended) |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://app.vehicleos.app` |
| `NEXT_PUBLIC_MARKETING_URL` | Yes | `https://vehicleos.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (auth) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (auth) | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (account delete) | Supabase service role — `auth.admin.deleteUser()` only |
| `AUTH_DISABLED` | No | `true` for local dev without OAuth (uses dev user id) |
| `NEXT_PUBLIC_API_URL` | No | Leave unset on Vercel — same-origin `/api/*` |
| `USE_IN_MEMORY_EVENT_STORE` | No | `true` only for demos without Postgres |

After setting `DATABASE_URL`, redeploy. Smoke test:

```bash
curl https://app.vehicleos.app/api/health
# → {"status":"ok"}
```

Then open `https://app.vehicleos.app/` → **Sign in** → **Add your vehicle** → **Confirm receipt**.

Account deletion smoke test: **Settings** → type `DELETE` → confirm → redirected to login with success message.

## Local development

**Option A — Next.js only (matches production):**

```bash
export DATABASE_URL="postgresql://..."   # Supabase pooler or direct for migrate
export NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
pnpm --filter @vehicleos/web dev
# → http://localhost:3000
```

**Option A′ — Local without OAuth (golden path only):**

```bash
export AUTH_DISABLED=true
export USE_IN_MEMORY_EVENT_STORE=true   # optional — skip Postgres locally
pnpm --filter @vehicleos/web dev
```

**Option B — Fastify API on :4000 (legacy dev):**

```bash
export DATABASE_URL="postgresql://..."   # or omit for in-memory
pnpm --filter @vehicleos/api dev
export NEXT_PUBLIC_API_URL=http://localhost:4000
pnpm --filter @vehicleos/web dev
```

## Why not Railway/Render/Fly for this slice?

Those platforms run **long-lived Node processes**. Vercel runs **serverless route handlers** — enough for the golden-path API today. Supabase already provides Postgres; colocating API routes on Vercel avoids an extra bill and deploy surface.

Add Railway/Fly later when you need:

- Always-on `apps/worker` (queues, cron, Connect sync)
- WebSockets or heavy CPU outside Next.js limits

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `create vehicle` fails on Vercel | Set `DATABASE_URL`; confirm migrations ran |
| `too many connections` | Use Supabase **pooler** URL, not direct `5432` on serverless |
| Works locally, fails in prod | Check Vercel env on **Preview** and **Production** scopes |
| Want zero DB for a demo | `USE_IN_MEMORY_EVENT_STORE=true` (data resets per instance) |

See also: [`vercel-setup.md`](./vercel-setup.md)
