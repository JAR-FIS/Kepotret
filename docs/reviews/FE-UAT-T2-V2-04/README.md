# FE-UAT-T2-V2-04 — Superadmin clarity and layout

## Baseline and Owner status

The clean baseline was `main` at merged PR #35 squash commit `07bea2906349a03599abd48191a6acc798ae7625`. Work is on `fix/fe-uat-t2-v2-04-superadmin-clarity-layout`; the final HEAD SHA is reported with the PR because embedding a commit's own SHA in that commit is circular. The Owner's 45-ticket Tahap 2 Recheck V2 workbook and handoff were read without changing Owner results. All six issues below remain **REOPENED / OWNER RECHECK PENDING**. Earlier approved tickets were not reopened.

The links below are local synthetic Owner UAT routes. They require the development UAT interceptor and do not prove live Gateway, real Admin permission, or physical-device behavior.

| Owner issue / route | Verified before | Implemented now | State and comparison evidence |
| --- | --- | --- | --- |
| UAT-T2-13 / H80 — [Albums](http://localhost:3000/admin/albums?uat=normal) | Search lived in a separate card above the All Albums table; server `query` and cursor already worked. | Search, Clear, hint, table and pagination share one card. Search accepts Enter; rapid queries still discard stale responses; offline and denied states remain safe. | **UI IMPLEMENTED; sorting PARTIAL / API DEPENDENCY; OWNER RECHECK PENDING.** [Before desktop](../FE-UAT-T2-02/evidence/h80-desktop-1440-id-light.png), [after desktop](evidence/synthetic-h80-desktop-1440-id-light.png), [before mobile](../FE-UAT-T2-02/evidence/h80-mobile-390-en-dark.png), [after mobile](evidence/synthetic-h80-mobile-390-en-dark.png). |
| UAT-T2-21 / H84 — [Package catalog](http://localhost:3000/admin/catalog?uat=normal) | Retire was inside each version; New Version sat at the package card bottom. | The active version's Retire and the single New Version link sit adjacent at equal desktop widths, and stack on mobile. Each version's sale action still carries its own version ID. | **UI IMPLEMENTED; OWNER RECHECK PENDING.** [Before desktop](../FE-UAT-T2-02/evidence/h84-desktop-1440-id-light.png), [after desktop](evidence/synthetic-h84-desktop-1440-id-light.png), [before mobile](../FE-UAT-T2-02/evidence/h84-mobile-390-en-dark.png), [after mobile](evidence/synthetic-h84-mobile-390-en-dark.png). |
| UAT-T2-28 / H86 — [Configuration](http://localhost:3000/admin/config?uat=normal) | Raw `BOOLEAN` and `true`/`false` were prominent, and edit controls sat unevenly below metadata. | Top-aligned two-column card, styled select, localized Yes/No choices, plain guidance, read-only reason and collapsed technical details. Server display name and description remain authoritative. | **UI IMPLEMENTED; OWNER RECHECK PENDING.** [Before desktop](../FE-UAT-T2-03/evidence/h86-desktop-1440-id-light.png), [after desktop](evidence/synthetic-h86-desktop-1440-id-light.png), [before mobile](../FE-UAT-T2-03/evidence/h86-mobile-390-en-dark.png), [after mobile](evidence/synthetic-h86-mobile-390-en-dark.png). |
| UAT-T2-29 / H87 — [Issues](http://localhost:3000/admin/issues?uat=normal) | The list exposed raw severity, issue type, code and ID; the page purpose was unclear. | Plain purpose/impact guidance, known-value status/severity/type labels, safe summary fallback and a styled native status select. Other contract-valid issue types use a neutral primary label; their validated identifiers remain available in H88 technical details. Filter and cursor remain server-owned. | **UI IMPLEMENTED; OWNER RECHECK PENDING.** [Before desktop](../FE-UAT-T2-03/evidence/h87-desktop-1440-id-light.png), [after desktop](evidence/synthetic-h87-desktop-1440-id-light.png), [before mobile](../FE-UAT-T2-03/evidence/h87-mobile-390-en-dark.png), [after mobile](evidence/synthetic-h87-mobile-390-en-dark.png). |
| UAT-T2-30 / H87 — [Issues](http://localhost:3000/admin/issues?uat=normal) | The status guide did not make the action's impact clear enough to the Owner. | Guidance explains that acknowledging records operator review and closing records a reason, while neither automatically fixes the cause. Unknown values get neutral labels. | **UI IMPLEMENTED; OWNER RECHECK PENDING.** Same H87 before/after evidence and filter tests as above. |
| UAT-T2-32 / H88 — [Issue detail](http://localhost:3000/admin/issues/77777777-7777-4777-8777-777777777777?uat=normal) | The resolution label/form began lower than the triage heading. | Matching top-aligned headings and helpers, a labeled reason field, responsive stacking, plain action consequences and collapsed codes. | **UI IMPLEMENTED; OWNER RECHECK PENDING.** [Before desktop](../FE-UAT-T2-03/evidence/h88-desktop-1440-id-light.png), [after desktop](evidence/synthetic-h88-desktop-1440-id-light.png), [before mobile](../FE-UAT-T2-03/evidence/h88-mobile-390-en-dark.png), [after mobile](evidence/synthetic-h88-mobile-390-en-dark.png). |

**H80 sorting is PENDING API.** The approved `GET /api/v1/admin/albums` contract has no sort or authoritative cross-page date-order parameter. Sorting one loaded page would misrepresent the full album list. This batch sends no invented sort parameter and does not claim the Owner's full H80 ticket is solved. Server contract and implementation need separate approval.

## Changed files and data flow

- `src/features/admin/albums.tsx`: one table/search card and offline-safe query controls; existing server query, 25-row cursor, request sequence, retry and access handling remain.
- `src/features/admin/data.tsx`: package action layout and version-specific labels; typed configuration validation; plain and safe issue labels/guidance; aligned detail form. Package availability PATCH, configuration PATCH, issue status POST and response authority remain on their generated clients.
- `src/messages/id.json`, `src/messages/en.json`: localized, operator-facing text for the affected routes.
- `tests/uat/mock-api.ts`: clearer **synthetic** configuration descriptions only; production data and API are untouched.
- `tests/e2e/admin-information-ux.spec.ts`, `tests/e2e/admin-configuration-guidance.spec.ts`, `tests/e2e/admin-superadmin-clarity.spec.ts`: server payload, safety, interaction, layout and responsive checks. The ten `evidence/synthetic-*.png` files were captured with the fixture badge visible.

Screenshots cover ID/Light desktop at 1440 px and EN/Dark mobile at 390 px; browser assertions also cover 320 and 1280 px, keyboard interaction and lack of horizontal overflow. The mobile support widget overlaps a small portion of underlying content in the existing shell; Owner physical-device visual recheck should assess that separately.

## Independent review follow-up on PR #36

The independent review of `d27715068a7e253dca889f1b6f448c0d3a3528db` requested one Medium correction (M1). OpenAPI declares `OperationalIssue.issue_type` as an unconstrained string. The original fallback concealed valid categories such as the explicitly hypothetical `PAYMENT_RECONCILIATION` and `MEDIA_DELIVERY`. The primary UI now says “Jenis masalah lain” / “Other issue type” for types without an approved mapping. H88's collapsed technical details show the exact identifier only when it matches the existing bounded uppercase identifier policy; malformed or suspicious strings render a neutral dash. Focused tests cover two distinct valid identifiers, a malicious multiline value, ID/EN copy and unchanged status guards. No new backend enum or guessed business meaning was added.

## Security and contract review

- Admin session and route authorization remain server-owned. The client does not create a permission, UAT bypass or success state. H84 sale actions retain confirmation, availability checks and CSRF, and the historical-version test verifies the exact target ID.
- H86 sends the original `expected_version` and correctly typed boolean, number or string; client validation follows server `allowed_values` and min/max. Inconsistent server choice types show a read-only explanation rather than an empty editor. Locked configs remain non-editable. A 409 reloads server state for review. CSRF remains mandatory.
- H87 filter and cursor are sent to the server; no loaded-page pseudo-filtering. H88 retains the required reason, 500-character maximum, confirmation, CSRF and server-owned issue states. Unknown issue statuses disable mutations.
- Known issue values are mapped to plain ID/EN labels. Suspicious issue summaries fall back to neutral text; raw internal exception/code details are not used as the primary UI. Operational IDs/codes and validated `issue_type` identifiers remain in a collapsed area for authorized Admin investigation. API error bodies are not printed.
- No backend, database, migration, OpenAPI, generated client, dependency, authentication, MFA, CSRF or business rule was changed. Backend remains **ON HOLD**. The H91 revoke server-side MFA contract dependency remains for future backend/security review.

## Validation

| Check | Result |
| --- | --- |
| `pnpm lint`; `pnpm typecheck`; `pnpm api:check`; `pnpm build`; `git diff --check` | Passed. |
| `pnpm test` | 42 files, 286 tests passed after restoring rapid search submission. The first run caught that regression and was remediated. |
| `playwright test tests/e2e/admin-information-ux.spec.ts tests/e2e/admin-configuration-guidance.spec.ts tests/e2e/admin-superadmin-clarity.spec.ts tests/e2e/admin-privileged.spec.ts tests/e2e/admin-privileged-uat.spec.ts --project=chromium --retries=0` | 41 passed, 4 evidence-capture-only tests skipped; no retry passes. |
| `UAT_CAPTURE_EVIDENCE=1 playwright test tests/e2e/admin-superadmin-clarity.spec.ts --grep 'synthetic H80' --project=chromium --retries=0` | 1 passed; ten current screenshots captured. |
| `playwright test --retries=0` | 239 passed, 4 evidence-capture-only tests skipped across Chromium, Firefox, WebKit, mobile Chromium and mobile WebKit; no retry passes reported. |
| `pnpm uat:smoke` | 2 passed against synthetic fixtures. |
| Final narrow H86 choice guard: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `git diff --check`; `playwright test tests/e2e/admin-configuration-guidance.spec.ts --project=chromium --retries=0` | Quality passed, 286 unit passed; focused Chromium 16 passed/1 evidence case skipped. This guard was added after the local full Playwright run; hosted full E2E must validate the final PR HEAD. |
| M1 follow-up: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm api:check`, `pnpm build`, `git diff --check`; `playwright test tests/e2e/admin-configuration-guidance.spec.ts tests/e2e/admin-privileged.spec.ts tests/e2e/admin-privileged-uat.spec.ts --project=chromium --retries=0` | Quality passed, 286 unit passed; focused Chromium 33 passed/2 evidence-only skipped, no retry passes. Valid, distinct issue types and a malicious multiline value executed. |
| [Hosted CI on reviewed prior HEAD `d277150`](https://github.com/JAR-FIS/Kepotret/actions/runs/39530437986) | Quality passed; full E2E 239 passed, 4 skipped, 1 retry-passing mobile WebKit H29/H53 schedule-picker case; privileged Admin 28 passed/1 skipped; Guest Owner UAT 40 passed. M1's new HEAD requires its own hosted checks before re-review. |
| Hosted CI on final M1 HEAD | Pending push and checks. See PR #36 Checks and the Phase A completion report for the final SHA, run URL, retries and skips. |

## Owner recheck and remaining dependencies

1. Recheck H80 search placement, keyboard query/clear, denied/empty/offline states and cursor continuity. Decide separately how to approve authoritative sorting support; do not mark H80 SOLVED while sorting is absent.
2. Recheck H84 action placement/colors at six and odd package counts, multiple versions, confirmation, disabled/offline and permission errors.
3. Recheck H86 card alignment, Yes/No/typed values, locked cards and conflict/retry guidance in both languages and themes.
4. Recheck H87 purpose, filters/status labels and H88 desktop alignment/mobile stacking, reason and confirmation.
5. Keep all six Owner tickets **REOPENED** pending independent review, merge and later Owner Visual Recheck. `INITIAL_PURCHASE` wording, four Help/Footer tickets, Guest ZIP feasibility, new-album download default, H69 physical-camera QA and H91 revoke MFA are separate follow-ups.
