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
- Typed the existing capture-attempt lifecycle states and documented UUIDv7 idempotency and reservation-before-shutter requirements.
- Allowed CSRF token issuance for either user or guest cookie sessions, bound to the requesting session.
- Preserved the existing routes and cookie/CSRF protections. No host, payment, gallery, or sharing fields were added to guest projections.

## Backend and physical mapping

This change updates the OpenAPI contract and generated TypeScript clients only. No backend implementation or database migration was added. Backend work must map the consent version to the accepted consent record, provide safe event/readiness projections, and enforce the reservation and idempotency rules before FE-4 can integrate with a live API.

## Consent copy status

The repository contains no approved guest-consent text. The guest surface uses this neutral structural placeholder: “I agree to the event photo-sharing consent for this album (version {version}).” This exact copy is **CONTENT REVIEW REQUIRED** and is not represented as legally approved text.
