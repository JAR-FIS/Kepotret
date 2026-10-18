# FE-UAT-V2-04 engineering evidence

This review package contains synthetic browser evidence for the approved frontend corrections. Screenshots use deterministic UAT fixtures and do not represent production data or production integration verification. Owner UAT issue statuses remain unchanged.

## Issue traceability

| Surface | Correction and verification | Evidence |
| --- | --- | --- |
| H38 — Payment status | Replaced the generic spinning loader in the initial server-verification state with a static hourglass indicator. Provider return query parameters still do not determine payment state or entitlement; the server response remains authoritative. Unit and existing H38 E2E coverage verify PENDING/SUCCESS/FAILURE/EXPIRED and authorization behavior. | [Desktop ID](evidence/h38-desktop-1440-light-id.png), [mobile EN dark](evidence/h38-mobile-390-dark-en.png) |
| H39 — Album sharing | Added a refresh icon to the explicit reload action. Refresh continues to load sharing details; a browser regression verifies it does not call access-link rotation. Existing rotation confirmation, CSRF, QR and PDF behavior remains covered. | [Desktop ID](evidence/h39-desktop-1440-light-id.png), [mobile EN dark](evidence/h39-mobile-390-dark-en.png) |
| H41 — Album overview actions | Added recognizable icons to the gallery, sharing, and export actions while retaining their existing server permission gates. | [Desktop ID](evidence/h41-desktop-1440-light-id.png), [mobile EN dark](evidence/h41-mobile-390-dark-en.png) |
| H43 — Photo detail | Reduced the detail card and image maximum dimensions to keep the photo focused and contained on wide and narrow screens. | [Desktop 1440](evidence/h43-desktop-1440-light-id.png), [desktop 1920](evidence/h43-desktop-1920-light-id.png), [mobile ID](evidence/h43-mobile-360-light-id.png), [mobile EN dark](evidence/h43-mobile-390-dark-en.png) |
| H47 — Payment history | Added compact, localized, icon-supported badges mapped directly to the server transaction status. Unknown runtime states stay neutral and never imply success. Unit tests cover all four supported states and HTTP 401/403 handling for the history view. | [Desktop ID](evidence/h47-desktop-1440-light-id.png), [mobile EN dark](evidence/h47-mobile-390-dark-en.png) |
| H48 — Payment detail | Uses the same server-state badge and localized status labels as H47. Unit tests cover all supported states and HTTP 401/403 handling for the detail view. | [Desktop ID](evidence/h48-desktop-1440-light-id.png), [mobile EN dark](evidence/h48-mobile-390-dark-en.png) |
| H49 — Package options | Presents published package catalog data for comparison while allowing checkout only for package versions returned in the album-specific server eligibility response, with `can_create_checkout` true and no active checkout. Catalog errors do not block authorized choices; cutoff and active-checkout restrictions are tested. | [Desktop ID](evidence/h49-desktop-1440-light-id.png), [mobile EN dark](evidence/h49-mobile-390-dark-en.png) |
| H54 — Retention | Presents server-projected retention milestones in a semantic table with localized dates and timezone, explicit headers, and keyboard-accessible horizontal scrolling on narrow screens. Lifecycle permissions and cleanup-only behavior remain server-driven. | [Desktop ID](evidence/h54-desktop-1440-light-id.png), [mobile ID](evidence/h54-mobile-360-light-id.png), [mobile EN dark](evidence/h54-mobile-390-dark-en.png) |
| H55 — Recovery | Uses the same accessible lifecycle table, including the server-issued recovery grant timestamp when present. Recovery links remain gated by server capabilities. | [Desktop ID](evidence/h55-desktop-1440-light-id.png), [mobile ID](evidence/h55-mobile-360-light-id.png), [mobile EN dark](evidence/h55-mobile-390-dark-en.png) |
| H56 — Recovery media | Separates recovery ZIP actions from the lifecycle summary and adds a download icon to the media action. ZIP and media controls remain gated by server capability and media authorization; failure coverage includes HTTP 401/403/410. | [Desktop ID](evidence/h56-desktop-1440-light-id.png), [mobile EN dark](evidence/h56-mobile-390-dark-en.png) |
| H62 — Collaborator overview | Shows the actual photo capacity exposed by the collaborator-authorized live overview and states that package details are unavailable to collaborators. It does not fetch the Owner-facing package catalog or expose unauthorized ZIP actions. | [Desktop ID](evidence/h62-desktop-1440-light-id.png), [mobile EN dark](evidence/h62-mobile-390-dark-en.png) |

## Dependencies and limits

- The collaborator live-overview API exposes authoritative photo capacity but no package name, package code, or package entitlement detail. H62 therefore displays the capacity and an unavailable-details message; adding those fields requires an approved API/backend change, which is outside this frontend task.
- UAT-133 is closed for frontend correction. These synthetic captures do not verify production cover-image integration.
- Backend work remains on hold. No backend, database, migration, or OpenAPI changes are included.
- Owner Visual Recheck remains deferred until FE-UAT-V2-04 is engineering-verified and merged. This PR does not mark any Owner issue solved.

## Reproduction

The evidence is captured by `tests/e2e/fe-uat-v2-04.spec.ts` using the existing synthetic API fixtures. It covers Indonesian and English, light and dark themes, 1440/1920 desktop widths, and 360/390 mobile widths, and asserts no horizontal page overflow.
