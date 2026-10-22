# FE-UAT V2-08C — engineering handoff

**Owner tickets:** UAT-FINAL-042 (H42), UAT-FINAL-006 (H06), UAT-FINAL-007 (H07)

**Baseline:** `main` at `f402e931f6d05b55a0f36a9801bcd0aef361d00b` (PR #41 merged)

**Branch:** `feat/fe-uat-v2-08c-host-gallery-legal`

**Pull request:** [#42 against `main`](https://github.com/JAR-FIS/Kepotret/pull/42)

**M1 review HEAD:** [current PR branch HEAD](https://github.com/JAR-FIS/Kepotret/commits/feat/fe-uat-v2-08c-host-gallery-legal) (the immutable SHA is recorded in PR #42 and its CI run after push).

**Status:** frontend implementation and synthetic verification; independent code review and Owner/legal approval pending. Backend remains **ON HOLD**. Do not merge before independent review.

## Ticket traceability

| Ticket | Routes and implementation | Result / review point |
|---|---|---|
| H42 Host Gallery | `/album/[albumId]/galeri`; `gallery-management.tsx`, `gallery-export-selection.tsx` | Guest-aligned grid/list and sort controls, Host moderation retained; selection is opt-in. Candidate IDs come only from the authorized Host export-selection endpoint. Server capability sets the per-job cap. Selected ZIP creates a server export job and routes to `/album/[albumId]/ekspor/[exportJobId]` on HTTP 201. Owner review of visual design and live backend entitlement remains. |
| H06 Privacy | `/kebijakan-privasi`; `legal-draft-content.ts`, `legal-draft-page.tsx` | All 11 draft sections in ID and EN, table of contents and links. Visible **draft, not effective** notice. Owner/legal approval is a release gate. |
| H07 Terms | `/syarat-ketentuan`; same shared legal rendering | All 12 draft sections in ID and EN, table of contents and links. Visible **draft, not effective** notice. Owner/legal approval is a release gate. |

## H42 behavior and boundaries

- Browsing initially shows no selection checkboxes or selected-photo summary. Grid/list and `NEWEST`/`OLDEST` remain visual and server-backed respectively. The moderation filter, 25-photo cursor pages, 240-photo local display cap, H43 photo detail, H44 Trash, and authorized moderation/share/individual download remain in place. The candidate checklist appears only in selection mode; moderation actions are hidden while selecting to avoid accidental changes.
- `can_export_zip` is independent of `can_moderate` and individual photo download. The actor must have Owner rights or the collaborator ZIP permission to enter selection mode. `ExportCapabilities.allow_selected` and the per-job cap are rechecked immediately before POST; the export POST is authoritative for current photo eligibility and selection size. Collaborators with moderation but no ZIP permission see a blocked control. The selected-photo cap comes from `max_photos_per_job`; Guest's separate 20-photo cap is untouched.
- The candidate projection contains ID, display name, and date, with no media URL. The checklist deliberately shows no borrowed thumbnail and never infers eligibility from management photo actions. Duplicate paged IDs are removed. Selected IDs originate from the authorized candidate endpoint; M1 removed the unbounded cursor rescan before POST. Sort/filter/refresh/mode exit clears selection; an album change remounts the selection state. Stale `409`/`422` and cap changes clear and reload selection. `401`/`403` stop the action; `429`/`5xx` show safe feedback without automatic POST retry.
- The request uses the generated typed client with CSRF and an intent-bound idempotency key. HTTP 201 routes to the returned job ID. H50/H51 continue to own job polling and authorized download. No client ZIP generation, raw-media fetching, or Guest ZIP claim was added. A live backend/Gateway entitlement and storage flow is still required for real-world verification.

## Legal approval gate

The supplied `LEGAL_CONTENT_DRAFT.md` is editorial source material, **not approved legal terms**. UI copy omits its placeholder entity/contact fields and its unverified exact H+30/backup 14-day retention values. The concept date is labeled as a draft version, never an effective date. The existing consent and acceptance flows were not changed; draft text must not be promoted to effective production terms without sign-off.

| Owner/legal decision | Status |
|---|---|
| Registered operator/controller identity, address, accountable contact | Unverified |
| Official privacy rights channel, identity checks, response process | Unverified |
| Processor/vendor inventory, hosting/storage/payment/monitoring/AI, processing regions and transfers | Unverified |
| Lawful basis and consent for account, guest session, photos of third parties and children | Legal review required |
| Data subject access, correction, deletion, withdrawal, content objections | Legal review required |
| Actual retention, permanent deletion and backup cleanup; H+30 and 14-day values | Verify against deployment |
| Media source/compression lifecycle and 700000-byte rule | Verify against deployment |
| D+1/D+3/D+5/D+7 only; no Live reveal | Locked product rule, preserved |
| Payment/refund exceptions and statutory consumer rights | Legal review required |
| Security/incident promises, contact and notification obligations | Verify against deployment |
| Bilingual legal equivalence, version history, notice plan and effective date | Owner/legal approval pending |

No legal compliance determination is made by this PR. Owner/legal must approve the final text and effective date before release as enforceable terms.

## Synthetic evidence

All screenshots have an **OWNER VISUAL UAT · SYNTHETIC FIXTURES** badge. They use intercepted API responses and are not proof of a running backend.

| State | Evidence |
|---|---|
| H42 desktop ID/light grid and list | [grid](evidence/h42-grid-desktop-1440-id-light.png), [list](evidence/h42-list-desktop-1440-id-light.png) |
| H42 desktop selection, cap, confirmation and job | [zero selected](evidence/h42-zero-selected-desktop-1440-id-light.png), [cap reached](evidence/h42-cap-selected-desktop-1440-id-light.png), [confirmation](evidence/h42-confirm-desktop-1440-id-light.png), [ready job](evidence/h42-export-job-ready-desktop-1440-id-light.png) |
| H42 disabled, empty, error, restricted | [capability disabled](evidence/h42-capability-disabled-desktop-1440-id-light.png), [empty](evidence/h42-empty-desktop-1440-id-light.png), [error](evidence/h42-error-desktop-1440-id-light.png), [collaborator restricted](evidence/h42-collaborator-restricted-desktop-1440-id-light.png) |
| H42 mobile EN/dark | [grid](evidence/h42-grid-mobile-390-en-dark.png), [list](evidence/h42-list-mobile-390-en-dark.png), [zero selected](evidence/h42-zero-selected-mobile-390-en-dark.png), [selected](evidence/h42-selected-mobile-390-en-dark.png) |
| H06 Privacy | [1440 ID/light](evidence/h06-desktop-1440-id-light.png), [390 EN/dark](evidence/h06-mobile-390-en-dark.png) |
| H07 Terms | [1440 ID/light](evidence/h07-desktop-1440-id-light.png), [390 EN/dark](evidence/h07-mobile-390-en-dark.png) |

Browser assertions also cover 320px horizontal overflow, keyboard accessible controls, legal anchors, SSR text visibility, and reduced-motion animation behavior. The H06/H07 pages reuse the existing `public-page-enter` CSS and `PublicPageFrame`.

## PR #42 independent review remediation M1

- Removed sequential candidate-page reads from `GalleryExportSelection.validateSelection()`. Export still rechecks server capabilities and cap, canonicalizes the selected endpoint IDs, obtains CSRF, and sends one idempotent `SELECTED` POST. The server rejects stale or invalid selections; the UI handles `401`, `403`, `409`, `422`, `429`, and server failures without an automatic second POST.
- Unit regression uses an album reporting 10,000 eligible photos with another candidate cursor and asserts one candidate GET, two capabilities GETs, and one POST. Another test checks duplicate IDs across loaded pages. A revoked permission test stops before POST.
- Focused Chromium Playwright with `--retries=0`: **34 passed** across H42/H43/H44/H50/H51. The large-album browser test confirms one candidate GET before POST despite a next cursor. Existing browser tests cover stale `409`/`422`, revoked `401`/`403`, changed cap, `429`/`503`, offline behavior, and no automatic POST retry.
- M1 local gates: `pnpm lint`, `pnpm typecheck`, `pnpm test` (**43 files / 301 tests**), `pnpm api:check`, and `pnpm build` all passed. The [PR #42 checks](https://github.com/JAR-FIS/Kepotret/pull/42/checks) identify the hosted CI run for the review HEAD.
- No visual change; the synthetic screenshots above remain the visual evidence. Backend, database, and OpenAPI remain unchanged.

## Validation

- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test` — 43 files / 300 tests passed. An initial parallel run exposed a pre-existing async assertion race in `workspace-shell-authorization.test.tsx`; it now waits for the access projection, and the complete rerun passed.
- `pnpm api:check` — passed; generated API client fresh, no contract change.
- `pnpm build` — passed, including `/kebijakan-privasi` and `/syarat-ketentuan` server routes.
- Focused Playwright `--project=chromium --retries=0` — **48 passed** across H42/H06/H07, H50/H51 export, Host management/sharing, and Guest Gallery. The expected local backend proxy (`localhost:8080`) was unavailable during some synthetic test requests; mocked browser assertions all passed.
- Hosted CI attempt 1 — [Frontend CI run 39830674119](https://github.com/JAR-FIS/Kepotret/actions/runs/39830674119) on `364edf23ce7ef46ebac4c416f2aac9517f30d83e`: `quality` passed (lint, typecheck, all unit tests, OpenAPI check, build); `e2e` passed (full Playwright matrix, Admin without retries, Guest Owner UAT desktop/mobile). The documentation-only update to record this result creates a subsequent HEAD; use PR #42 checks for that final SHA.

## Deferred dependencies

- Backend ON HOLD: no live Host export entitlement, job, authorized download, or Gateway verification in this synthetic frontend review.
- Guest selected 20-photo ZIP remains blocked pending Gateway/CORS, memory, device-save, and physical-device evidence. It was not implemented here.
- H80 global sort requires backend/OpenAPI support. Other V2-08 outstanding items and real camera/device checks remain outside PR C.
- H06/H07 must remain visibly draft and not effective until Owner/legal approval; production release is blocked by the checklist above.
