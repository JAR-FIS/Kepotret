# FE-UAT-T2-V2-03 — Guest Gallery and photo viewer

## Scope and traceability

This batch starts from merged PR #34, squash commit `27dc6ca23f5efe80369835887b9d455c817daa43`. It addresses the UI portion of [UAT-T2-05 / H73](http://localhost:3000/j/uat-event/galeri?uat=revealed#synthetic-owner-uat-secret) and [UAT-T2-06 / H74](http://localhost:3000/j/uat-event/galeri/22222222-2222-4222-8222-222222222222?uat=revealed#synthetic-owner-uat-secret). Both Owner tickets remain open for independent review and physical-device visual recheck.

| Finding | Verified prior behavior | Correction and evidence |
| --- | --- | --- |
| H73, UAT-T2-05: Gallery presentation | Gallery had one card layout, sort/cursor loading and action permissions, but no Guest navigation, Guest guide or list view. Its photo link replaced the Gallery with a full-page detail. | Branded Gallery shell, grid default/list toggle, Gallery and Panduan only, close/reopen sidebar and mobile drawer, contextual Guest guide, metadata row with an independent right-aligned like action, and a subdued footer. [Grid desktop](evidence/h73-grid-id-light-guest-desktop.png), [grid mobile](evidence/h73-grid-id-light-guest-mobile.png), [list desktop](evidence/h73-list-id-light-guest-desktop.png), [list mobile](evidence/h73-list-id-light-guest-mobile.png). |
| H73: capture action | The prior Gallery did not offer a capture action. Reveal and event data alone do not authorize capture. | The CTA is shown only after the existing capture-readiness API returns matching album, `READY` and `can_capture`; it is hidden offline/unknown/closed and rechecks immediately on activation. A quota-closed response prevents navigation. |
| H74, UAT-T2-06: detail presentation | The detail route rendered a separate full-page view, losing visible Gallery context and its loaded list/sort state. | A shared Gallery route layout retains the grid/list, sort and loaded pages beneath a centered responsive dialog. The dialog uses a translucent blurred backdrop, contained media, compact authorized actions, close/Escape/Back behavior, focus containment and focus return, with no locale/theme controls. [Overlay desktop ID/Light](evidence/h74-overlay-id-light-guest-desktop.png), [mobile ID/Light](evidence/h74-overlay-id-light-guest-mobile.png), [desktop EN/Dark](evidence/h74-overlay-en-dark-guest-desktop.png), [mobile EN/Dark](evidence/h74-overlay-en-dark-guest-mobile.png). |
| H74: direct link and access loss | The existing detail API provided per-photo authorization; it had to remain decisive after introducing a background Gallery. | Direct links fetch Guest context, a revealed list and the individual detail. A 403/404 hides the media/actions, 401/410 reaches the existing terminal routes, and network or expired media has safe visible feedback. |

The Owner's Gallery reference image #2 and Photo Detail reference image #3 were inspected from the local handoff ZIP. They informed the compact photo-first layout and overlay geometry only; Kepotret colors, typography and permissions remain project-owned.

## Before and after visual evidence

The earlier synthetic baseline is [H73 desktop](../FE-UAT-T2-01/evidence/h73-gallery-revealed-guest-desktop.png), [H73 mobile](../FE-UAT-T2-01/evidence/h73-gallery-revealed-guest-mobile.png), [H74 desktop](../FE-UAT-T2-01/evidence/h74-photo-detail-guest-desktop.png) and [H74 mobile](../FE-UAT-T2-01/evidence/h74-photo-detail-guest-mobile.png). The current screenshots above cover H73 grid/list and H74 overlay at desktop and mobile sizes. Every screenshot uses Playwright synthetic fixtures and carries the synthetic UAT badge. They do not prove real Gateway delivery, real Guest permissions or physical iPhone/Android behavior.

Additional Owner fixture routes: [H73 hidden](http://localhost:3000/j/uat-event/galeri?uat=hidden#synthetic-owner-uat-secret), [empty](http://localhost:3000/j/uat-event/galeri?uat=empty#synthetic-owner-uat-secret), [denied](http://localhost:3000/j/uat-event/galeri?uat=denied#synthetic-owner-uat-secret), [expired](http://localhost:3000/j/uat-event/galeri?uat=expired#synthetic-owner-uat-secret), [H74 actions disabled](http://localhost:3000/j/uat-event/galeri/22222222-2222-4222-8222-222222222222?uat=permissions-off#synthetic-owner-uat-secret), and [detail denied](http://localhost:3000/j/uat-event/galeri/22222222-2222-4222-8222-222222222222?uat=detail-denied#synthetic-owner-uat-secret). These links need the local UAT interceptor; query/hash flags do not grant production access.

## Security and contract review

- Guest session, reveal, per-photo visibility and action flags remain server-owned. A deep link re-fetches the individual detail before rendering media or actions. Like remains once-only, requires the existing CSRF token, and never exposes an unlike path. Share and single-photo download still request fresh server descriptors. No credential, OTP, token or private media URL is printed into UI or logs.
- Capture-readiness is a separate server authority. The Gallery never derives permission from reveal state; it checks readiness on mount and periodically, then repeats the check on click. Offline or failed checks hide the CTA. This does not replace the camera route's own checks.
- Existing server sort values `NEWEST`, `OLDEST`, `MOST_LIKED`, cursor pagination, 24-item page size and 240-loaded-item bound are retained. View toggles do not fetch or alter permissions; changing sort invalidates stale asynchronous page results.
- No backend, database, OpenAPI, generated API client, configuration, dependency or new media proxy was changed. Backend remains ON HOLD. The H91 revoke server-side MFA contract dependency remains open for future backend/security review.

## Local validation

| Check | Result |
| --- | --- |
| `pnpm lint`, `pnpm typecheck`, `pnpm api:check`, `pnpm build` | Passed. |
| `pnpm test` | 42 files, 286 tests passed. One first run hit a 20-second timeout while the production build ran concurrently; the full suite passed when rerun alone. |
| Focused Guest Gallery Chromium E2E, `--retries=0` | 12 passed on final rerun. |
| Gallery modal cross-browser, `--retries=0` | 5 passed: desktop Chromium/Firefox/WebKit and mobile Chromium/WebKit. |
| Existing synthetic Guest Owner UAT H70–H76, `--retries=0` | 28 passed across desktop and mobile projects. |
| New H73/H74 ID/EN, Light/Dark, 320/390/412/tablet/desktop and screenshot tests, `--retries=0` | 4 passed across desktop and mobile projects; eight screenshots generated. |
| Full E2E, `--retries=0` | 228 passed, 3 existing evidence-capture-only tests skipped; no retry passes. A subsequent Gallery fixture correction passed in all 5 browser projects. |
| Hosted CI | Pending PR. |

## Deferred dependencies and Owner review

| Item | Status / next authority |
| --- | --- |
| Selected Guest ZIP of 1–20 eligible photos | **BLOCKED/UNVERIFIED.** [Feasibility spike](../FE-UAT-T2-V2-02/README.md) found no authorized real Gateway byte/CORS proof. No selection or ZIP control ships here. Backend/security and environment owners must supply a nonproduction Gateway and safe Guest fixture; physical iPhone/Android save/open proof and a separate implementation brief follow only if feasible. |
| New-album `downloads_enabled = true` | Backend default decision pending separately. Existing album settings remain unchanged. |
| Date-range filtering | No confirmed server-side Guest range-query contract. No date filter is claimed. |
| Global photo totals and remaining capacity | No appropriately authorized server fields for Gallery display. Loaded-page count is not presented as an album total. |
| H91 revoke server-side MFA | Existing contract/security dependency, outside this frontend batch. |
| Owner real-device UAT | H69 camera and H73/H74 Gallery/mobile behavior need physical review after independent code review and merge. Synthetic browser checks do not close Owner tickets. |
