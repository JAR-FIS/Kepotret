# Kepotret Frontend Final Traceability

Baseline: `513131a3fd89d77dfbca6a7c177b382ab3a65aaf` (`test(frontend): complete FE-9 integration hardening (#14)`).

This is a source mapping of the checkpoint 8.1 Pages Registry to the frontend at this remediation branch. `IMPLEMENTED` means a route/component exists; it does not claim live backend integration. `STATE-DRIVEN` and `SHARED ROUTE` identify inventory pages represented by a state or role variant. `SYSTEM BOUNDARY` identifies browser/framework or external service behavior. `NOT IMPLEMENTED` is an unresolved inventory surface.

## H01–H92

| ID | Inventory surface | Implementation route / component / state | Status |
|---|---|---|---|
| H01 | Landing Page | `/`; `H01Page`, `SiteFooter`, shared `Assistant` | IMPLEMENTED |
| H02 | How Kepotret Works | `/cara-kerja`; public info page | IMPLEMENTED |
| H03 | Packages & Pricing | `/harga`; pricing selector and catalog projection | IMPLEMENTED |
| H04 | FAQ | `/faq`; public info page | IMPLEMENTED |
| H05 | Help & Contact | `/bantuan`; contact unavailable until Owner provides official details | STATE-DRIVEN |
| H06 | Privacy Policy | `/kebijakan-privasi` | IMPLEMENTED |
| H07 | Terms of Service | `/syarat-ketentuan` | IMPLEMENTED |
| H08 | Security & Privacy Overview | `/keamanan` | IMPLEMENTED |
| H09 | 404 — Page Not Found | Next.js not-found boundary | SYSTEM BOUNDARY |
| H10 | 403 — Access Denied | `/akses-ditolak` and feature-level forbidden states | SHARED ROUTE |
| H11 | 500 — Internal Error | `src/app/error.tsx`, `src/app/global-error.tsx` | SYSTEM BOUNDARY |
| H12 | 503 — Maintenance / Service Unavailable | `/maintenance`; API degraded states | SHARED ROUTE |
| H13 | Browser & Device Compatibility Help | `/kompatibilitas` | IMPLEMENTED |
| H14 | User Sign-In | `/masuk` | IMPLEMENTED |
| H15 | Google OAuth Processing | `/auth/google/memproses` | IMPLEMENTED |
| H16 | Google Sign-In Failed | `/masuk/gagal` | IMPLEMENTED |
| H17 | Collaborator Invitation Landing | `/undangan/kolaborator/[invitationId]` | IMPLEMENTED |
| H18 | Invitation Invalid / Expired / Used | `/undangan/kolaborator/tidak-valid`; invitation terminal state | STATE-DRIVEN |
| H19 | Account / Profile | `/akun` | IMPLEMENTED |
| H20 | Superadmin Login | `/admin/masuk` | IMPLEMENTED |
| H21 | Superadmin MFA Verification | `/admin/mfa` | IMPLEMENTED |
| H22 | Superadmin Access Locked / Denied | `/admin/akses-ditolak` | IMPLEMENTED |
| H23 | Session Re-authentication | `/masuk-ulang`; shared reauthentication states in protected feature components | SHARED ROUTE |
| H24 | Host Dashboard | `/dashboard`; `AlbumIndex` dashboard mode | IMPLEMENTED |
| H25 | My Albums | `/album`; Owner-filtered album index | IMPLEMENTED |
| H26 | Create Album | `/album/baru` | IMPLEMENTED |
| H27 | Album Workspace Overview | `/album/[albumId]`; `AlbumOverview` when not live | STATE-DRIVEN |
| H28 | Setup — Event Basics | `/album/[albumId]/setup/acara`; `EventBasics` | SHARED ROUTE |
| H29 | Setup — Schedule & Reveal | `/album/[albumId]/setup/jadwal`; `ScheduleSetup` | SHARED ROUTE |
| H30 | Setup — Guest Access & Privacy | `/album/[albumId]/setup/akses`; `AccessPinForm` | SHARED ROUTE |
| H31 | Setup — Guest Limit & Moderation | `/album/[albumId]/setup/moderasi`; `GuestLimitForm` | SHARED ROUTE |
| H32 | Setup — Design & Branding | `/album/[albumId]/setup/desain`; `DesignSetup` | SHARED ROUTE |
| H33 | Setup — Package Selection | `/album/[albumId]/setup/paket`; `PackageOptions` | SHARED ROUTE |
| H34 | Setup — Collaborators | `/album/[albumId]/setup/kolaborator`; `CollaboratorSetup` | SHARED ROUTE |
| H35 | Review Setup | `/album/[albumId]/setup/review`; `SetupReview` | SHARED ROUTE |
| H36 | Album Ready / Free Activation Result | `/album/[albumId]/siap`; server readiness/payment state | STATE-DRIVEN |
| H37 | Paid Checkout Preparation | `/album/[albumId]/checkout/[packageVersionId]` | IMPLEMENTED |
| H38 | Payment Status / Provider Return | `/album/[albumId]/pembayaran/[transactionId]/status`; server status projection | STATE-DRIVEN |
| H39 | Sharing & QR | `/album/[albumId]/berbagi` | IMPLEMENTED |
| H40 | Event Preparation Guide / QR PDF | `/album/[albumId]/berbagi/panduan`; QR PDF action | IMPLEMENTED |
| H41 | Live Event Dashboard | `/album/[albumId]`; `LiveEventDashboard` selected when album state is `OPEN`; uses `/live-overview` projection | STATE-DRIVEN |
| H42 | Album Gallery Management | `/album/[albumId]/galeri`; `AlbumGalleryManagement` | IMPLEMENTED |
| H43 | Photo Management Detail | `/album/[albumId]/galeri/[photoId]` | IMPLEMENTED |
| H44 | Trash / Deleted Photos | `/album/[albumId]/galeri/sampah` | IMPLEMENTED |
| H45 | Collaborators Management | `/album/[albumId]/kolaborator` | IMPLEMENTED |
| H46 | Invitation History | `/album/[albumId]/kolaborator/undangan` | IMPLEMENTED |
| H47 | Billing & Payment History | `/album/[albumId]/pembayaran`; Owner-only | IMPLEMENTED |
| H48 | Payment Transaction Detail | `/album/[albumId]/pembayaran/[transactionId]`; Owner-only | IMPLEMENTED |
| H49 | Package Upgrade | `/album/[albumId]/upgrade` | IMPLEMENTED |
| H50 | Export Center | `/album/[albumId]/ekspor` | IMPLEMENTED |
| H51 | Export Job Detail | `/album/[albumId]/ekspor/[exportJobId]` | IMPLEMENTED |
| H52 | Album Activity | `/album/[albumId]/aktivitas`; `AlbumActivity` uses the safe `/activity` projection and server cursor | IMPLEMENTED |
| H53 | Reschedule Event | `/album/[albumId]/jadwal-ulang` | IMPLEMENTED |
| H54 | Lifecycle & Retention | `/album/[albumId]/retensi` | IMPLEMENTED |
| H55 | Recovery Activation / Status | `/album/[albumId]/pemulihan` | IMPLEMENTED |
| H56 | Recovery Media Workspace | `/album/[albumId]/pemulihan/media` | IMPLEMENTED |
| H57 | Album Settings | `/album/[albumId]/pengaturan`; reuses `GallerySettings` GET/PATCH revision and CSRF flow | IMPLEMENTED |
| H58 | Album Design Management | `/album/[albumId]/desain`; `DesignSetup` reads the projection, validates a local COVER, authorizes, uploads, commits the returned `asset_id`, PATCHes with current revision, refreshes, replaces, and clears | IMPLEMENTED (frontend; backend enforcement pending) |
| H59 | Guest Experience Preview | `/album/[albumId]/preview-tamu`; `GuestPreview` renders Host-authorized Album, Schedule, Settings, and Design projections as a labelled, read-only guest simulator | IMPLEMENTED (frontend; backend projection authorization pending) |
| H60 | Collaborator Dashboard | `/kolaborasi` | IMPLEMENTED |
| H61 | Assigned Albums | `/kolaborasi/album`; collaborator relationship filter | IMPLEMENTED |
| H62 | Collaborator Album Workspace | `/album/[albumId]`; current collaborator actor projection | SHARED ROUTE |
| H63 | Collaborator Permission Summary | `/album/[albumId]/izin` | IMPLEMENTED |
| H64 | Guest Link Resolving | `/j/[linkId]`; fragment resolution in guest entry flow | STATE-DRIVEN |
| H65 | Guest Welcome / Event Preview | `/j/[linkId]`; resolved event state | SHARED ROUTE |
| H66 | Guest Join — Display Name & PIN | `/j/[linkId]`; guest entry flow | SHARED ROUTE |
| H67 | Guest Consent | `/j/[linkId]`; consent state in guest entry flow | SHARED ROUTE |
| H68 | Capture Waiting Room | `/j/[linkId]`; server capture-readiness state | STATE-DRIVEN |
| H69 | Live Camera | `/j/[linkId]`; camera capture state; assistant launcher suppressed here | STATE-DRIVEN |
| H70 | Photo Review / Retake | `/j/[linkId]`; capture processor state | STATE-DRIVEN |
| H71 | Upload / Save Status | `/j/[linkId]`; capture submission result | STATE-DRIVEN |
| H72 | Capture Closed / Reveal Countdown | `/j/[linkId]`; server capture/reveal state | STATE-DRIVEN |
| H73 | Guest Gallery | `/j/[linkId]/galeri` | IMPLEMENTED |
| H74 | Guest Photo Detail | `/j/[linkId]/galeri/[photoId]` | IMPLEMENTED |
| H75 | Guest Access Ended | `/j/[linkId]/akses-berakhir` | IMPLEMENTED |
| H76 | Guest Post-Event End State | `/j/[linkId]/akses-berakhir`; post-event lifecycle state | STATE-DRIVEN |
| H77 | Admin Dashboard | `/admin`; Admin session shell and dashboard | IMPLEMENTED |
| H78 | Users | `/admin/users` | IMPLEMENTED |
| H79 | User Detail | `/admin/users/[userId]` | IMPLEMENTED |
| H80 | Albums Operations | `/admin/albums` | IMPLEMENTED |
| H81 | Album Operations Detail | `/admin/albums/[albumId]` | IMPLEMENTED |
| H82 | Payments / Transactions | `/admin/payments` | IMPLEMENTED |
| H83 | Payment Transaction Diagnosis | `/admin/payments/[transactionId]` | IMPLEMENTED |
| H84 | Package Catalog | `/admin/catalog` | IMPLEMENTED |
| H85 | Create Package Version | `/admin/catalog/packages/[packageId]/versions/new` | IMPLEMENTED |
| H86 | Operational Configuration | `/admin/config` | IMPLEMENTED |
| H87 | Operational Issues | `/admin/issues` | IMPLEMENTED |
| H88 | Operational Issue Detail | `/admin/issues/[issueId]` | IMPLEMENTED |
| H89 | Audit Log | `/admin/audit` | IMPLEMENTED |
| H90 | Admin Roster — Read Only | `/admin/admins` | IMPLEMENTED |
| H91 | Sensitive Media Access Workspace | `/admin/albums/[albumId]/sensitive-access`; separate Admin session | IMPLEMENTED |
| H92 | Operational Hold Management | `/admin/albums/[albumId]/hold` | IMPLEMENTED |

## F17 / C01–C09

| Code | Shared surface |
|---|---|
| C01 | Shared launcher in `Assistant` |
| C02 | Shared panel/dialog shell |
| C03 | In-memory conversation and informational response bubble |
| C04 | Generic safe fallback on request failure |
| C05 | Context notice derived from active session access; no client role field |
| C06 | Loading state |
| C07 | 503 unavailable state; main page remains usable |
| C08 | 401/403, 429, and recoverable error states |
| C09 | Full-screen mobile dialog; desktop side panel |

The shared assistant is included at the application root for public, Host, collaborator, Guest non-camera, and Admin routes. It is suppressed on the active H69 camera, checkout/payment, and Sensitive Access routes so its panel cannot cover camera or critical confirmation controls. The camera exception is the Owner-approved V1 decision: Guest access remains available before entering and after leaving the immersive camera surface.

## Cross-cutting states and security boundaries

- UserCookie, GuestCookie, and AdminCookie remain distinct browser sessions. AI request body contains only message and bounded recent turns; role/capability claims are not sent.
- AI conversation lives in React state only; no localStorage or permanent browser persistence.
- H41 countdown uses `server_time` from the live projection and monotonic elapsed time; browser wall-clock time is not used for authorization.
- H52 UI consumes only a typed safe activity projection. Current relationship/capability scoping is an API authorization requirement and must be enforced by the backend on every request.
- H57 mutations retain the existing CSRF and expected-revision contract; offline mutations remain disabled.
- H58 V1 policy is Owner-approved and locked: asset type `COVER`; MIME allowlist `image/jpeg`, `image/png`, and `image/webp`; original size `1..5,000,000` bytes; SVG and arbitrary templates are prohibited. `template_versions` remain server-managed. The browser validates before authorization, uploads only to the returned short-lived URL, commits the exact authorized ID, then selects it through the revisioned design PATCH. Upload URL and asset ID remain transient and are not displayed or persisted. The rendered cover uses only nullable `AlbumDesign.cover_preview: MediaDeliveryReference`, never a raw or permanent R2 URL.
- Backend must verify Owner/allowed `can_setup` permission and current album state before recording a DesignAsset and issuing short-lived upload authorization; `can_setup` does not grant post-confirm setup privileges where the permission model forbids them. Commit must verify current authorization, exact object association, object existence, size, declared MIME, magic/signature, allowed type, and non-invalidated asset state. A successful storage PUT alone does not commit or select the cover. The server must recheck authorization for every short-lived Media Gateway delivery and return `cover_preview: null` without a selected cover.
- H59 uses only Host-authorized AlbumDetail, AlbumSchedule, AlbumSettings, and AlbumDesign projections. It does not call Guest Access Resolve, create GuestSession/GuestCredential/GuestConsent/CaptureAttempt, bypass PIN, reserve quota, capture, upload, access unrevealed gallery media, like, or download. The disabled guest CTA and Preview/Pratinjau mark keep the surface read-only and visibly simulated.
- Admin surfaces under `src/features/admin/**` use next-intl. Bahasa Indonesia remains the default; representative Admin dashboard and album surfaces have ID/EN regression coverage. Enum values and technical identifiers deliberately shown diagnostically remain literal.
- AI is informational only, sends no client role/capability, keeps conversation in component memory, and uses the active session cookie boundary. It does not authorize or mutate actions. C01-C09 cover shared launcher, panel, memory-only turns, safe fallback, session-derived context, loading, 503, 401/403/429/error, and responsive dialog/panel behavior.
- H01 Instagram and TikTok link to `https://www.instagram.com/kepotret.official/` and `https://www.tiktok.com/@kepotret.official/`. WhatsApp, Hubungi Kami, and contact details remain visibly unavailable until an official target is supplied by the Owner.

## Quality evidence for this remediation snapshot

- `pnpm install --frozen-lockfile` passed; dependency lockfile is current.
- `origin/main` was independently checked with `git ls-remote` and still points to baseline `513131a3fd89d77dfbca6a7c177b382ab3a65aaf`; remediation remains on `fix/frontend-final-audit-remediation`.
- `pnpm api:check` passed after updating the canonical OpenAPI; generated client/types are fresh.
- `pnpm lint` and `pnpm typecheck` passed.
- `pnpm test` passed: 27 files, 147 tests.
- `pnpm build` passed; Next generated the `/aktivitas`, `/desain`, `/pengaturan`, and `/preview-tamu` routes.
- Full Playwright matrix passed: 105/105 (Chromium 73, Firefox 8, WebKit 8, mobile Chromium 8, mobile WebKit 8).
- Focused WebKit and mobile WebKit checks each passed 24/24 with `--repeat-each=3`; the reported navigation timeout did not reproduce. No navigation waits, timeout increases, weakened assertions, or skips were introduced. The Admin package-version E2E now checks the alert element so the test accepts translated error copy.
- `git diff --check` passed after generated output whitespace normalization.

## Known gaps and external dependencies

- No backend implementation is included. `/live-overview`, `/activity`, DesignAsset authorization/commit validation, and authorized Media Gateway projections must be implemented server-side and enforce fresh Owner/collaborator authorization before integration acceptance.
- External integration remains backend-owned: Gemini AI requests require the approved server adapter, payment status requires provider callbacks/reconciliation, and private media delivery/upload require the Media Gateway and object-storage authorization paths. These integrations are not claimed as implemented here.
- H13 has no dedicated browser/device compatibility guide.
- Official WhatsApp and contact targets are awaiting Owner-provided details.
