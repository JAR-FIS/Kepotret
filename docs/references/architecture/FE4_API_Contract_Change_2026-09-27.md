# FE-4 API Contract Change — 2026-09-27

## Gaps found

- Guest link resolution returned an album summary intended for broader host-facing use and did not provide the guest entry fields or server consent version.
- Guest session creation did not carry the resolved link credentials or accepted consent version, so the contract could not express the required server-side association.
- `GET /guest/me` returned only guest identity and could not restore guest event timing and phase.
- The CSRF token endpoint accepted only a host `UserCookie`, while guest capture mutations use `GuestCookie`.
- Capture readiness returned a broad album object, and capture attempt status was an arbitrary string.

## Minimal correction

- Added guest-safe `GuestAccessPreview`, `GuestContext`, and `CaptureReadiness` projections and envelopes.
- Extended guest session creation with `link_id`, ephemeral `access_secret`, and server-issued `accepted_consent_version`.
- Restricted `CaptureAttempt.status` to the locked lifecycle `ACTIVE`, `COMMITTED`, `RELEASED`, and `EXPIRED`. Upload authorization remains represented by `upload_authorized_at`; no backend state was added.
- Documented UUIDv7 retry identity: reuse the key while an operation result is ambiguous, and issue a new key only for a changed join payload or a new shutter after release/termination.
- Allowed CSRF token issuance for either user or guest cookie sessions, bound to the requesting session.
- Preserved the existing routes and cookie/CSRF protections. No host, payment, gallery, or sharing fields were added to guest projections.

## Backend and physical mapping

This change updates the OpenAPI contract and generated TypeScript clients only. No backend implementation or database migration was added. Backend work must map the consent version to the accepted consent record, provide safe event/readiness projections, and enforce the reservation and idempotency rules before FE-4 can integrate with a live API.

## Approved H67 consent copy v1

The product-approved H67 consent is shown without exposing the internal server `consent_version`. The server-issued version is submitted only as `accepted_consent_version` for audit.

**Indonesian**

- Title: Sebelum ikut memotret
- Description: Foto yang kamu ambil melalui Kepotret akan disimpan dalam album acara ini dan dapat ditampilkan kepada peserta sesuai pengaturan album setelah waktu publikasi tiba. Nama tampilan yang kamu masukkan juga dapat ditampilkan sebagai label pada foto yang kamu ambil.
- Checkbox: Saya setuju foto dan nama tampilan saya diproses untuk keperluan album acara ini sesuai Kebijakan Privasi dan Syarat & Ketentuan Kepotret.
- CTA: Setuju & Lanjutkan

**English**

- Title: Before you start taking photos
- Description: Photos you take through Kepotret will be stored in this event album and may be shown to participants according to the album settings once the reveal time is reached. The display name you provide may also appear as a label on photos you take.
- Checkbox: I agree that my photos and display name may be processed for this event album in accordance with Kepotret's Privacy Policy and Terms & Conditions.
- CTA: Agree & Continue

No database migration or new backend state is introduced by this correction.
