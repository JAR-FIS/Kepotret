# FE-UAT-T2-V2-06 — Owner Recheck #2 remediation

Baseline: `main` at `acc71625ad90c6ff77d2497a854b148762d0de79`. Branch: `fix/fe-uat-t2-v2-06-owner-recheck2-remediation`. Owner status remains **recheck pending**. Backend remains **ON HOLD**. This is frontend work using deterministic synthetic UAT fixtures; screenshots do not establish live backend readiness or Owner approval.

## Ticket traceability

| Ticket | Route | Remediation and verification | Evidence |
| --- | --- | --- | --- |
| T2-01 / H70 Photo Review | `/j/[linkId]` | The existing `AuthPageFrame` already places the logo at top left, ID/EN and theme controls at top right, review card below, and Home link underneath. A real synthetic camera capture now verifies that state and the reservation lifecycle; capture, retake, upload, and failure behavior remain unchanged. | [Desktop review](evidence/synthetic-h70-review-desktop-1440-id-light.png), [mobile review](evidence/synthetic-h70-review-mobile-390-en-dark.png), [capture entry](evidence/synthetic-capture-ready-desktop-1440-id-light.png) |
| T2-05 / H73 Gallery | `/j/[linkId]/galeri`, `/help/guest` | Branded sort menu, selected-photo controls with a 20-photo maximum, count of loaded photos, fresh server-provided remaining slots, public localized Guest Guide, and capture action only when current server readiness and Guest event state both authorize it. ZIP remains disabled with an explanation. | [Desktop](evidence/synthetic-h73-gallery-desktop-1440-id-light.png), [sort open](evidence/synthetic-h73-sort-open-desktop-1440-id-light.png), [mobile](evidence/synthetic-h73-gallery-mobile-390-en-dark.png), [Guide desktop](evidence/synthetic-guest-guide-desktop-1440-id-light.png), [Guide mobile](evidence/synthetic-guest-guide-mobile-390-en-dark.png) |
| T2-13 / H80 Albums Operations | `/admin/albums` | Preserved the existing compact server-search layout, first-page clear behavior, and muted sort cues. Sort icons are inert spans, absent from keyboard focus, with visible copy explaining that cross-page sorting awaits the API. | [Desktop](evidence/synthetic-h80-desktop-1440-id-light.png), [mobile](evidence/synthetic-h80-mobile-390-en-dark.png) |
| T2-21 / H84 Package Catalog | `/admin/catalog` | Matching compact action dimensions and alignment, retirement color `#ff8282`, and body-colored new-version text. Existing confirmation, sale permissions, CSRF, and version behavior remain. | [Desktop](evidence/synthetic-h84-desktop-1440-id-light.png), [mobile](evidence/synthetic-h84-mobile-390-en-dark.png) |
| T2-28 / H86 Configuration | `/admin/config` | Shared branded select, aligned form and details, 44 px options. Contract type parsing, allowed values, version conflict handling, CSRF, and locked settings remain. | [Desktop](evidence/synthetic-h86-desktop-1440-id-light.png), [dropdown](evidence/synthetic-h86-dropdown-desktop-1440-id-light.png), [mobile](evidence/synthetic-h86-mobile-390-en-dark.png) |
| T2-30 / H87 Operational Issues | `/admin/issues` | Shared branded Status select with the existing Apply action, server filter, cursor reset/pagination, and issue actions. | [Desktop](evidence/synthetic-h87-desktop-1440-id-light.png), [dropdown](evidence/synthetic-h87-dropdown-desktop-1440-id-light.png), [mobile](evidence/synthetic-h87-mobile-390-en-dark.png) |

## Boundaries and backend dependencies

- H73 ZIP download is intentionally unavailable. Gateway/CORS access, per-photo media permission, file integrity, and device save feasibility must be verified before enabling it. The UI enforces the approved 20-photo selection maximum without claiming a working ZIP.
- H73 displays only loaded photo count. Remaining album slots appear only when the existing capture-readiness API returns an authoritative count while online and fresh. No album capacity total is inferred. A revealed Gallery does not present a capture action when the event is closed, even if an inconsistent readiness response says READY. Capture continues through the existing Guest entry flow where authorized.
- H80 server-wide sorting is pending backend/OpenAPI support. The cues do not invoke an action or receive keyboard focus; no local-page sort is presented as global sorting.
- No database, OpenAPI, backend, authentication, authorization, permission, or locked business rule was changed.

## Validation

- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm api:check` — passed; generated client current.
- `pnpm test` — 42 files, 290 tests passed.
- Focused Chromium regressions across H70/H73/H80/H84/H86/H87 and Guest Guide — 46 passed, 2 skipped.
- Synthetic V2-06 desktop/mobile capture run — 5 passed.
- Guest Owner UAT desktop/mobile capture, retake, upload, reveal, and Gallery lifecycle — 40 passed.
- `pnpm build` — passed, including the public `/help/guest` route.
- Hosted CI matrix: pending PR result.

Screenshots were captured with `UAT_CAPTURE_EVIDENCE=1`, deterministic synthetic fixtures, and a visible synthetic-data badge. The prior H80 screenshots were preserved.
