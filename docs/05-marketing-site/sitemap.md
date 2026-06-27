# Marketing Site Sitemap

**Status:** Initial plan (v0). Grow pages only when each link has real content.

**App:** `apps/marketing` → deploy to `vehicleos.app` (resume link)  
**Product app:** `apps/web` → deploy to `app.vehicleos.app`

---

## Phase 0 — Launch (minimal)

Single-page home + small footer. No mega-menu.

| Route | Purpose |
|-------|---------|
| `/` | Hero, problem, core loop diagram, demo embed, CTAs |
| `/how-it-works` | Vertical slice story (optional separate page or anchor) |
| External | GitHub, Loom demo, ADRs |

**Footer columns (minimal):**

```text
Product          Learn            Connect
────────         ─────            ───────
How it works     Docs (GitHub)    GitHub
Demo             Architecture     Contact
Roadmap          —                —
```

---

## Phase 1 — v1 live

Add journey-shaped Product links (Linear-inspired):

| Route | Purpose |
|-------|---------|
| `/product/intake` | Receipt upload; future email ingest |
| `/product/recommend` | What's due, why, cost bands |
| `/architecture` | Diagram + ADR links |
| `/roadmap` | Honest v1 / v2 / v3 |
| `/changelog` | Version tags as chapters |
| `/about` | Founder story + AI-native operating model |

**CTA pattern:** "Open app" → `app.vehicleos.app` | "View source" → GitHub

---

## Phase 2 — v2+ (Vercel-inspired depth)

Add platform layers when real: Data (lakehouse), Developers, Security, Partners.

Expand footer only when the page exists — no placeholder nav.

---

## Design references

- [Linear Asks](https://linear.app/asks) — user journey Product column
- [Vercel AI](https://vercel.com/ai) — platform depth when v2 ships
- Infrastructure aesthetic — diagrams over stock photography

Full strategy: workspace `strategy/showcase_strategy.md`.
