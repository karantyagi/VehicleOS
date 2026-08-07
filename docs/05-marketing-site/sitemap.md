# Marketing site scope

**Status:** Scope frozen for the January-February 2027 interview cycle
**App:** `apps/marketing` -> `vehicleos.app`
**Owner app:** `apps/web` -> `app.vehicleos.app`

## Core intent

The marketing site is the owner-facing trust and activation front door for a
narrow, invite-only early-access product. Its job is to help a qualified owner
understand the supported value, trust why a next action is shown, and enter the
app to get that value.

It is not a cold-call landing page for interviews. A hiring reviewer should be
able to verify that a real, carefully scoped product exists, then follow the
GitHub link for architecture and evaluation evidence.

The owner activation event is: select a supported vehicle, confirm a service
fact, and see an explainable next action.

## One-page product story

```text
confirmed maintenance evidence
  -> deterministic, source-aware next action
  -> owner schedules, completes, corrects, or declines
  -> auditable recalculation
```

| Route | Purpose | Scope rule |
| --- | --- | --- |
| `/` | Owner story, five-policy focus, product loop, existing video walkthrough, and vehicle-support CTA | The only product-marketing page needed now |
| `/privacy` | Plain-language data collection, retention, and research boundary | Must say the owner product does not send PDFs/receipt photos to an LLM today |
| `/security` | Hosting, access control, deterministic policy, and research isolation | Must not claim SOC 2, enterprise certification, or production inference controls that do not exist |
| `/terms` | Early-access expectations and safe-use rules | Must say VehicleOS is not mechanical advice |
| External GitHub link | Architecture and evaluation proof | Link only to current, scoped ADRs and evaluation methodology |

## Homepage rules

- Lead with the owner outcome: confirmed history and one explainable next action.
- Use **Check your car** as the single primary CTA. The support result can lead a
  supported owner into the app.
- Keep the existing video demo section intact while YouTube is the active host.
- Keep technical proof low prominence: a footer link to GitHub, not engineering
  marketing or a second homepage audience.
- State only the product capability that is current and tested. Tire rotation is
  the implemented reference policy; the other four policies are in progress.

## Claims prohibited on the home page

- Always-on reminders or notification delivery.
- General AI, automatic OCR/vision extraction, or CARFAX import as an owner
  product capability.
- Provider ranking, price/offer estimates, bookings, free-service guarantees,
  or dealership integrations.
- Competitive comparison against ChatGPT, Gemini, CARFAX, or portal reports.
- CARFAX research cards, roadmap ladders, ship logs, agent factories, job
  queues, workers, vector databases, or "Staff-level" marketing language.

## Change rule

Add a marketing route only when it supports a current owner decision or a
verified product demonstration. Architecture detail belongs in the public
repository, not in a growing marketing navigation tree.
