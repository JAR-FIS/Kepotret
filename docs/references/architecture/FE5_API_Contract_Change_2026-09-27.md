# FE-5 API Contract Change

This note records the minimal OpenAPI changes needed for the FE-5 guest gallery, host moderation, and sharing surfaces. It changes frontend-facing contracts only; no backend implementation or database migration is included.

## Gaps found

- Guest and host gallery reads reused `PhotoSummary`, which exposed management fields in the guest response and omitted the media delivery descriptor, photographer label, and server-projected action capabilities.
- The guest list had no typed sort, cursor, or limit query. Host management pagination lacked the corresponding cursor, limit, sort, and moderation filter.
- Guest share-link creation returned a photo envelope instead of a deep-link projection.
- Host photo sharing had no Owner-only operation. Album sharing and QR/PDF retrieval were Owner-only even though the locked UI inventory assigns H40 retrieval to Host and WO/EO.
- Album settings had no read endpoint and could only write `per_guest_limit`; FE-5 needs gallery visibility, moderation mode, likes, downloads, and sharing controls while preserving the existing guest limit.
- No dedicated Owner-only Trash list existed. `can_moderate` alone must not grant Trash or restore access.
- Guest context had no documented terminal retention response for the post-event end state.

## Corrected contract

- Added `GuestGalleryPhoto`, `GuestPhotoActions`, and `GuestGalleryListEnvelope`. Guest list sort is limited to `NEWEST`, `OLDEST`, and `MOST_LIKED`; cursor is opaque and context-bound; limit defaults to 24 and is capped at 60.
- Added a distinct management photo projection with moderation state and server-projected actions. Host collections use opaque cursor pagination, a default limit of 25, maximum 100, and typed sort/status filters.
- Photo media uses `MediaDeliveryReference`, a short-lived Media Gateway URL with expiry. It is not an R2 URL, bucket, object key, permanent signed URL, or storage credential. Each fetch remains subject to current authorization.
- Guest photo share-link returns `PhotoShareLink`, a current-policy detail deep link. The recipient still follows current guest link, PIN, and lifecycle checks; no per-photo credential is created. Added the smallest Owner-only equivalent for host sharing.
- Added album settings readback and partial revision-protected writes for visibility (`GUEST_VISIBLE` or `HOST_ONLY`), moderation mode (`INSTANT` or `APPROVAL`), likes, downloads, sharing, and the pre-existing `per_guest_limit`.
- Added an Owner-only Trash list with server-projected `can_restore`. Deleted photos remain included in album quota. Existing Owner-only restore semantics remain in place.
- Added `can_rotate` to the album sharing projection. The Owner alone may rotate the access link. Album sharing details and QR PDF retrieval permit the Owner or a currently active, authorized WO/EO relationship; this does not add a broader collaborator capability. Rotation remains Owner-only.
- `GET /api/v1/guest/me` documents `410 Gone` for normal post-event guest access closure at D+30. Revoked or otherwise unavailable access continues through the existing authorization responses.

## Authorization boundaries

- The server remains responsible for guest reveal, album visibility, GuestCredential validity, publication state, deletion/purge, lifecycle, Operational Hold, and Media Gateway authorization. The frontend does not reconstruct these conditions.
- Guest and management projections are separate. Management action flags are capabilities returned by the server. `can_moderate` and `can_export_zip` do not grant individual download, and `can_moderate` does not grant Trash or restore.
- QR/PDF retrieval follows the current Owner or active authorized WO/EO relationship. Link rotation and host photo deep-link retrieval remain Owner-only. Guest photo deep links use the current access-link policy.
- The QR is rendered locally in the browser. The client does not send secret URLs to a third-party QR service.

## Frontend impact

Orval output is regenerated from `contracts/openapi/Kepotret_OpenAPI_v1_Baseline.yaml`; generated DTOs are not hand-edited. Guest cards/details use the guest-safe schema and server action flags. Host lists use cursor pagination and management capabilities. Settings use revision readback and CSRF-protected writes. H75/H76 render terminal guest states from authorization responses without adding recovery or capture affordances.

## Future backend and physical mapping

No Go code, SQL schema, migration, R2 Worker, or new physical table is part of FE-5. The expected implementation maps to existing `album_settings`, `photos`, `photo_likes`, and `album_access_links` records plus the current Media Gateway authorization path. Backend work must enforce cursor binding, projection separation, current authorization, capabilities, and the stated relationship boundaries.
