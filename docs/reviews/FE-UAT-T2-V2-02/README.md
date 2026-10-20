# FE-UAT-T2-V2-02 — Guest selected-photo ZIP feasibility

**Verdict: BLOCKED/UNVERIFIED — no authoritative runtime evidence available.** This is a contract and source audit, not a Guest ZIP implementation or a CORS proof. H73/H74 Owner issues remain open for separate review.

## Baseline and scope

- PR [#33](https://github.com/JAR-FIS/Kepotret/pull/33) was merged. The actual squash commit on synchronized local `main` and `origin/main` was `3e385fe99352b5691f61e0563fa5bb9d11bacac6`; the tree was clean before this spike branch was created.
- Spike branch: `spike/fe-uat-t2-v2-02-guest-zip-feasibility`. No production UI, backend, database, OpenAPI, generated client, package, or lockfile change is part of this report. Backend remains ON HOLD.
- Intended later behavior: select 1–20 **currently loaded, visible, download-eligible** Guest photos per ZIP attempt after reveal. This is not an all-album selection or lifetime quota. Existing single-photo download remains the only implemented Guest download.

## Contract and implementation audit

| Surface | Authority and contract | Finding for selected Guest ZIP |
| --- | --- | --- |
| `GET /api/v1/guest/me` | Guest session context and reveal state | Current gallery checks `REVEALED`, shows a waiting state otherwise, and handles access closure. The server remains authoritative for access. |
| `GET /api/v1/guest/gallery/photos` | `GuestCookie`; visible revealed photos; sort `NEWEST`, `OLDEST`, `MOST_LIKED`; cursor; default 24, maximum 60 per page | `GuestGalleryPhoto` carries stable `photo_id`, short-lived `media` reference and `actions.can_download`. The UI retains at most 240 loaded photos. Selection must be limited to the eligible photos actually loaded; a changing cursor cannot establish a complete album set. |
| `GET /api/v1/guest/gallery/photos/{photo_id}/download` | `GuestCookie`; authorized if album permits; returns a short-lived Gateway URL | Call separately for **each** selected ID immediately before byte retrieval. Recheck server permission even if a prior `can_download` flag was true. Current UI obtains this descriptor and uses `window.location.assign`; that proves neither JS byte access nor CORS. Contracted responses include 401/403/404/409/422/429, but not 410. Treat any other non-200 as failure; clarify 410 semantics with API owners before final implementation if required. |
| `GuestGalleryPhoto.media` | `{url, expires_at}`; Gateway authorization rechecked per request | Display reference is not a durable ZIP source. Do not reuse old card URLs for ZIP retrieval. |
| `POST /api/v1/albums/{album_id}/exports` | `UserCookie`, Owner / `can_export_zip`, CSRF and idempotency; asynchronous export | **Not a Guest endpoint** and cannot be called with Guest authority for H73/H74. |
| Album creation/settings | `AlbumSettings.downloads_enabled` exists; `AlbumCreateRequest` exposes only `timezone` and no download default | Owner-approved `downloads_enabled = true` for **new** albums needs a separately approved backend rule/contract confirmation. Do not emulate it with a frontend default. Existing albums keep their settings. |

The Guest download response uses `StringUrlEnvelope`, whose schema requires only `data.url`; unlike `GuestGalleryPhoto.media`, it does **not** expose `expires_at`. Synthetic E2E fixture data supplies an extra expiry field, so tests must not treat that fixture field as a guaranteed API contract. The short-lived descriptor and current-authorization semantics still apply. The browser API calls use `credentials: 'include'` via the Next rewrite of `/api/v1/:path*`; the Gateway delivery URL may have different origin or credential requirements, which this source audit cannot determine.

Sources: [OpenAPI contract](../../../contracts/openapi/Kepotret_OpenAPI_v1_Baseline.yaml), [Guest gallery](../../../src/features/guest/components/guest-gallery.tsx), [generated Guest client](../../../src/lib/api/generated/guest-gallery/guest-gallery.ts), [Next configuration](../../../next.config.ts), [FE5 architecture note](../../references/architecture/FE5_API_Contract_Change_2026-09-27.md), and [synthetic E2E](../../../tests/e2e/guest-gallery.spec.ts).

## Real Gateway and browser evidence

The workspace has `.env.example` only. No nonproduction API/Gateway origin, authorized Guest test event/session, or physical device was provided to this run. No private URL, cookie, image byte, or credential was obtained or logged. The synthetic Playwright route for `media.test` cannot establish real Gateway CORS behavior.

| Browser / environment | Origin and redirects | `fetch` + Blob/ArrayBuffer | CORS / denied or expired bytes |
| --- | --- | --- | --- |
| Desktop Chromium, Firefox, WebKit / actual nonproduction Gateway | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Physical iPhone Safari / actual nonproduction Gateway | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Physical Android Chrome / actual nonproduction Gateway | UNVERIFIED | UNVERIFIED | UNVERIFIED |

**Required runtime proof:** provide an authorized nonproduction album whose gallery is revealed and downloads are enabled, a Guest test session, and safe fixtures for expired/revoked/disabled/non-visible access. From the Guest page, obtain a fresh per-photo descriptor and record only redacted origin relation, redirect presence, status, content type, `Content-Disposition`, `Access-Control-Allow-Origin`, and `Access-Control-Allow-Credentials`. Attempt browser `fetch` using the documented Gateway credential policy and actually read a Blob/ArrayBuffer. Verify that denied and expired access yields no bytes. `<img>`, link navigation and `mode: 'no-cors'` do not count. Do not introduce a proxy route to evade CORS.

## ZIP proof and mobile validation

| Count | Authorized JPEG byte fetch | ZIP integrity, exact names and hashes | Time, bytes, memory, save |
| --- | --- | --- | --- |
| 1 | BLOCKED | NOT RUN | NOT MEASURED |
| 10 | BLOCKED | NOT RUN | NOT MEASURED |
| 20 | BLOCKED | NOT RUN | NOT MEASURED |

The brief gates the isolated, non-shipping ZIP proof on a successful **real** browser byte fetch. That gate did not pass or fail; it was unavailable. No mock ZIP was constructed and no library was added. A later proof should cap selection at 20 per ZIP, fetch fresh descriptors with concurrency 2–3, avoid JPEG re-encoding/base64 copies, verify every JPEG and ZIP entry, sanitize unique filenames, and save only after **all** selected files succeed. Exercise zero/21 selection, 403/404/429, expiry, abort, network loss and storage failure without presenting a partial archive as complete. Measure 1/10/20 elapsed time, total bytes and available memory metrics; validate the archive with an independent ZIP reader and file hashes.

**MOBILE = UNVERIFIED.** Owner UAT checklist for each physical iPhone Safari and Android Chrome: obtain a valid Guest session; reveal the album; select 1, 10 and 20 eligible photos; save each ZIP and locate/open it; verify exact files; repeat with rotation, background/resume, interrupted network and low storage; verify no tab crash, unauthorized byte access, or misleading success state. Desktop mobile emulation is supporting evidence only.

## Security and dependencies

| Dependency | Owner of next action | Required evidence / decision |
| --- | --- | --- |
| Nonproduction Gateway and authorized Guest fixtures | Backend/security and environment owner | Actual origin/redirect/credential/CORS policy and byte-read result; denied/expired/revoked/disabled/non-visible denial. Backend remains ON HOLD for changes. |
| Physical iPhone and Android | Owner UAT | ZIP save/open, interruptions and resource behavior on real devices. |
| New-album `downloads_enabled = true` | Future separately approved backend/contract work | Confirm server default on creation; preserve existing albums. |
| Guest descriptor expiry/status contract | API owner during later implementation brief | Decide whether `StringUrlEnvelope` needs expiry metadata and whether 410 should be documented. No contract edit in this spike. |

Server-owned reveal, GuestCredential validity, album setting, visibility, current permission and Gateway authorization must remain decisive. Never use Owner export credentials, stale display URLs, raw storage locations, a bypass proxy, or secret-bearing logs. A frontend ZIP can be considered only after the actual Gateway byte-read proof, archive validation and mobile checks; the later implementation brief must name the chosen ZIP library and its security/maintenance review. Gallery/Panduan navigation, filter claims and quota claims are outside this spike.

## Work performed

Changed file: this `README.md` only. Read-only checks: `git status --short --branch`, `git rev-parse HEAD`, `git rev-parse origin/main`, `git log -1`, targeted `rg` and `Get-Content` of the contract, Guest implementation, generated client, Next configuration, environment example and synthetic tests. Results: baseline synchronized and clean; endpoint/authorization matrix confirmed; no live Gateway or authorized Guest fixture configured. No runtime CORS test, ZIP integrity test, mobile device test, lint, typecheck or build was run because no executable code changed and the proof gate was unavailable. No Owner issue is marked SOLVED. Independent review and a separate H73/H74 implementation brief remain required.
