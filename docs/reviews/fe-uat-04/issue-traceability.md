# FE-UAT-04 issue traceability

Engineering implementation only. No Owner issue is marked SOLVED or approved; Owner Visual Recheck remains deferred until FE-UAT-05.

| Issue | Result | Evidence / note |
|---|---|---|
| UAT-098 | Inherited + regression verified | FE-UAT-01 icon-only Assistant and composer layout retained; shared design-system E2E covers desktop/mobile. |
| UAT-099 | Implemented | Host Create Album actions use full-rounded, bold styling. |
| UAT-100 | Rejected by Owner | Sidebar Create Album remains; no Logout replacement. |
| UAT-101 | Implemented | Album cards identify FREE or paid tier/capacity from authorized album detail and package catalog. |
| UAT-102 | Implemented | Localized full event date/time range and active-during-event Guest camera note. |
| UAT-103 | Implemented | Album ID appears on the same responsive line as its label and wraps safely. |
| UAT-104 | Inherited + regression verified | Host workspace now explicitly switches to `logo_white.svg` in Dark Mode; regression test added. |
| UAT-105 | Inherited + regression verified | FE-UAT-01 branded ID/ENG control retained; shared design-system E2E covers language preference. |
| UAT-106 | Inherited + regression verified | FE-UAT-01 Assistant composer layout retained; shared design-system E2E covers desktop/mobile. |
| UAT-107 | Implemented | Host Create Album actions use full-rounded, bold styling. |
| UAT-108 | Implemented | Album cards identify FREE or paid tier/capacity from authorized album detail and package catalog. |
| UAT-109 | Implemented | Localized full event date/time range and active-during-event Guest camera note. |
| UAT-110 | Implemented | Album ID appears on the same responsive line as its label and wraps safely. |
| UAT-111 | Inherited + regression verified | Host workspace now explicitly switches to `logo_white.svg` in Dark Mode; regression test added. |
| UAT-112 | Inherited + regression verified | FE-UAT-01 branded ID/ENG control retained; shared design-system E2E covers language preference. |
| UAT-113 | Inherited + regression verified | FE-UAT-01 Assistant composer layout retained; shared design-system E2E covers desktop/mobile. |
| UAT-114 | Inherited + regression verified | Host workspace now explicitly switches to `logo_white.svg` in Dark Mode; regression test added. |
| UAT-115 | Inherited + regression verified | FE-UAT-01 branded ID/ENG control retained; shared design-system E2E covers language preference. |
| UAT-116 | Implemented | IANA timezone autocomplete provides keyboard filtering/selection and Escape; final Temporal/server validation remains authoritative. |
| UAT-117 | Inherited + regression verified | FE-UAT-01 Assistant composer layout retained; shared design-system E2E covers desktop/mobile. |
| UAT-118 | Inherited + regression verified | Host workspace now explicitly switches to `logo_white.svg` in Dark Mode; regression test added. |
| UAT-119 | Inherited + regression verified | FE-UAT-01 branded ID/ENG control retained; shared design-system E2E covers language preference. |
| UAT-120 | Implemented | Localized event sentence includes full date and time range in the event timezone. |
| UAT-121 | Implemented | Continue Setup action uses full-rounded, bold styling. |
| UAT-122 | Implemented | Shared IANA timezone autocomplete is reused and disabled when the server locks timezone. |
| UAT-123 | Implemented | Save Event Information action uses full-rounded, bold styling. |
| UAT-124 | Implemented + data dependency | Event choices continue to use server `category_id`; deterministic synthetic tests include Olahraga, Meeting and Pesta. Production visibility depends on those values existing in the server-managed catalog. |
| UAT-125 | Implemented | Date min/max and same-day time minimum reflect event-zone bounds; Temporal and server validation remain authoritative, including cross-day schedules. |
| UAT-126 | Partially implemented | Calendar input keeps accessible native date-picker behavior, adds branded focus styling and prevents dates outside the valid range. Popup appearance remains browser/OS controlled. |
| UAT-127 | Partially implemented | Time input keeps accessible native time-picker behavior and applies same-day minimum time; cross-day clock values remain valid when the full instant is valid. Popup appearance remains browser/OS controlled. |
| UAT-128 | Implemented as preview; API dependency | LIVE is visible with the approved D+1 default and an explicit server-commit/privacy/moderation notice. Save is blocked before any request because the current contract accepts only D+1/D+3/D+5/D+7. No production LIVE behavior is claimed. |
| UAT-129 | Implemented | Save Schedule action uses full-rounded, bold styling. |
| UAT-130 | Rejected by Owner | No PIN confirmation field was added; there remains one PIN input. |
| UAT-131 | Implemented | Accessible eye toggle shows/hides the single PIN input; it is masked by default and the existing CSRF save flow clears the value after success. |
| UAT-132 | Implemented | Save Guest Limit action uses full-rounded, bold styling; existing limit/moderation rules remain intact. |
| UAT-133 | Implemented | Existing authorized private cover-upload sequence has expanded tests for valid upload/preview, file validation, network/offline, forbidden authorization and commit failures. |
| UAT-134 | Implemented + data dependency | Free option and all paid options returned by the server package catalog are displayed; no package IDs, prices or eligibility are fabricated. Missing catalog records remain a server data dependency. |
| UAT-135 | Implemented | Collaborator email input has a localized placeholder. |
| UAT-136 | Implemented | Localized WO/EO collaboration guidance explains assisting with album management/monitoring; permissions remain explicitly selected. |
| UAT-137 | Implemented + data dependency | Setup review shows Free 30 photos or the selected package's catalog name/quota instead of the opaque version ID. Missing catalog details are labeled unavailable. |
| UAT-138 | Implemented | Confirm Setup action uses full-rounded, bold styling; owner-only readiness/concurrency rules remain unchanged. |
| UAT-139 | Implemented | Payment cutoff includes localized “pukul/at” and authorized album IANA timezone (or explicit UTC fallback). |
| UAT-140 | Implemented | Checkout payment CTA uses full-rounded, bold styling; HTTPS, CSRF, idempotency and server cutoff behavior remain intact. |
| UAT-141 | Implemented | Payment creation timestamp includes localized “pukul/at” and authorized album IANA timezone (or explicit UTC fallback). |
| UAT-142 | Implemented | Muted server-checking text and accessible spinner appear only while a real status request is in flight; reduced-motion is respected. |
| UAT-143 | Implemented | Copy icon is inside the read-only URL control with clipboard fallback and feedback; duplicate external Copy action removed. |
| UAT-144 | Implemented | Authorized QR PDF download is at the bottom of the QR card; private delivery path is unchanged. |
| UAT-145 | Implemented | Rotate access link action is full-rounded and bold; confirmation, CSRF and permission checks remain. |
| UAT-146 | Implemented | Host/WO/EO guide navigation links to the Host configuration guide. |
| UAT-147 | Implemented | H40 now has a separate seven-step Guest tutorial covering QR/link, name/PIN, consent, browser camera-only capture, LIVE/delay visibility, moderation and event-end shutter closure. |

## Visual evidence

- H39 Host sharing and QR card: `h39-host-sharing-synthetic.png`
- H40 Guest tutorial: `h40-guest-tutorial-synthetic.png`

Screenshots use synthetic API fixtures and are engineering evidence, not Owner visual approval.

## Verification

- `pnpm lint` — pass
- `pnpm typecheck` — pass
- `pnpm test` — pass (33 files, 192 tests)
- `pnpm api:check` — pass; generated client fresh, OpenAPI unchanged
- `pnpm build` — pass
- `pnpm uat:smoke` — pass (2 tests)
- `pnpm e2e` — pass (112 tests across Chromium, Firefox, WebKit, Mobile Chromium and Mobile WebKit)
- Focused Host setup/payment/sharing Playwright tests — pass (18 tests); H39/H40 screenshot tests pass (2 tests)
- `git diff --check` — pass

## Remaining dependencies and risks

- LIVE publishing cannot be persisted until the backend/OpenAPI contract supports it; the frontend blocks unsupported saves.
- UAT-124 and package display rely on authoritative server catalog records. Synthetic test fixtures do not prove production catalog population.
- Native calendar/time popup rendering varies by browser/OS even though input bounds, focus styling and final timezone validation are covered.
- UAT-126/127's OS-rendered date/time popovers cannot be branded by CSS; replacing them with custom widgets would require additional interaction/accessibility review.
- Owner Visual Recheck is intentionally deferred until FE-UAT-05. No merge has been performed.
