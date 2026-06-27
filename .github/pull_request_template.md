## Summary

<!-- 1–3 bullets: what changed and why -->

-

## Type

<!-- Delete extras -->

- [ ] Feature
- [ ] Fix
- [ ] Chore / tooling
- [ ] Docs only

## Apps affected

<!-- Check all that apply -->

- [ ] `apps/marketing`
- [ ] `apps/web`
- [ ] `apps/api`
- [ ] `apps/worker`
- [ ] `packages/*`
- [ ] Docs / repo only

## Test plan

<!-- Checklist a reviewer can follow -->

- [ ] `pnpm install`
- [ ] `pnpm --filter @vehicleos/marketing build` (if marketing touched)
- [ ] `pnpm --filter @vehicleos/web build` (if web touched)
- [ ] **CI** check green on PR
- [ ] Vercel preview link on PR (after [Vercel setup](docs/deployment/vercel-setup.md))
- [ ] Manual smoke test (URLs, copy, CTAs) if user-facing

## Notes

<!-- Optional: deploy steps, follow-ups, breaking changes -->
