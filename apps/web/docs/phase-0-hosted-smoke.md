# Phase 0 — Hosted smoke (P0-2)

**When:** After `master` deploy (Vercel) includes your latest PR.  
**Where:** `https://app.vehicleos.app` · **Vehicle:** 2021+ Acura TLX · **Device:** Android Chrome (receipt photo).

## Pre-flight

- [ ] Latest `master` deployed (check Vercel dashboard or hard-refresh app)
- [ ] Clean sign-in (new account or delete + re-register if testing deletion later)

## Smoke (15–20 min)

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Sign in (Google or GitHub) | ⬜ |
| 2 | Onboarding: **Acura · TLX · 2021+** · current odometer | ⬜ |
| 3a | **Add records** → Take photo → drag crop · zoom · rotate · reset · use cropped photo | ⬜ |
| 3b | Retake/change photo · **Use original** · upload retry paths remain understandable | ⬜ |
| 3c | **Voice note** → live words appear while speaking → Stop and review → correct text → save | ⬜ |
| 3d | Browser without speech recognition → typed-note fallback remains usable | ⬜ |
| 4 | **Maintenance** → History → new row · detail panel | ⬜ |
| 5 | **Home** → attention item visible · Scheduled, Done, Fix this, or Not needed | ⬜ |
| 6 | **Evidence** → artifact · View original | ⬜ |
| 7 | **Evidence** → Export resale report downloads | ⬜ |
| 8 | **Add to Home Screen** (Android Chrome or iOS Share) → opens standalone · Add a record shortcut works | ⬜ |

## Interview demo gate

- [ ] Use a dedicated demo account that is already signed in before screen sharing.
- [ ] Use a supported vehicle with a believable OEM schedule and at least two history records.
- [ ] Rehearse the three-minute story in [`interview-demo-readiness.md`](./interview-demo-readiness.md).
- [ ] Keep one known-good JPEG receipt available if live camera or network access fails.
- [ ] Say the product boundary plainly: receipt photo storage and capture UX are live; structured receipt OCR/LLM extraction and notification delivery are not.
- [ ] Record device, browser, production commit, and any P0/P1 failure below before approving the release.

| Evidence | Value |
|----------|-------|
| Production commit | |
| Device / OS | |
| Browser / version | |
| Photo crop result | |
| Live voice transcript result | |
| Known fallback exercised | |
| Tester / date | |

## Log failures

Note **P0/P1** in task-queue **Next up** or paste to Cursor with screenshot + URL path.

## Done

Record **P0-2** as complete in the implementing PR when all rows pass.
