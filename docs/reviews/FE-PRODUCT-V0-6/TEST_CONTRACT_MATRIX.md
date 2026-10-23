# Proposed acceptance and test contract matrix

These are **future implementation tests**, not tests executed by this documentation PR. **OWNER APPROVED** outcomes trace to PD-01–13; assertions that depend on a schema, cookie or compositor choice are **TECHNICAL PROPOSAL** until Gates A–G close. Use source OpenAPI contract tests, unit/state tests, backend integration, browser E2E without retries, Gateway/security tests, physical devices and performance evidence. Synthetic UAT fixtures cannot establish real backend or camera compliance.

| ID | Level / trace | Scenario and acceptance condition | Gate |
|---|---|---|---|
| T-01 | Contract + Host UI, PD-01/PD-02, H07/H29 | New album presents exactly Live + D+1/3/5/7, defaults D+1; malformed Live+delay and delay `0` rejected; ID/EN copy matches policy. | A |
| T-02 | Integration, PD-03/PD-04 | Live Gallery can open during capture while shutter closes at `capture_end`; delayed Gallery remains hidden until `capture_end + n` in album timezone; reveal never extends D+30/D+37/D+51. | A/G |
| T-03 | Time/race, PD-03/04 | At exact capture end new reservation fails; prior authorized attempt can finish within existing five-minute grace, and only eligible committed photo becomes Live-visible. Stale reveal job cannot open wrong album/version. | A/G |
| T-04 | API/E2E, PD-05–07, H64/H65 | Valid returning capture session restores without repeating unchanged name/consent or creating another GuestSession. Changed consent needs reconfirmation; expired/revoked access denied. | B |
| T-05 | API/E2E, PD-06/PD-07 | New viewer uses valid QR/link and PIN if required to view available Gallery with no name, capture session, quota reservation or count increment. Before reveal sees only safe status/countdown. | B |
| T-06 | Security, PD-06/PD-07 | Viewer cookie/principal cannot call `/guest/me`, capture-readiness as capture permission, reserve/upload/commit, moderation or Owner routes. A forged client role/scope does not help. | B/E |
| T-07 | Security/count, PD-06/PD-07 | Link/PIN rotation, access-version bump, TTL, hold and D+30 invalidate viewer and capture fetches; `guest_count_final` equals qualifying capture GuestSession IDs, not viewers or distinct names. | B/G |
| T-08 | Contract/Gateway, PD-03 | Live with INSTANT moderation shows Photo only after valid commit and PUBLISHED; APPROVAL leaves PENDING invisible until authorized approval; HIDDEN/deleted/purged never visible. | E |
| T-09 | Gateway race, PD-03 | Previously issued media ticket fails on next fetch after hide/delete/revoke/hold/access expiry; list/detail and media use same album/photo predicate. | E |
| T-10 | Security, PD-03/06 | IDOR across albums/photos, forged cursor/context, and access from unauthorized viewer do not reveal metadata or bytes; 401/403/404/410 match reviewed privacy contract. | B/E |
| T-11 | Permission/actions, PD-06 | Viewer Like/share/download attempts denied under initial read-only proposal; capture guest actions still obey existing flags and unique Like rule. Re-test if Gate E approves more capabilities. | E |
| T-12 | Contract, PD-08, H58 | Cover JPEG/PNG/WebP at 1920×1080 accepted within existing cover byte cap; wrong dimensions/type/oversize/truncated payload rejected; frontend guidance agrees. | F |
| T-13 | Contract, PD-09/10, H58 | Exact portrait 1080×1440 and landscape 1440×1080 true-alpha PNG accepted as frame; fake extension, opaque PNG and wrong orientation rejected. Activation with one variant follows Gate C decision. | C/F |
| T-14 | Security asset, PD-08/09 | Magic bytes, decoded dimensions, true alpha and byte limit rechecked server-side after upload; decompression bomb/oversized metadata rejected with private staging cleanup. | F |
| T-15 | Authorization asset, PD-09/11 | Only Owner/active `can_setup` collaborator for same album can authorize/commit/select frame; cross-album asset IDs and revoked collaborator fail. Cover permission preserved. | C/G |
| T-16 | Boundary race, PD-11 | At server time exactly `capture_start`, frame add/change/remove, late upload commit and concurrent PATCH all fail without altering selection; stale revision fails. | C/G |
| T-17 | Schedule/version, PD-11 | Permitted pre-event reschedule and first-confirmed rules leave deterministic freeze boundary; pending attempt keeps a stable effective frame version through retry. | D/G |
| T-18 | Unit/browser, PD-10/12, H69 | Guest can choose one system LUT per shot including Normal; preview and final JPEG show LUT then frame overlay, orientation/crop correct; no second overlay in Gallery/ZIP. | D |
| T-19 | API/storage, PD-12 | Persist exactly one final JPEG per committed Photo, ≤700000 bytes, valid magic/MIME, no EXIF/location leak or permanent raw; process failure does not commit. Test 700000/700001 boundary. | D/F |
| T-20 | Reservation/offline, PD-12 | Offline before shutter cannot reserve; retake/release/expiry returns quota once; retry PUT/commit with same attempt is idempotent and does not create duplicate Photo or new job. | D |
| T-21 | Migration, PD-01/04 | All existing albums backfill as DELAYED with unchanged delay, UTC `reveal_at`, capture/retention/payment deadlines and historical jobs. None becomes Live by default. | A/G |
| T-22 | Client compatibility | Old generated client/schedule consumer behavior is explicitly tested against negotiated response/version, including Live rows, without interpreting `0` or invalid null. | G |
| T-23 | Rollback/recovery | Rollout can stop Live writes, preserve Live data safely, restore old delayed reads, supersede stale jobs, and verify counts/instants against backup. | G |
| T-24 | Browser/device, PD-13, H69 | Switch control visible before/after permission and with one camera; enabled when switch is supported; honest localized unavailable/busy/denied states. Fullscreen remains without header/footer/preferences. | — |
| T-25 | Physical iPhone Safari + Android Chrome, PD-12/13 | Front/back switching, permission denial, viewport safe areas, stream cleanup on exit, portrait/landscape frame parity and 700000-byte processing on slow device. Synthetic browsers do not satisfy this. | D |
| T-26 | Load/soak, PRD NFR-04 | Burst **500 uploads starting within one second** on hot album; measure success, p95/p99 reservation/commit/Gateway latency, quota lock contention, CPU/memory, queue, storage and cost; include 2,000 guests and 10,000-photo album. Do not claim pass before measured target and thresholds are reviewed. | D/F/G |
| T-27 | Regression, unchanged rules | Free30/max10000, payment cutoff `capture_end-120m`, no refund, soft-delete quota, D+30/D+37/D+51, Owner recovery, collaborator permission, Admin hold/MFA, export revision/ZIP, no device photo import remain unchanged. | G |
| T-28 | Documentation/content | PRD/BPMN/DFD/ERD/Permission/API Contract/OpenAPI/generated client, Host and Guest ID/EN copy all agree after sign-off; H06/H07 legal remain draft until separate approval. | A–G |

## Validation for this documentation PR

Check all seven documents exist; every PD-01–13 is represented in the product matrix and linked to a test; gates A–G appear in risk/API/data/flows; markdown links resolve; `git diff --check` is clean; `pnpm api:check` finds no drift. There is no value in running camera, database or backend tests for unchanged runtime. A docs-only PR cannot satisfy T-01–T-28; these become acceptance criteria for a later approved implementation.
