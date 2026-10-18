# FE-UAT-V3-01 engineering verification

This review packet records engineering work for UAT-016, UAT-194, UAT-134, UAT-195, UAT-142, and UAT-179. The screenshots under `evidence/` use synthetic UAT fixtures and do not demonstrate production catalog content or production payment verification.

## Issue traceability

| Group | Issue IDs | Surface | Root cause | Correction and regression evidence |
| --- | --- | --- | --- | --- |
| G1 | UAT-016, UAT-194 | H01 | The fourth guest step reused the crowded title `Motret & gunakan foto` in a narrow 9px phone overlay. | The approved Indonesian copy is now `Siap & Motret`; English uses `Ready to shoot`. The phone label has more inset, padding, contrast, and minimum height. E2E checks both locales, phone label overflow, and mobile/desktop screenshots. |
| G2 | UAT-134, UAT-195 | H27, H33, H49 | H33 displayed one vertical radio list and appended package codes. H27 and H49 also exposed internal codes. UAT catalog names themselves were synthetic `LOCKED` labels. H28 is Event Basics and contains no package selector. | H33 dynamically divides the entire radio group into a 3-left/4-right arrangement for seven choices and stacks on mobile. Synthetic names are human-readable; production catalog names, package IDs, prices, quota, and server eligibility remain authoritative. Codes are no longer displayed on H27/H33/H49. Regression checks retain `package_version_id` save payloads and all fixture price/quota pairs. |
| G3 | UAT-142 | H38 | Pending feedback was rendered only while a poll request was in flight, so the hourglass disappeared throughout the polling interval. In the Next.js development runtime, Strict Mode also replays the polling effect: a request from the cleaned-up effect could finish later and set shared `checking` state to false while its replacement request remained in flight. | Poll responses and their cleanup updates are now scoped to the active effect. A pending server status keeps the hourglass visible; the visible message distinguishes active checks from the waiting interval, while a stable localized screen-reader status avoids repeated announcements. SUCCESS, FAILURE, and EXPIRED remain server-driven terminal states. |
| G4 | UAT-179 | H56 | The recovery ZIP action was in a separate block below the lifecycle badge. | The lifecycle badge and authorized ZIP action now share a responsive header row: opposite sides from `sm` up, stacked with spacing on narrow mobile. Existing download icon and server capability checks remain intact. |

## Route mapping and dependencies

- The Owner's package-code observation on H28 does not match the current route map: H28 is Event Basics; H33 is Package Selection. The affected customer-facing package surfaces are H27 Album Overview, H33 Package Selection, and H49 Package Upgrade.
- Production package labels remain the API's `option.name`. If the production catalog supplies labels the Owner does not approve, that is a catalog/content dependency for Owner review; this change does not overwrite server data.
- All six Owner issue IDs remain open for Owner Visual Recheck. No Owner status was changed.
- Backend, database, migrations, OpenAPI, and D01 LIVE persistence remain unchanged. Backend remains ON HOLD pending completion of all Owner Visual UAT and explicit Owner approval.

## Synthetic visual evidence

The Playwright evidence test writes screenshots for H01, H33, H38, and H56 at desktop 1440px light/Indonesian, mobile 390px dark/English, and mobile 360px light/Indonesian. H33 and H56 screenshots include the full page; other captures show the relevant viewport.

Expected evidence files:

- `evidence/h01-desktop-1440-light-id.png`
- `evidence/h33-desktop-1440-light-id.png`
- `evidence/h38-desktop-1440-light-id.png`
- `evidence/h56-desktop-1440-light-id.png`
- `evidence/h01-mobile-390-dark-en.png`
- `evidence/h33-mobile-390-dark-en.png`
- `evidence/h38-mobile-390-dark-en.png`
- `evidence/h56-mobile-390-dark-en.png`
- `evidence/h01-mobile-360-light-id.png`
- `evidence/h33-mobile-360-light-id.png`
- `evidence/h38-mobile-360-light-id.png`
- `evidence/h56-mobile-360-light-id.png`

## Validation

| Check | Result |
| --- | --- |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| Focused Vitest regressions | Passed: 55 tests across 3 files |
| `pnpm test` | Passed: 39 files, 271 tests |
| `pnpm api:check` | Passed; generated client is fresh and no OpenAPI change was made |
| `pnpm build` | Passed; optimized build and 42/42 static pages generated. Default sandbox run hit a worker `EPERM`, then passed with approved runner permissions. |
| `pnpm uat:smoke` | Passed: 2 tests |
| `pnpm e2e` | Passed: 162 passed, 0 failed, 0 flaky retries across Chromium, Firefox, WebKit, and mobile projects |
| `git diff --check` | Pending |
| Hosted GitHub Actions | Not available yet: the branch is pushed, but PR creation returned GitHub API HTTP 403 (`Resource not accessible by integration`), so no PR-triggered runs exist. |

The full E2E run emitted non-failing development-server diagnostics for the synthetic UAT badge hydration mismatch, existing unmocked proxy requests to `localhost:8080` in unrelated scenarios, and Node color-variable warnings. No FE-UAT-V3-01 test failed or retried. The generated historical screenshots were restored; only this packet's evidence is retained.
