# ADR-005: Owners-only positioning — hosted early access

> **Decision summary:** Market VehicleOS as **free hosted early access for car owners** only. Remove Builders/self-host GTM from the site. Keep GitHub public as an **architecture showcase**, not a second product path.

- **Status:** Accepted
- **Date:** 2026-07-21
- **Supersedes:** Dual-path Owners & Builders marketing and “run it yourself” parity

## Context

VehicleOS originally followed an open-core pattern (PostHog/Supabase style): **Owners** (hosted app) and **Builders** (MIT repo, self-host, CLI). Interview prep targets **Track B (Applied AI)** with **Track A (Platform SWE)** secondary — apply **Jan 2027**.

Constraints:

- **Max visibility** — site, app, GitHub, technical blog; **LinkedIn TBD** (see stealth playbook)
- **Free early access** — no billing/subscriptions before apply wave
- **Real non-technical users** — wedge *what's due next*, not developer tooling
- **~7 hr/wk build budget** shared with Setup OS + NetApp AI verbal through Oct 31

Dual-path messaging split attention, invited self-host interview rabbit holes, and implied product parity we do not support for early access.

## Decision

1. **Product GTM:** Owners-only. Primary CTA → `app.vehicleos.app` (free early access).
2. **Marketing site:** Remove Builders card, path chooser, and self-host hero copy.
3. **GitHub:** Remains public MIT repo for **ADRs, domain model, evals methodology** — README leads with live app, not docker install.
4. **Monetization:** Deferred. No Stripe, tiers, or LLC narrative in product/marketing until post-apply wave.
5. **Distribution:** Direct beta invites + Sep–Oct packaging (blog, demo, resume) — not App Store/paid ads pre–Oct 31.

## Locked constraints (2026-07-21)

| Topic | Policy |
|-------|--------|
| **One-line policy** | Product = hosted Owners (free). Repo = credibility for engineers, not second GTM. |
| **Wedge** | *What's due next* — plain-English why, from service history (non-technical owner language). |
| **Visibility** | Site + app + GitHub + Dev.to/blog + resume. **LinkedIn TBD** — not final; see `visibility-playbook.md` § Stealth when decided. |
| **Visibility timing** | Jul–Aug quiet beta · Sep–Oct package per roadmap — not Sep 1 blitz. |
| **Users** | Friends ~10 max ≠ GTM. Target 20–40 engaged non-technical owners. |
| **6-month goal** | All free early access; 3–5 testimonials; anonymized metrics by Oct. |
| **Resume** | Track B primary · Track A one bullet · NetApp XP = defense, not built product. |
| **Interview ROI** | Live demo + essay + N engaged users > stars; three-project budget unchanged. |

Full narrative: workspace `strategy/positioning-owners-only.md`.

### Positive

- Single clear story for owners and recruiters
- Track B signal: shipped SaaS + AI boundaries + live URL
- GitHub still satisfies engineers who audit architecture before calls
- Less scope spent on self-host docs and builder support

### Negative

- OSS/community growth via “fork and self-host” no longer a goal
- Existing links/bookmarks to `#paths` Builders may 404 — mitigated by site deploy
- Repo still contains dev/docker artifacts — must not contradict “hosted only” in copy

## Alternatives considered

| Alternative | Verdict |
|-------------|---------|
| Full private repo | Rejected — loses GitHub visibility without LinkedIn |
| Keep dual-path marketing | Rejected — confuses wedge and interview narrative |
| Close license / remove GitHub | Rejected — no interview upside before Jan ’27 |

## Follow-up

- [x] Update marketing site copy and nav
- [x] Update strategy docs and `docs/open-core-boundary.md`
- [ ] Refresh README top fold on next marketing deploy
- [ ] Sep–Oct: blog + demo + resume per interview roadmap

## Interview talking point

> “I narrowed to owners-only early access — what's due next from your real service history. The site and app are the product; GitHub is architecture proof for engineers, not a self-host offering.”
