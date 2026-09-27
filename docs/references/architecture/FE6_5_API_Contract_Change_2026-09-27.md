# FE-6.5 guest limit and UX clarification

Date: 2026-09-27
Scope: FE-6.5 frontend and the minimal persisted guest-limit contract alignment.

## Contract decision

`AlbumSettings.per_guest_limit` and the Setup Review settings snapshot now project one of `5 | 10 | 30 | 50 | 70 | 100`, with a documented server default of 30. New album settings must initialize `album_settings.per_guest_limit` to 30 under the existing domain constraint. This frontend milestone adds no table or database migration; backend persistence and initialization must implement the contract before production rollout. The server validates that the selected per-GuestSession limit does not exceed currently usable album quota. Album quota exhaustion blocks capture even when a GuestSession has remaining allowance. This limit is not a reservation and does not identify a unique human.

The existing settings GET and PATCH endpoints are reused. The frontend reads persisted settings and sends only `expected_revision` plus `per_guest_limit` for a guest-limit change. The server remains authoritative for revision conflicts, quota, and capture readiness.

## UX and lifecycle boundaries

H29 presents `capture_start` and `capture_end` as **Waktu Potret**. These fields remain the camera availability window; reveal remains a separate concept. No `event_start` or `event_end` fields are introduced. The browser displays the album timezone and previews validation, while server time and business validation remain authoritative.

Save to device is a user-initiated frontend download of the exact final JPEG after a confirmed `COMMITTED` capture. The Blob remains in memory only and is cleared on another capture or unmount. No save endpoint or permanent media URL is added.

Help content is static, version-controlled frontend content. `/help` and `/help/host` are FE-6.5 supplemental surfaces pending normal screen-registry consolidation. Later WO/EO and Superadmin tutorials belong to FE-7 and FE-8 respectively; this milestone implements neither role's behavior.

QR/link access after `capture_end` continues to follow reveal and lifecycle authorization. Capture does not reopen after `CLOSED`, and no new CaptureAttempt or shutter is allowed. The existing server grace for pre-close authorized uploads is unchanged.

This milestone adds no Go service, migration, worker, payment-provider integration, PWA queue, native app, or file-picker contribution path.
