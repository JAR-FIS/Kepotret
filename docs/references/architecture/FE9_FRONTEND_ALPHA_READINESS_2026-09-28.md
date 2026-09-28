# FE-9 frontend Alpha readiness

Recorded 2026-09-29 for `feat/fe9-integration-hardening`, based on `main` at `bc69dd1793715fb235090c34c3ceabab2cd1bed0`.

## Frontend implementation readiness

The frontend implementation is ready for review. The browser matrix uses mocked API responses and media devices; it is frontend contract and UI regression evidence, not a live provider integration result.

| Gate | Local evidence |
| --- | --- |
| Frozen dependencies | `pnpm install --frozen-lockfile` passed. |
| OpenAPI freshness | `pnpm api:check` passed; generated client is fresh. |
| Lint and types | `pnpm lint` and `pnpm typecheck` passed. |
| Unit and component tests | `pnpm test` passed: 121 tests in 21 files. |
| Production build | `pnpm build` passed with Next.js 16.3.6. |
| Full Chromium E2E | `pnpm exec playwright test` passed: 73 Chromium tests, including existing responsive, locale, theme, focus, reduced-motion, Host, Guest, commerce, export, collaborator, and Admin coverage. |
| Focused browser and device E2E | The same command passed 8 Firefox, 8 desktop WebKit, 8 Pixel 7 Chromium, and 8 iPhone 13 WebKit tests: 105 total. The focused tests cover public landing and ordinary auth, Host workspace, Guest join and mocked camera entry, revealed gallery, collaborator permission projection, Admin sign-in/workspace, and Admin Sensitive Access. |
| Critical release group | `pnpm e2e:critical` passed: 7 existing Chromium tests for album setup, Guest capture, gallery, server-authoritative payment status, ZIP export, collaborator invitation boundary, and Admin Sensitive Access. |
| GitHub CI | `.github/workflows/ci.yml` now runs the complete Playwright command after quality gates using only Chromium, Firefox, and WebKit browser installs. The PR check result is pending; no backend or provider secret is required. Failed runs upload Playwright report and test results. |

The focused projects run only `@cross-browser` cases; Chromium continues to run every E2E case. Existing primary mobile widths and desktop Host/Admin layout checks remain in the Chromium suite. Four workers bound CI browser concurrency.

## Performance safeguards

- The landing browser regression checks optimized `srcset` and `sizes`, the reserved hero aspect ratio, one hero photo preload, and lazy below-the-fold marketing images. No new runtime dependency or bundle tool was added.
- The Guest gallery requests 24 photos initially, fetches more only when requested, and caps retained thumbnails at 240. A deterministic 11-page component test verifies the cap and lazy thumbnail loading. Gallery media uses short-lived authorized delivery URLs; deliberate detail viewers load eagerly.

## Security and observability review

- Ordinary User, GuestSession, and AdminSession remain separate. The ordinary browser API barrel excludes Admin operations, and generated fetch clients use credentials for server-managed cookies. Admin mutations use dedicated Admin CSRF; ordinary mutations use ordinary CSRF. Browser tests cover the boundaries and the absence of Guest file-picker contribution.
- Collaborator and Guest invitation secrets are handled from URL fragments in memory and removed from the visible URL; they are not stored as auth credentials. Browser storage use found in the Host flow holds only idempotency keys and intent identity, not session tokens or photo bytes.
- Gallery and recovery media use server-provided short-lived descriptors. The payment UI displays server transaction status rather than trusting provider return parameters. The reviewed source has no `console.log` or `console.debug` calls carrying credentials, photo bytes, CSRF, payment secrets, or provider payloads.
- Sentry remains opt-in through `NEXT_PUBLIC_SENTRY_ENABLED` and `NEXT_PUBLIC_SENTRY_DSN`; tracing and restricted automatic data collection remain off. The sanitizer strips private fields and bytes. FE-9 added redaction and tests for MFA/TOTP/OTP codes and API keys, which were previously uncovered diagnostic classes.

## Full product Alpha exit

Full product Alpha exit remains dependent on an available backend and real integration environments. Required external validation includes Google OIDC, Midtrans Sandbox, backend API behavior, Media Gateway and R2 authorization/expiry, server-side sessions and CSRF, worker/background processing, and approved provider credentials and configuration. These are integration gates after those environments exist, not frontend implementation failures. No real external-provider validation is claimed here.
