# FE-UAT-T2-V2-01 — Guest Camera & Photo Flow (H69–H72)

Engineering handoff from baseline `51a17438eec28ccea8ca1ccd66127af762120ba1`. **Independent review and Owner Visual Recheck are pending.** The screenshots below use synthetic Playwright camera streams and intercepted API responses; they do not demonstrate a physical phone camera or live backend.

## Traceability and verified causes

| Scope | Owner mapping | Finding and correction |
| --- | --- | --- |
| H69 camera | New Owner design direction, 20 October 2026 | The camera was inside the shared guest card with header, preferences, event information, and an `aspect-[3/4]` video. The video used `object-cover` while the canvas saved the full frame. The switch was always shown and used only an ideal facing hint; permission requests left the shared ready card visible. H69 now occupies the viewport during permission requests and active capture, with shutter and an available-camera switch; capture crops to the visible aspect, mirrors front-camera output with the preview, and gates the shutter during readiness, offline, reservation, and stream changes. |
| H70 photo review | UAT-T2-01 | Review inherited the shared card. It now uses the existing H09/404 page-frame composition: logo and preferences above the card, photo and actions inside, and a simple localized Home link below. Locale/theme changes retain the blob and active attempt. |
| H71 save/retry copy | UAT-T2-03 | English review recovery said “Retake.” It now says “Take again”; Indonesian stays “Ambil ulang.” The actions stay on one line, stacking at narrow widths. Upload and commit behavior remains server owned. |
| H72 waiting/closed/reveal | UAT-T2-04 | A generic waiting message appeared for some non-waiting states, and the closed countdown lacked a clear purpose. WAITING now announces capture has not started and shows a start time only when the server provides one. CLOSED says capture ended and labels the server-time countdown as time until photo publication. A server-revealed gallery does not imply capture reopens. |

## Security and data-flow review

- Guest session and authoritative capture readiness are checked before opening and again before shutter. The existing CSRF request, idempotent attempt reservation, JPEG processing and 700,000-byte cap, upload authorization, commit recovery, and retake release remain in place.
- The camera uses `getUserMedia` only. No device-gallery picker, file upload control, production UAT bypass, or new dependency was added.
- A second stream is requested only after stopping the first. A failed switch tries to restore the prior camera; the switch control is hidden when a distinct device cannot be identified or switching fails. Tracks are stopped on capture, stage exit, switch, and unmount. Empty frame output never enters review.
- User-facing errors use existing localized safe messages plus a localized switch failure. No tokens, access secrets, private media credentials, API bodies, or OTP values appear in the UI or evidence.
- No backend, database, migration, OpenAPI, generated contract, entitlement, or locked product-rule change. Backend remains **ON HOLD**. The documented H91 revoke server-side MFA contract dependency remains for a separate backend/security review.

## Validation

| Check | Result |
| --- | --- |
| `pnpm lint`, `pnpm typecheck`, `pnpm api:check`, `pnpm build`, `git diff --check` | Passed locally |
| `pnpm test` | 42 files, 281 tests passed |
| `guest-capture.spec.ts`, Chromium, `--retries=0` | 23 passed; reservation, release, commit recovery, consent, permissions, offline, closed/quota and new H69–H72 assertions |
| H69/H70 cross-browser, `--retries=0` | 5 passed: Chromium, Firefox, WebKit, mobile Chromium, mobile WebKit |
| Owner UAT catalog smoke | 2 passed against synthetic fixtures |
| Guest Owner UAT regression, `--retries=0` | 36 passed: desktop and mobile synthetic scenarios |
| Full Playwright matrix, `--retries=0` | 215 passed, 3 existing evidence-only skips; no flaky passes |
| Hosted CI (PR #33, initial implementation commit `9f9a275`) | Quality passed (42 files, 281 tests, lint, typecheck, OpenAPI check, build). Full E2E: 214 passed, 3 existing evidence-only skips, 1 retry-pass in the unrelated Host setup flow. Privileged Admin regression: 28 passed, 1 existing skip, no retries. Guest Owner UAT: 36 passed, no retries. |

The new Playwright assertions check portrait/landscape/desktop geometry, only the normal camera controls, actual stream switch order with no overlapping streams, hidden switch on a single camera, switch failure recovery, rapid double shutter, empty-frame rejection, portrait/landscape crop, H70 preference persistence, H71 label width, and H72 localized server-state guidance. The synthetic camera feed is black by design; these tests validate layout and state flow, not physical camera image quality.

The hosted retry-pass was `tests/e2e/host-core.spec.ts` expecting the Host setup route after dashboard navigation; it is outside H69–H72. The focused Guest Owner UAT run passed all 36 cases without retries. Final PR HEAD check status is tracked on [PR #33](https://github.com/JAR-FIS/Kepotret/pull/33/checks).

## Independent review follow-up

The independent review of `23b2ea3` requested three camera lifecycle corrections on PR #33. The switch path now preserves terminal 401/403 denial instead of replacing it with Ready; a rejected video playback stops the stream and returns to Ready with localized retry guidance; and camera entry checks its operation generation after the readiness request, so a late response cannot start media after a terminal stage exit or unmount. Focused synthetic regressions cover switch denial at both statuses, playback rejection and retry with track cleanup, and delayed readiness after a terminal stage exit. The latter test also navigates away after verifying no acquisition.

Remediation validation: lint, typecheck, 281 unit/component tests, OpenAPI freshness, production build, and all 27 Chromium guest-capture tests passed locally. The four new focused regressions passed with `--retries=0`. Final hosted quality and E2E results are available on the PR checks page. These checks do not replace real-device Owner validation.

## Synthetic screenshots

| Stage | Evidence |
| --- | --- |
| Before H69/H70 | [H69 mobile 320](evidence/before-h69-mobile-320-en.png), [H70 mobile 320](evidence/before-h70-mobile-320-en.png) |
| After H69 | [Mobile 390](evidence/after-h69-mobile-390-en-light.png), [Android-like 412](evidence/after-h69-android-412-en-light.png), [landscape 844](evidence/after-h69-landscape-844-en-light.png), [desktop 1440](evidence/after-h69-desktop-1440-en-light.png) |
| After H70/H71 | [EN Light mobile](evidence/after-h70-mobile-390-en-light.png), [ID Dark mobile](evidence/after-h70-mobile-390-id-dark.png) |
| After H72 | [Closed with publication countdown](evidence/after-h72-closed-en-light.png) |

The before H70 screenshot uses the older synthetic fixture's invalid camera blob; compare its shell and action placement only. After screenshots use a valid synthetic black JPEG. None is Owner real-device acceptance evidence.

## Owner UAT links and real-device checklist

These localhost links require the Playwright synthetic Owner UAT harness. They do not enable synthetic data in production.

- [H69/H70 normal guest flow](http://localhost:3000/j/uat-event?uat=normal#synthetic-owner-uat-secret): finish name and consent, open camera, capture, review, change locale/theme, retake, then choose Use photo.
- [H71 pending save](http://localhost:3000/j/uat-event?uat=save-pending#synthetic-owner-uat-secret) and [recoverable save failure](http://localhost:3000/j/uat-event?uat=save-fail-put#synthetic-owner-uat-secret): verify saving status and retry behavior.
- [H72 closed](http://localhost:3000/j/uat-event?uat=closed#synthetic-owner-uat-secret) and [after reveal](http://localhost:3000/j/uat-event?uat=closed-revealed#synthetic-owner-uat-secret): verify publication wording and no further capture.

**Owner real-device H69 UAT remains pending:** open a real event link on iPhone Safari and Android Chrome; check portrait, landscape, short viewport and safe-area placement; grant/deny camera permission; check front/back switching where the device exposes distinct cameras; verify the captured photo matches the preview, no camera stays active after review/exit, rapid taps create one attempt, and offline/closed/quota states block capture. Repeat H70/H71/H72 in ID/EN and Light/Dark. Browser device enumeration can omit a reliable device ID, in which case the switch is intentionally hidden; physical-device behavior needs Owner verification.

Owner issues are **not SOLVED** by this engineering handoff. Owner Visual Recheck remains separate from engineering approval and deferred until independent review and merge.
