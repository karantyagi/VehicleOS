# E2E & UI testing — `apps/web` + Supabase (real DB)

**Problem:** Cursor (and CI) cannot reliably drive **Google’s OAuth UI** — CAPTCHA, 2FA, and Google’s anti-bot rules block automated “Continue with Google” the way a human does in Gmail.

**Strategy:** Split testing into layers. Use **real Supabase + real DB** where it matters; use **saved session** or **test-only auth** where Google cannot run headless.

---

## Layer 1 — Fast (every PR): unit + integration

Already in repo: `vitest` on `packages/domain`, `packages/server`, `apps/api`, `apps/worker`.

```bash
cd VehicleOS
pnpm --filter @vehicleos/domain test
pnpm --filter @vehicleos/server test
pnpm --filter @vehicleos/api test
pnpm --filter @vehicleos/web typecheck
pnpm --filter @vehicleos/web build
```

Add **route/handler integration tests** against Supabase **local** or a **staging project** with env vars in `.env.test` (never commit secrets).

---

## Layer 2 — Browser E2E (Playwright): recommended for “real user” flows

Add Playwright to `apps/web` (one-time):

```bash
cd apps/web
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

### Google login in automation (pick one)

| Approach | When to use |
|----------|-------------|
| **A. Saved auth state** | You log in once with Google in a headed browser; save cookies to `e2e/.auth/user.json`; tests reuse `storageState`. **Best for Cursor-assisted dev** on your machine. |
| **B. Supabase email/password test user** | Create a dedicated user in Supabase Auth (not Google). E2E uses `signInWithPassword` in a setup script, then saves session. **Best for CI.** |
| **C. Staging “test mode”** | `E2E_BYPASS_AUTH=1` only on local/staging — middleware accepts a signed test cookie. **Use sparingly**; never production. |

**Do not** depend on Cursor clicking through Google every run.

### A — Manual once, then automated (Gmail user, local dev)

1. Write `e2e/auth.setup.ts` that opens `/login`, you complete Google manually, script saves `storageState`.
2. All specs use:

```ts
// playwright.config.ts
use: { storageState: "e2e/.auth/user.json" },
dependencies: ["setup"],
```

3. Add `e2e/.auth/` to `.gitignore`.

Run headed setup when session expires:

```bash
pnpm exec playwright test --project=setup --headed
```

### B — CI-friendly (no Google)

1. Supabase Dashboard → Auth → create user `e2e@yourdomain.test` + password (or use Admin API).
2. Setup project runs:

```ts
await supabase.auth.signInWithPassword({ email, password });
// persist storageState
```

3. Tests hit **real API routes** and **real Postgres** on staging.

---

## Layer 3 — Cursor as “real user” (exploratory, not CI)

What Cursor **is good at**:

- You run `pnpm --filter @vehicleos/web dev` with **your** `.env.local` (Supabase URL, anon key, redirect URLs).
- You sign in with **Google once** in the browser.
- In Cursor chat: “Walk through golden path: receipt → Now queue → timeline” — agent reads code, you click, or use **Cursor Browser** (if enabled) for **non-OAuth** steps after you’re logged in.
- Agent runs **Playwright** specs you add; you re-auth when `storageState` expires.

What Cursor **is not** a replacement for:

- Unattended Gmail OAuth in CI.
- Load/security testing of Google’s login page.

**Practical Cursor workflow:**

1. Terminal: dev server + Supabase local or staging DB.
2. Save Playwright auth state after your Gmail login (Layer 2A).
3. Ask agent: “Add Playwright spec: onboarding → receipt confirm → assert toast + timeline row.”
4. Agent runs `pnpm exec playwright test` with your saved state.

---

## Layer 4 — Exhaustive coverage map

| Area | Tool |
|------|------|
| Domain rules, golden path | Vitest (`packages/domain`) |
| API routes + RLS | Vitest + Supabase test project |
| UI components | Vitest + React Testing Library (optional) |
| Full shell navigation, grids, login redirect | Playwright |
| OAuth redirect/callback | Playwright setup + real callback URL in Supabase redirect allowlist (`http://localhost:3000/auth/callback`) |
| Migrations / schema | Supabase CLI `db test` or migration apply to local |

---

## Supabase checklist for local E2E

- [ ] Google OAuth redirect: `http://localhost:3000/auth/callback`
- [ ] Site URL / redirect URLs include localhost
- [ ] Same project keys in `apps/web/.env.local`
- [ ] RLS policies allow your test user’s `vehicle` rows
- [ ] Optional: Supabase local (`supabase start`) for destructive tests

---

## Suggested next repo tasks

1. Add `@playwright/test` + `e2e/login.spec.ts` (expects redirect to `/login` when logged out).
2. Add `e2e/auth.setup.ts` + gitignored `e2e/.auth/user.json`.
3. Add `e2e/golden-path.spec.ts` (receipt flow with saved session).
4. Document staging test user in 1Password / env template only — not in git.

Related: [`04-apps-web-console-upgrade-ladder.md`](../../../../workspace/strategy/design-system/04-apps-web-console-upgrade-ladder.md)
