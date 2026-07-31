# VehicleOS interview demo readiness

**Status:** Code-ready for rehearsal; production mobile smoke is the release gate.

**Primary device:** Android Chrome or another browser with verified Web Speech support.

**Fallback:** A known-good JPEG receipt and typed voice-note transcript.

## The three-minute story

1. **Home — the assistant has a reason to interrupt.** Open one believable maintenance attention item and show the deterministic due rule in plain English.
2. **Capture — the Owner hands off evidence.** Take or choose a receipt photo, drag to crop it, rotate if needed, and confirm the cropped preview before upload.
3. **Voice — text appears while the Owner speaks.** Say one short maintenance note, stop, correct one word in the live transcript, and save it.
4. **Trust — uncertainty is visible.** If the captured record needs confirmation, follow **Review on Home**; do not imply the product silently guessed.
5. **Memory — the durable history changes.** Open Maintenance → History and show the new record, evidence link, and owner correction path.

## Claims that are safe today

- The hosted PWA is capture-first and can be installed from the browser onto a phone home screen; it remains network-first rather than offline-capable.
- Photo crop and rotation happen in the browser before upload.
- Voice text appears in real time when the browser supports Web Speech; typing is the fallback.
- Maintenance schedule projection and due timing are deterministic and owner-correctable.
- Captured evidence is linked to durable vehicle history and explicit verification.

## Claims to avoid

- Do not say receipt OCR or LLM field extraction is complete; current photo capture stores evidence and uses manual/rules-first fields.
- Do not say VehicleOS sends push, email, or browser notifications; current attention is pull-based inside the app.
- Do not imply native iOS/Android distribution, offline support, or background synchronization.
- Do not promise that speech recognition works in every mobile browser.

## Release-gate checklist

- [ ] Latest `master` is deployed and the commit is recorded in the hosted smoke log.
- [ ] Android Chrome passes photo capture, crop/rotate, upload, voice transcript, save, and History verification.
- [ ] iPhone Safari passes camera capture, photo review/upload, Add to Home Screen, and typed voice fallback; record native speech behavior instead of assuming it.
- [ ] A 10 MB rejection, unsupported image-edit fallback, upload retry, and camera retake path have understandable copy.
- [ ] No horizontal overflow, clipped controls, keyboard overlap, or unsafe-area collision at 375 × 812 and 412 × 915.
- [ ] Camera and microphone permission denial produce a recoverable path.
- [ ] Demo account contains no private real-owner evidence that should appear on screen.
- [ ] One rehearsal succeeds from cold open to History in under three minutes.
- [ ] One backup rehearsal succeeds without camera, microphone, or live OCR assumptions.

## Release decision

Approve the next release gate only after the authenticated production smoke has no P0 failures and every P1 failure has an explicit workaround suitable for a live interview. Automated CI and a reachable login page are necessary, but they do not replace this real-device proof.
