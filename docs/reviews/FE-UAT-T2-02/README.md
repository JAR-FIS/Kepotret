# FE-UAT-T2-02 — Admin information UX engineering review

This is **synthetic engineering evidence**, not Owner approval. H77–H85 use the real frontend in the Playwright Owner Visual UAT browser with intercepted Admin API responses. The visible `OWNER VISUAL UAT · SYNTHETIC FIXTURES` badge identifies every screenshot. No Owner issue is marked SOLVED.

## Owner issue traceability

| Owner ticket | Recorded route | Actual surface | Engineering outcome |
|---|---|---|---|
| UAT-T2-09 | H78 | **H77 Dashboard** | **FRONTEND IMPLEMENTED** — Pending, Processing, and Failed use three labeled, icon-led, color-distinct tiles in one desktop row and stack on mobile. The original H78 mapping remains recorded here; the component is `AdminDashboard`. |
| UAT-T2-10 | H78 | Shared Admin shell | **FRONTEND IMPLEMENTED** — Light uses `logo.svg`; Dark uses `logo_white.svg` in desktop navigation and the mobile drawer. |
| UAT-T2-11 | H79 | User detail | **FRONTEND IMPLEMENTED** — the full intro can use the available desktop width and wraps naturally on narrow screens. |
| UAT-T2-12 | H79 | User detail | **FRONTEND IMPLEMENTED** — a localized guide explains owned albums, ordinary sessions, collaborator albums, suspend, revoke ordinary sessions, and reactivate without implying deletion, takeover, or Admin-session revocation. |
| UAT-T2-13 | H80 | Album operations | **PARTIAL** — a submit-driven server `query` search, clear/reset, cursor preservation, stale-response protection, and empty/error handling are implemented. The API does not document exact fields matched by `query`, so the UI does not promise event/Owner matching. Global creation-date sorting is **DEFERRED API**. |
| UAT-T2-14 | H81 | Album detail | **FRONTEND IMPLEMENTED** — readiness, capture schedule, quota, and Hold labels use the same small muted style as ID and Owner. |
| UAT-T2-15 | H81 | Album detail | **FRONTEND IMPLEMENTED** — a compact guide explains contextual links, lifecycle, transactions, and related issues. Sensitive media and Hold remain separate authorized/MFA workflows. |
| UAT-T2-16 | H82 | Payments | **FRONTEND IMPLEMENTED** — full authority copy uses available desktop width and wraps on mobile. |
| UAT-T2-17 | H82 | Payments | **DEFERRED API** — the cursor list has no search or global sort parameter; no one-page search/sort control was added. |
| UAT-T2-18 | H82 | Payments | **PARTIAL** — album ID and truthful payment creation/completion timestamps are shown. Event name and schedule are **DEFERRED API PROJECTION**. |
| UAT-T2-19 | H83 | Payment diagnosis | **FRONTEND IMPLEMENTED** — diagnostic field labels are consistently small and muted, while full values remain readable. |
| UAT-T2-20 | H83 | Payment diagnosis | **FRONTEND IMPLEMENTED** — localized guide explains snapshots, receipts, and provider re-check without implying manual payment success, entitlement, quota changes, or refunds. |
| UAT-T2-21 | H84 | Package catalog | **FRONTEND IMPLEMENTED** — responsive two-column desktop catalog (six items appear 3-left/3-right), one column mobile, variable counts and historical versions, API ordering and sale confirmation preserved. |
| UAT-T2-22 | H84 | Package catalog | **FRONTEND IMPLEMENTED** — internal package codes such as `LOCKED100` are absent from card headings and content; package/version IDs remain available for Admin diagnostics and API actions. |
| UAT-T2-23 | H85 | Create package version | **FRONTEND IMPLEMENTED** — original immutable-version/idempotency copy uses the available desktop width and wraps naturally. The price/quota form remains reserved for FE-UAT-T2-03. |

## Open in the Owner Visual UAT browser

Run `pnpm uat:visual` for desktop or `pnpm uat:visual:mobile` for mobile. After the visible browser pauses, paste these localhost URLs into **that browser window**. A regular browser or a `?uat=` parameter alone does not install synthetic API responses.

| Route | Synthetic URL | Review |
|---|---|---|
| H77 | [Dashboard](http://localhost:3000/admin?uat=normal) | Three payment tiles and shared logo |
| H78 | [Users](http://localhost:3000/admin/users?uat=normal) | Shared Admin logo |
| H79 | [User detail](http://localhost:3000/admin/users/55555555-5555-4555-8555-555555555555?uat=normal) | Intro, guide, confirmation |
| H80 | [Albums](http://localhost:3000/admin/albums?uat=normal) | Search `Wedding`, `owner@kepotret.test`, then a nonmatch; clear to reset. Fixture matching is synthetic and does not establish production search-field semantics. |
| H81 | [Album detail](http://localhost:3000/admin/albums/11111111-1111-4111-8111-111111111111?uat=hold) | Muted labels and guide |
| H82 | [Payments](http://localhost:3000/admin/payments?uat=normal) | Payment metadata, no event-date claim |
| H83 | [Payment diagnosis](http://localhost:3000/admin/payments/33333333-3333-4333-8333-333333333333?uat=normal) | Labels, guide, provider re-check confirmation |
| H84 | [Package catalog](http://localhost:3000/admin/catalog?uat=normal) | Six packages, sale state, no internal codes |
| H85 | [Create version](http://localhost:3000/admin/catalog/packages/88888888-8888-4888-8888-888888888888/versions/new?uat=normal) | Desktop intro and unchanged form |

Switch ID/EN and Light/Dark with the existing Admin controls. Screenshots below cover 1440px ID/Light and 390px EN/Dark; automated checks also cover 360, 768, and 1024px. The badge and all fixture data are synthetic.

| Surface | Desktop synthetic evidence | Mobile synthetic evidence |
|---|---|---|
| H77 | [ID Light](evidence/h77-desktop-1440-id-light.png) | [EN Dark](evidence/h77-mobile-390-en-dark.png) |
| H78 | [ID Light](evidence/h78-desktop-1440-id-light.png) | [EN Dark](evidence/h78-mobile-390-en-dark.png) |
| H79 | [ID Light](evidence/h79-desktop-1440-id-light.png) | [EN Dark](evidence/h79-mobile-390-en-dark.png) |
| H80 | [ID Light](evidence/h80-desktop-1440-id-light.png) | [EN Dark](evidence/h80-mobile-390-en-dark.png) |
| H81 | [ID Light](evidence/h81-desktop-1440-id-light.png) | [EN Dark](evidence/h81-mobile-390-en-dark.png) |
| H82 | [ID Light](evidence/h82-desktop-1440-id-light.png) | [EN Dark](evidence/h82-mobile-390-en-dark.png) |
| H83 | [ID Light](evidence/h83-desktop-1440-id-light.png) | [EN Dark](evidence/h83-mobile-390-en-dark.png) |
| H84 | [ID Light](evidence/h84-desktop-1440-id-light.png) | [EN Dark](evidence/h84-mobile-390-en-dark.png) |
| H85 | [ID Light](evidence/h85-desktop-1440-id-light.png) | [EN Dark](evidence/h85-mobile-390-en-dark.png) |

## Contract gaps for a later, separately approved backend phase

- `GetApiV1AdminAlbumsParams` exposes a max-120-character `query`, but the OpenAPI `AdminQuery` description does not identify searchable fields. Event-name/Owner-email matching must be documented and verified before claiming it in production. `AdminAlbumSummary` lacks `created_at`, and the list endpoint has no global `sort` parameter; creation-time ordering requires an authoritative server contract and cursor semantics.
- `GetApiV1AdminPaymentsParams` provides `cursor`, `limit`, `status`, and `type`, with no query or sort. Search by event name/album ID and global payment-time ordering require server-backed parameters and cursor rules.
- `PaymentTransaction` has `album_id`, `created_at`, `paid_at`, and `payment_cutoff_at`, but no event name or event schedule. Those fields require an approved Admin payment projection; this frontend does not perform per-row album fetches.

## Changes and regression boundary

Changed components: `dashboard.tsx`, `shell.tsx`, `users.tsx`, `albums.tsx`, `data.tsx`, and the narrow `AdminPage` description option in `common.tsx`; localized copy in `id.json`/`en.json`; focused Admin Vitest/Playwright tests; a query-aware **test-only** Owner fixture; this handoff and 18 screenshots.

The root causes were a two-column H77 status grid, a fixed Light logo in the shell, description max-width on long Admin intros, absent explanatory context, an unwired server album query, and raw internal package codes in H84 headings. No Admin login/MFA, authorization, CSRF, confirmation, server-owned status transition, package identifier, price/quota, backend, database, migration, or OpenAPI implementation changed. Existing Guest Owner UAT CI coverage remains in the workflow.

Local checks: `pnpm lint`, `pnpm typecheck`, `pnpm test` (277 passed), `pnpm api:check`, `pnpm build`, `pnpm uat:smoke` (2 passed), `pnpm e2e` (172 passed, 1 evidence-only skipped), and `git diff --check` passed. Focused Admin album Vitest passed 2/2; focused Admin Playwright passed 8/8 with retries disabled. The evidence capture run passed 1/1 and produced the 18 labeled screenshots above. Hosted CI is reported separately after PR creation. Owner Visual Recheck remains deferred until FE-UAT-T2-01 through T2-04 finish. Guest H69 real-device camera remains pending, D01 LIVE persistence is unsupported, and Backend remains **ON HOLD** until all Desktop/Mobile Owner Visual UAT phases finish and the Owner explicitly approves backend development.
