# FE-UAT-T2-01 — Guest Flow Owner handoff

Engineering evidence for UAT-T2-01–08, H70–H76. **Owner recheck is pending.** Every screenshot here was captured in the Playwright `SYNTHETIC OWNER UAT` environment with a fake camera and intercepted API/media responses. These are not live Guest or backend results.

## Open the Owner session

From this branch, run `pnpm uat:visual` for desktop or `pnpm uat:visual:mobile` for Pixel 7 emulation. The visible Chromium browser pauses on the landing page after smoke checks. Keep it open and paste the localhost URLs below into **that same browser window**. Confirm the `OWNER VISUAL UAT · SYNTHETIC FIXTURES` badge is visible. The test interceptor, fake camera, synthetic Guest session, and pending-save control exist only in this Playwright context. A normal browser, deployed build, or `?uat=` query by itself does not activate them.

To reset Guest reservation/session/scenario state, stop the runner with Ctrl+C and launch `pnpm uat:visual` again. Start each direct link from a fresh session when comparing scenarios. The Guest entry flow removes its fragment and query after consent by design; the Playwright fixture remembers the chosen scenario until the runner is restarted or another `?uat=` link is opened.

## H70–H76 routes

| Surface | Working URL and review steps |
|---|---|
| H70 Photo Review / Retake | [Open synthetic Guest entry](http://localhost:3000/j/uat-event?uat=normal#synthetic-owner-uat-secret). Select **Lanjut → name → Lanjut → consent → Setuju & Lanjutkan → Buka kamera → Ambil foto**. The fake camera frame appears in the real Photo Review. Try **Ambil ulang**; the synthetic ACTIVE reservation is released before a new capture. Change ID/EN and Light/Dark above the card while the photo is visible. |
| H71 Upload / Save | [Open pending-save scenario](http://localhost:3000/j/uat-event?uat=save-pending#synthetic-owner-uat-secret), follow the same clicks through H70, then select **Gunakan foto**. The real saving state stays visible behind a controlled PUT barrier. Select the test-only **SYNTHETIC UAT · Complete save** button at bottom right to finish synthetic PUT + commit and see saved state. For recoverable failure, use `?uat=save-fail-put` or `?uat=save-fail-commit`, follow the same steps, and select **Gunakan foto** again after the error. |
| H72 Capture Closed / Reveal Countdown | [Open closed scenario](http://localhost:3000/j/uat-event?uat=closed#synthetic-owner-uat-secret). Complete Guest name and consent. The card displays `reveal_at` in the event timezone and a countdown; no camera action is offered. [After-reveal scenario](http://localhost:3000/j/uat-event?uat=closed-revealed#synthetic-owner-uat-secret) follows the same join steps, then moves to the authorized gallery only after synthetic Guest context reports `REVEALED`. No capture is required. |
| H73 Guest Gallery | [Open authorized revealed gallery](http://localhost:3000/j/uat-event/galeri?uat=revealed#synthetic-owner-uat-secret) directly. Try Sort. [Hidden](http://localhost:3000/j/uat-event/galeri?uat=hidden#synthetic-owner-uat-secret), [empty](http://localhost:3000/j/uat-event/galeri?uat=empty#synthetic-owner-uat-secret), [denied](http://localhost:3000/j/uat-event/galeri?uat=denied#synthetic-owner-uat-secret), and [expired](http://localhost:3000/j/uat-event/galeri?uat=expired#synthetic-owner-uat-secret) cover the access boundaries. |
| H74 Guest Photo Detail | [Open authorized detail](http://localhost:3000/j/uat-event/galeri/22222222-2222-4222-8222-222222222222?uat=revealed#synthetic-owner-uat-secret) directly. Inspect photographer, back navigation, like, download and share controls. [Actions disabled](http://localhost:3000/j/uat-event/galeri/22222222-2222-4222-8222-222222222222?uat=permissions-off#synthetic-owner-uat-secret) omits disallowed actions. [Detail denied](http://localhost:3000/j/uat-event/galeri/22222222-2222-4222-8222-222222222222?uat=detail-denied#synthetic-owner-uat-secret) does not render the photo. |
| H75 Guest Access Ended | [Open access-ended page](http://localhost:3000/j/uat-event/akses-berakhir?uat=normal#synthetic-owner-uat-secret) directly. Its in-card CTA opens access help; Home is separate below. |
| H76 Guest Post-Event End State | [Open post-event page](http://localhost:3000/j/uat-event/akhir-acara?uat=normal#synthetic-owner-uat-secret) directly. Its in-card CTA explains how Kepotret works; Home is separate below. |

The Guest preferences use the app's persisted locale cookie and theme setting. They remain available on H70–H76. The H70 photo and reservation stay in place when these preferences change. Review both desktop and mobile at 100% zoom.

## Traceability and evidence

| Owner finding | Engineering check | Synthetic screenshots |
|---|---|---|
| UAT-T2-01 H70 language/appearance | ID/EN and Light/Dark change the review copy/theme without replacing the photo; keyboard controls and touch targets checked. | [ID Light desktop](evidence/h70-review-id-light-guest-desktop.png), [EN Dark mobile](evidence/h70-review-en-dark-guest-mobile.png) |
| UAT-T2-02 H70 access | Fake camera → 201 ACTIVE reservation → review; retake releases; expired/denied/rate-limited paths checked. | [H70 mobile](evidence/h70-review-id-light-guest-mobile.png) |
| UAT-T2-03 H71 save | Controlled pending barrier → synthetic JPEG PUT → commit → saved; PUT and commit failure/retry, 403 and 429 checked. | [Pending](evidence/h71-saving-pending-guest-desktop.png), [success](evidence/h71-save-success-guest-mobile.png), [failed PUT](evidence/h71-save-fail-put-guest-desktop.png), [failed commit](evidence/h71-save-fail-commit-guest-mobile.png) |
| UAT-T2-04 H72 closed | Independent closed scenario displays authoritative reveal time/countdown; capture unavailable; after-reveal route gated by Guest context. | [H72 desktop](evidence/h72-closed-countdown-guest-desktop.png), [mobile](evidence/h72-closed-countdown-guest-mobile.png) |
| UAT-T2-05 H73 gallery | Fresh direct revealed route, sort, hidden/empty, 401/403/410 terminal checks. | [H73 desktop](evidence/h73-gallery-revealed-guest-desktop.png), [mobile](evidence/h73-gallery-revealed-guest-mobile.png) |
| UAT-T2-06 H74 detail | Fresh direct detail, actions governed by API permissions, denied detail hides media. | [H74 desktop](evidence/h74-photo-detail-guest-desktop.png), [mobile](evidence/h74-photo-detail-guest-mobile.png) |
| UAT-T2-07 H75 access ended | Branded system card, access icon, help CTA, separate Home; ID/EN and Light/Dark. | [ID Light desktop](evidence/h75-access-ended-id-light-guest-desktop.png), [EN Dark mobile](evidence/h75-access-ended-en-dark-guest-mobile.png) |
| UAT-T2-08 H76 post-event | Distinct clock icon/content, informational CTA, separate Home; corrected route catalog. | [ID Light desktop](evidence/h76-post-event-id-light-guest-desktop.png), [EN Dark mobile](evidence/h76-post-event-en-dark-guest-mobile.png) |

All 26 evidence files in `evidence/` include a visible synthetic badge and cover desktop/mobile, ID/EN, and Light/Dark. The Playwright Guest suite checks 360, 390, 768 and 1440px for horizontal overflow. Evidence is for engineering review only; it does not mark Owner tickets SOLVED.

## Engineering boundary

The synthetic state machine, Guest session seeding for direct gallery URLs, fake media, pending-save release button, and API interceptors live under `tests/uat/`. The production app still requires camera capture, a Guest session, reservation, CSRF, upload authorization, processed JPEG under 700,000 bytes, commit, server reveal state and gallery permissions. `?uat=` and local storage do not unlock any of these outside the Playwright harness. H69 real-device camera verification remains an Owner dependency. D01 LIVE persistence is unsupported. Backend development remains ON HOLD pending completion of Desktop and Mobile Owner Visual UAT and explicit Owner approval.
