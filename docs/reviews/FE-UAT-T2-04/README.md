# FE-UAT-T2-04 — Privileged Operations & Safe Errors

This is **synthetic engineering verification, not Owner approval**. No Owner issue is marked SOLVED. Owner Visual Recheck remains deferred until this batch passes independent review and merges.

## Owner issue traceability

| Issue | Finding and verified cause | Engineering disposition |
| --- | --- | --- |
| UAT-T2-35 | H91's shared `AdminPage` description used `max-w-3xl`, causing an early desktop wrap. | `wideDescription` uses the available desktop width; mobile text wraps naturally without overflow. |
| UAT-T2-36 | H91 had no bottom explanation. | A localized compact Info card explains exceptional purpose, prerequisites, grant scope, view-only limits, expiry/revocation, and separation from Hold. |
| UAT-T2-37 | H91 accepted ASCII digits in the baseline browser test, including a leading zero, but silently removed letters. The Owner UAT grant fixture had already expired. H91 also kept its revoke input disabled while an authorized media list request remained pending. | The input now has an associated 6–12 digit hint and accessible rejection feedback. The test-only grant expiry is relative to creation and the fixture enforces step-up, CSRF, media scope, and revoke transitions. Revoke input becomes available after grant creation without waiting for the media list. |
| UAT-T2-38 | H92 accepted ASCII digits in the baseline browser test but silently removed letters. Its synthetic Hold response did not match the contract's `active_hold` shape or persist transitions. | The same input guidance is used on H92. The test-only Hold fixture now returns the authoritative shape and updates creation/release state. |
| UAT-T2-39 | H92 had no bottom explanation. | A localized compact Info card explains containment, authority, affected capabilities, release limits, and separation from Sensitive Access. |
| UAT-T2-44 | H91/H92 had incomplete status handling, and Admin package-version errors displayed raw `HTTP xxx` fallback text. | Shared Admin status messages now cover network, expired, denied, stale, invalid, rate-limited, unavailable, and unknown failures in ID/EN. H91/H92 and the package-version/reconciliation surfaces use safe messages and ignore raw API `message` fields. |

## TOTP reproduction and security review

Before changes, the focused Chromium Owner fixture run typed six synthetic digits, including a leading zero, on both H91 and H92 and saw the full value in each controlled input. Filling letters produced an empty value with **no** indication. No focus-blocking overlay or disabled state was observed in that run. The fixed October 1 grant expiry was independently confirmed in `tests/uat/mock-api.ts`; at the current date, the UI timer would close an H91 workspace immediately after grant creation. The H92 fixture's `active` response and non-persistent mutations were source-confirmed contract mismatches. An expanded mobile WebKit regression then reproduced a second H91 input failure: the grant appeared while the media request was pending and the revoke TOTP was disabled or its value cleared. H91 now finishes the grant mutation before loading media, while invalidating late responses when the grant expires or closes. Post-change tests exercise desktop/mobile Chromium, Firefox, WebKit, and mobile WebKit with retries disabled.

Production still calls the generated step-up endpoint before grant creation and both Hold transitions, sends CSRF headers, and waits for the server result. The UI also requires a fresh step-up before H91 revoke. **Contract distinction:** OpenAPI requires Admin session and CSRF for revoke, but does not require MFA or an audit-reason request body. The extra frontend verification does not claim to change server enforcement or the endpoint contract. Failed step-up prevents the following UI mutation; a failed mutation is never shown as success. TOTP is cleared after a submission attempt and on route remount, and is not logged, stored, placed in a URL, or present in the screenshots.

H91 accepts only a future, album-matched, view-only grant response. Expiry, revoke, denied media, and stale in-flight media responses clear or cannot repopulate visible private media. H92 disables mutation until an authoritative Hold state is loaded and refreshes that state after a transition. Auth, authorization, session, server-owned permissions, CSRF, OpenAPI, backend, database, migrations, and locked product rules were not changed. Test-only synthetic fixtures remain under `tests/uat`.

## Error presentation audit

Inspected Admin auth and privileged components, shared `AdminError`/`AdminFeedback`, the Admin package-version and payment paths, the shared `ErrorState`, route error boundaries, and representative Guest/Host error components. No direct rendering of `Error.message` or API envelope `message` was found in those sources. The confirmed raw presentation was Admin package-version `HTTP {status}`; that path and the payment fallback now use the shared localized status mapping. H91/H92 previously collapsed caught failures to a generic network error and did not distinguish expired grants; they now preserve safe status semantics without rendering raw response fields. Guest/Host error components already use localized fixed copy and were not rewritten.

| Failure | Example Indonesian guidance | English equivalent |
| --- | --- | --- |
| 401 step-up | Verifikasi belum berhasil; periksa kode atau sesi; tindakan belum dijalankan. | Verification did not succeed; check the code or session; no action ran. |
| 403 / 404 | Akses tidak tersedia / data tidak ditemukan; periksa izin atau album. | Access unavailable / record not found; check access or album. |
| 409 / 410 | Muat ulang status / akses berakhir atau dicabut. | Refresh stale state / access ended or revoked. |
| 400 / 422 | Periksa kembali isian. | Review the fields. |
| 429 / 503 | Tunggu sebelum mengulang / layanan tidak tersedia. | Wait before retrying / service unavailable. |
| Network / unknown | Periksa koneksi dan status terbaru sebelum mengulang. | Check the connection and latest state before retrying. |

The Admin operational issue and payment diagnostic screens still display structured server-provided diagnostic fields such as `error_code` and `process_result`. These are contracted Admin data fields, not raw API error envelopes. Their content policy remains a server-side dependency while Backend is ON HOLD; the frontend continues to render them as escaped text. This is an unresolved content-safety risk if the server puts sensitive details into those fields.

## Owner UAT routes and synthetic evidence

Start `pnpm uat:visual` for desktop or `pnpm uat:visual:mobile` for mobile, then open these URLs **inside the Playwright Owner UAT browser**. `?uat=normal` in an ordinary browser does not install a synthetic Admin session.

- [H91 Sensitive Access](http://localhost:3000/admin/albums/11111111-1111-4111-8111-111111111111/sensitive-access?uat=normal)
- [H92 Operational Hold](http://localhost:3000/admin/albums/11111111-1111-4111-8111-111111111111/hold?uat=normal)

All captures show the synthetic badge and **empty TOTP fields**:

| Surface | ID / Light / desktop 1440px | EN / Dark / mobile 390px |
| --- | --- | --- |
| H91 | [Screenshot](evidence/h91-desktop-1440-id-light.png) | [Screenshot](evidence/h91-mobile-390-en-dark.png) |
| H92 | [Screenshot](evidence/h92-desktop-1440-id-light.png) | [Screenshot](evidence/h92-mobile-390-en-dark.png) |

The [H91 safe rate-limit error](evidence/h91-safe-error-mobile-390-en-dark.png) shows an EN/Dark mobile failure after the code has been cleared. The Info cards are visible in each page capture.

## Verification

Local checks: `pnpm lint`, `pnpm typecheck`, `pnpm test` (281/281), `pnpm api:check`, `pnpm build`, and `pnpm uat:smoke` (2/2) passed. Focused H91/H92 Playwright across configured desktop/mobile projects passed 28 tests with `--retries=0`; one evidence-only screenshot test was skipped by its normal guard. The screenshot capture test passed separately and produced five images. Guest Owner UAT passed 36/36 with `--retries=0`. The final full E2E run passed 205 tests with three evidence-oriented skips and no reported flaky tests. Hosted results are tracked in the PR checks and reported at Phase A completion.

Open dependencies: D01 LIVE gallery persistence is unsupported; H69 real-device camera UAT remains pending. Backend is ON HOLD. The contract's H91 revoke endpoint cannot record a new revoke reason or guarantee server-side MFA enforcement without separately approved backend/API work. **Synthetic engineering verified ≠ Owner Approved.**
