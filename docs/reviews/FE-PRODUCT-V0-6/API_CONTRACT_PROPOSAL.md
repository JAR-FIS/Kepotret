# API contract proposal — review only

**No path, field or example in this document is active unless explicitly labeled EXISTING.** The source OpenAPI is unchanged. **OWNER APPROVED** behavior is PD-01–13; all wire shapes below are **TECHNICAL PROPOSAL** pending gates A–G. API Contract v0.1 conventions remain: `/api/v1`, snake_case JSON, `{ "data": ... }` envelope, stable error codes, `Accept-Language` ID/EN, UTC timestamps with album timezone for calendar rules, server time authoritative, strict credentialed CORS, CSRF/Origin for cookie mutations, `X-Request-ID`, and UUIDv7 idempotency keys on relevant creates.

## Existing operations and proposed changes

| Surface | EXISTING OpenAPI v1 baseline | TECHNICAL PROPOSAL / gate |
|---|---|---|
| `GET/PUT /api/v1/albums/{album_id}/schedule` | `reveal_delay_days` required enum `1,3,5,7`; `reveal_at` server-derived; PUT has `expected_revision`, CSRF. | Represent Live vs Delayed explicitly in read/write, and keep `reveal_at` derived. Resolve compatibility and reschedule semantics at A/G. |
| `POST /api/v1/guest/access/resolve` | Link ID + secret, safe preview and `consent_version`, no guest cookie creation. | May add safe gallery gate/intent projection; must not leak PIN or private state. Link secret remains request body, never URL query/log. B. |
| `POST /api/v1/guest/sessions`, `GET /api/v1/guest/me` | Name + consent + optional PIN creates named GuestSession/GuestCredential; `/me` restores capture context. | Keep capture semantics. Reuse valid context; determine consent refresh and principal separation. B. |
| Guest Gallery list/detail | `GET /api/v1/guest/gallery/photos[/{photo_id}]`, `GuestCookie`, revealed visible photos; actions include Like, Download, Share. | Accept scoped viewer read principal as alternative, with current per-photo/Gateway authorization and explicit capability projection; viewer Like/Download/Share initially false pending E. B/E. |
| Guest Like/Download/Share | Existing endpoints use capture guest credential; Like keyed to `guest_session_id`. | Do not admit viewer to these endpoints without product/security decision and a non-GuestSession identity/abuse rule. E. |
| Design authorize/commit, `GET/PATCH /api/v1/albums/{album_id}/design` | Asset type `COVER`, JPEG/PNG/WebP, ≤5,000,000 bytes; selected cover + preview + setup revision. | Add typed portrait/landscape frame variants, true-alpha/dimension checks, revision/frozen projection and server freeze guard; frame byte cap unresolved. C/F/G. |
| Capture attempt, upload authorization, commit | Pre-shutter reservation, final JPEG ≤700000 bytes direct private PUT, idempotent commit; no processing metadata. | Bind effective LUT/frame profile snapshot to attempt/final; reject stale/invalid profile as designed; decide client vs server compositor. D/F. |
| Media Gateway and export | Short-lived media reference and current authorization; export carries final photo object bytes. | Evaluate Live reveal/current viewer scope on each fetch. Never overlay frame again. E. |
| Camera switch | Browser-only. | No API endpoint proposed. |

## Reveal policy: candidate shape (Gate A/G)

Proposed discriminated object for **new-version** schedule write/read:

```json
{ "reveal_policy": { "mode": "LIVE" } }
```

```json
{ "reveal_policy": { "mode": "DELAYED", "delay_days": 1 } }
```

Contract invariant: `LIVE` **must not** have `delay_days`; `DELAYED` must have exactly one of `1,3,5,7`. A draft new album defaults to `DELAYED/1` when no explicit choice was made; whether omission is accepted over the API is an open Gate A detail. Read projections should include `capture_state`, server-derived `reveal_at` (including its exact Live meaning after review), and a separate `gallery_access_state` or equivalent so `OPEN capture + available Gallery` is representable. `RevealState` HIDDEN/REVEALED alone and delay `0` cannot safely carry this policy. PUT retains `expected_revision`, current Host/`can_setup` authorization, CSRF/Origin, server time and schedule-version checks. Suggested errors: `400/422` invalid union, `401/403/404` actor/object, `409` stale revision or forbidden state, `429` rate, `503` dependency. Error codes and response shapes require OpenAPI review; these are not new deployed codes.

Compatibility must be deliberate: old delayed albums map to `DELAYED` with the same delay and historical `reveal_at`; old clients that expect required numeric `reveal_delay_days` cannot parse Live. Gate G must choose a versioned response/feature-negotiation or coordinated cutover with an explicit minimum client. Do not silently return `0`, `null` in a required integer, or omit a required field in the existing schema.

## Viewer access: candidate exchange and scopes (Gate B/E)

**New operation proposal, not an existing endpoint:** `POST /api/v1/guest/viewer-access` (name/path to be chosen in OpenAPI review). Candidate body `{ "link_id": "<uuid>", "access_secret": "<opaque>", "pin": "<value-or-null>" }`; successful response gives only a safe gallery/event state projection in `{ "data": ... }`, while server issues an opaque, short-lived, Secure HttpOnly SameSite viewer credential. A separate `GET /api/v1/guest/viewer-context` is one option; alternatively extend an existing safe context route with a principal discriminator. The viewer credential must be isolated from the capture `GuestCookie` and cannot authorize `/guest/me`, capture readiness/attempt, upload or moderation. The chosen cookie/path/site topology and CSRF model need review against the current API/Media Gateway origins. Origin/rate limiting and PIN throttling apply to exchange; later cookie mutations retain CSRF. Link/PIN rotation and `access_version`, TTL, hold and D+30 close invalidate it server-side. No name, `guest_session_id`, quota allocation, or participant count record is created.

For list/detail, propose a server-derived principal kind `CAPTURE_GUEST` or `VIEWER_READ` and permission-filtered `actions` fields. Viewer `can_like`, `can_download`, `can_share` are false **until Gate E decides otherwise**; even if a stale frontend exposes a button, the corresponding endpoint must deny. Existing Like uniqueness `(photo_id, guest_session_id)` cannot identify an anonymous viewer. A gallery-open preview must not promise that individual photos exist. Unauthorized requests should use the existing 401/403/404/410 distinctions without disclosing hidden albums; Gate B specifies exactly which expired/revoked cases are 401 vs 403 vs 410. `429` includes `Retry-After`; `503` is transient. No automatic privilege upgrade on a cookie collision.

## Design and processing: candidate payloads (Gates C/D/F/G)

Extend existing design upload authorization rather than treating a frame as a cover. Candidate `asset_type` values `COVER`, `FRAME_PORTRAIT`, `FRAME_LANDSCAPE` are **names for review**. The server verifies actual decoded format, geometry and alpha, not just a claimed MIME/extension. Cover: 1920×1080 JPEG/PNG/WebP; existing cover byte cap 5,000,000 until changed by an approved contract. Frame: PNG, actual transparent area, portrait 1080×1440 or landscape 1440×1080; maximum input bytes **BLOCKED/UNVERIFIED** (Gate F). A candidate design projection adds selected IDs, revision and frame-frozen state. A PATCH candidate uses existing `expected_revision` and selects committed assets belonging to the same album. Reject frame authorize/commit/selection at `server_time >= capture_start` with a documented conflict code and no side effects; cover policy remains separate. Gate C decides whether both orientations are required to activate a frame. Do not accept the frame as a user-provided URL or return private storage coordinates.

Candidate capture reservation/read projection includes `processing_profile` (effective system LUT preset ID/version, active frame asset/version for orientation, profile revision). The profile is server-issued and bound to the attempt; the browser cannot self-authorize a frame ID. Candidate final upload authorization/commit validates JPEG magic/MIME and `size_bytes <= 700000`, single object/attempt, current guest/album state, profile consistency, checksum/bytes and idempotent result. Existing PUT remains private direct upload **only if Gate D chooses browser composition**. The server can validate bytes and metadata but cannot prove visual LUT/frame pixels from IDs or hash alone. If Gate D requires canonical server composition, a separate transient ingest/processing contract and retention/security design must be approved before any OpenAPI change; raw permanence remains prohibited. No raw object may be treated as a committed Photo.

## Response/error examples for review

The examples show envelope conventions and are **not** generated types or approved error codes:

```json
{ "data": { "reveal_policy": { "mode": "DELAYED", "delay_days": 3 }, "reveal_at": "2026-11-06T09:00:00Z", "gallery_access_state": "HIDDEN" } }
```

```json
{ "error": { "code": "FRAME_FROZEN", "message": "Bingkai tidak dapat diubah setelah acara dimulai.", "request_id": "<uuid>", "details": null } }
```

Candidate status mapping: `400` malformed union/JSON; `401` absent/expired credential; `403` known actor denied, hold or closed scope where disclosure is safe; `404` nonexistent or intentionally concealed object; `409` stale revision, freeze race or attempt state; `410` normal guest lifecycle expiry per current `/guest/me` precedent; `422` decoded asset/geometry/alpha/profile invalid; `429` PIN/entry rate limit; `500/503` server/dependency failure. Stable machine codes and privacy-preserving choice among 401/403/404/410 must be finalized in Gate B/F, localized text handled by frontend. No automatic second capture or export job is implied by retries.

## Review sequence

Resolve A–G; update approved PRD/BPMN/DFD/ERD/Permission/Physical DB and API Contract v0.1 consistently; submit a reviewed OpenAPI source diff; regenerate client/types from that source; add contract, migration, authorization and compatibility tests from [test matrix](TEST_CONTRACT_MATRIX.md). Until then, existing v1 OpenAPI and generated clients remain authoritative for running code.
