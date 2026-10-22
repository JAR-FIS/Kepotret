# FE-UAT-T2-V2-07 — Owner Recheck #3 remediation

Baseline: `main` at `3310fe640c569e4be4e4c51e9c1f2a0bafaa3199` (PR #38 squash). Branch: `fix/fe-uat-t2-v2-07-recheck3-remediation`. Backend remains **ON HOLD**. This handoff records frontend implementation and deterministic synthetic evidence; it does not imply Owner acceptance, a live backend, or proof from physical devices.

## Ticket traceability

| Ticket | Route/state | Change and preserved behavior | Evidence |
| --- | --- | --- | --- |
| T2-05 / H73 Gallery | `/j/[linkId]/galeri` | Sort and view controls align; browse mode hides selection controls. The right-aligned Select photos button opens a 0/20 toolbar and permission-gated checkboxes. Exit and sort clear selections; load-more prunes revoked download permissions. ZIP remains disabled, 20 selections maximum. The remaining quota appears only from fresh `capture-readiness.album_remaining_count`, with no inferred total. Existing viewer, Guide, capture gate, actions and browser Back remain. | [Desktop browse](evidence/synthetic-h73-browse-desktop-1440-id-light.png), [mobile browse](evidence/synthetic-h73-browse-mobile-390-id-light.png), [mobile EN dark](evidence/synthetic-h73-browse-mobile-390-en-dark.png), [desktop 0](evidence/synthetic-h73-selection-0-desktop-1440-id-light.png), [desktop 1](evidence/synthetic-h73-selection-1-desktop-1440-id-light.png), [desktop 20](evidence/synthetic-h73-selection-20-desktop-1440-id-light.png), [mobile 0](evidence/synthetic-h73-selection-0-mobile-390-id-light.png), [mobile 1](evidence/synthetic-h73-selection-1-mobile-390-id-light.png), [mobile 20](evidence/synthetic-h73-selection-20-mobile-390-id-light.png) |
| T2-13 / H80 Albums Operations | `/admin/albums` | Removed the API-field sentence in ID and EN. Kept the server-wide search hint, Enter/clear/cursor/error behavior, and the existing noninteractive, unfocusable sorting cues with an unavailable explanation. | [Desktop ID](evidence/synthetic-h80-copy-desktop-1440-id-light.png) |
| T2-46 Guest Entry | `/j/[linkId]` before the live camera | Welcome, name/optional PIN, consent, and ready/waiting stages use the approved `AuthPageFrame` with logo, locale/theme controls, card, and Home link. Closed and saved states share that frame. The live camera remains fullscreen with camera controls only; H70 review and the capture lifecycle are unchanged. | [Desktop welcome](evidence/synthetic-guest-welcome-desktop-1440-id-light.png), [mobile welcome](evidence/synthetic-guest-welcome-mobile-390-id-light.png), [mobile EN dark welcome](evidence/synthetic-guest-welcome-mobile-390-en-dark.png), [desktop PIN](evidence/synthetic-guest-pin-desktop-1440-id-light.png), [mobile PIN](evidence/synthetic-guest-pin-mobile-390-id-light.png), [desktop join](evidence/synthetic-guest-join-desktop-1440-id-light.png), [mobile join](evidence/synthetic-guest-join-mobile-390-id-light.png), [desktop consent](evidence/synthetic-guest-consent-desktop-1440-id-light.png), [mobile consent](evidence/synthetic-guest-consent-mobile-390-id-light.png), [desktop ready](evidence/synthetic-guest-ready-desktop-1440-id-light.png), [mobile ready](evidence/synthetic-guest-ready-mobile-390-id-light.png), [desktop waiting](evidence/synthetic-guest-waiting-desktop-1440-id-light.png), [mobile waiting](evidence/synthetic-guest-waiting-mobile-390-id-light.png), [desktop closed](evidence/synthetic-guest-closed-desktop-1440-id-light.png), [mobile closed](evidence/synthetic-guest-closed-mobile-390-id-light.png), [desktop camera](evidence/synthetic-guest-camera-desktop-1440-id-light.png), [mobile camera](evidence/synthetic-guest-camera-mobile-390-id-light.png) |
| T2-47 Photo Saved | `/j/[linkId]` after commit | The CaptureSuccess save action reads “Simpan” / “Save”. The existing save handler, JPEG filename, post-commit availability, and capture-again action remain. Gallery download copy is unchanged. | [Desktop saved](evidence/synthetic-guest-saved-desktop-1440-id-light.png), [mobile saved](evidence/synthetic-guest-saved-mobile-390-id-light.png) |

Additional mobile English dark entry evidence: [join](evidence/synthetic-guest-join-mobile-390-en-dark.png), [consent](evidence/synthetic-guest-consent-mobile-390-en-dark.png), [ready](evidence/synthetic-guest-ready-mobile-390-en-dark.png).

The Owner spreadsheet's temporary `UAT-T2-41` on row 15 maps to **T2-46 Guest Entry**, and temporary `UAT-T2-42` on row 16 maps to **T2-47 Photo Saved**. Approved T2-41 Host Help and T2-42 Collaborator Help retain their original IDs and scope. The [Engineering Brief](BRIEF.md) preserves the Owner wording and mapping.

## Changed files

- `src/features/guest/components/guest-gallery.tsx` — H73 mode, layout, authorized selection state.
- `src/features/guest/components/guest-entry-flow.tsx` — T2-46 frame reuse outside the camera/review branches.
- `src/messages/id.json`, `src/messages/en.json` — H73, H80, T2-47 localized copy.
- `tests/features/guest/guest-gallery.test.tsx`, `tests/e2e/guest-gallery.spec.ts`, `tests/e2e/guest-capture.spec.ts`, `tests/e2e/fe-uat-t2-v2-06.spec.ts` — prior assertions adapted to the approved new default and copy.
- `tests/e2e/fe-uat-t2-v2-07.spec.ts`, `tests/e2e/fe-uat-t2-v2-07-cross-browser.spec.ts` — new deterministic evidence and browser checks.
- This handoff, [brief](BRIEF.md), and linked synthetic screenshots.

## Validation

- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test` — 42 files, 292 tests passed.
- `pnpm api:check` — passed; generated client is fresh.
- `pnpm build` — passed.
- Focused Chromium regressions for V2-07, Guest capture/Gallery, H80, and V2-06 — 66 passed, one existing evidence-only test skipped, with `--retries=0`. An initial H80 evidence assertion targeted the Guest locale option name; the Admin selector was corrected and the full focused run passed.
- Critical cross-browser Guest Entry, Gallery, camera and lightbox regressions — 25 passed without retries across Chromium, Firefox, WebKit, mobile Chromium and mobile WebKit.
- Existing Guest Owner UAT — 40 passed without retries across desktop and mobile.
- [Hosted Frontend CI #120](https://github.com/JAR-FIS/Kepotret/actions/runs/39730310658) for PR #39 at feature HEAD `eda56b2d26cc2fde914144e4ff955dbb4c48eac6` — quality and E2E jobs both passed. Quality ran lint, typecheck, unit tests, OpenAPI drift check, and production build. The full Chromium and focused cross-browser step reported 267 passed, 5 skipped, and 1 flaky: the pre-existing H29/H53 schedule-picker test on mobile WebKit failed its first attempt because hour `03` remained enabled, then passed Playwright's automatic retry. No CI job was manually rerun. The separate privileged Admin step passed 28 tests with 1 skip and `--retries=0`; Guest Owner UAT passed 40 desktop/mobile tests with `--retries=0`. This retry is outside the four V2-07 tickets and does not establish a fix for H29/H53.

Screenshots use the `tests/uat/mock-api.ts` synthetic fixture, browser fake camera stream, and visible **OWNER VISUAL UAT · SYNTHETIC FIXTURES** badge. They establish layout and flow under fixture data. Owner recheck, real iPhone/Android camera validation, and backend integration remain separate.

## Dependencies and deferred functionality

- Guest ZIP is still **blocked/unverified**. Authorized Gateway/CORS access, media permissions, file integrity, device saving, and memory behavior must be verified before implementing download; the approved 20-photo selection limit stays enforced in the UI.
- H80 server-wide sorting requires backend/OpenAPI support. Its cues remain inert and unfocusable.
- Default `downloads_enabled=true` for newly created albums requires backend work.
- H91 server-side MFA revoke remains a security/backend dependency.
- Real iPhone/Android camera checks remain outside this synthetic run. The historical mobile WebKit schedule-picker flake recurred once in hosted CI #120 and passed on automatic retry, as recorded above.
- No database, OpenAPI, authentication, authorization, permission, backend, or locked business-rule changes were made. Stop before merge; independent review and Owner recheck are required.
