# Risk and technical decision register

The Owner has already approved PD-01–13. The gates below concern **implementation choices**, not a request to re-approve those product outcomes. **BLOCKED/UNVERIFIED** means no backend contract or implementation may claim the associated behavior yet. P0 is privacy/data correctness or contract-blocking; P1 is important interoperability, reliability or UX.

| Gate / priority | Question and recommendation (**TECHNICAL PROPOSAL**) | Decision owner and evidence required | Status |
|---|---|---|---|
| A / **P0** | Choose explicit `LIVE` vs `DELAYED(1/3/5/7)` JSON and separate gallery availability; reject `delay=0`. Define `reveal_at` in Live, omission/default and 409/422. | Architecture + API review of schedule schema, state projections, old-client compatibility and PRD/BPMN diff. | **OPEN** |
| B / **P0** | Define distinct viewer credential/scope, cookie topology, TTL, rotation/PIN invalidation, CSRF and safe context. Recommend read-only scoped principal, no GuestSession. | Security + architecture review; threat model, cross-origin cookie test, count/consent tests, 401/403/404/410 privacy contract. | **OPEN** |
| C / **P1** | Decide whether enabling a frame requires both portrait and landscape variants. Recommend both to avoid inconsistent orientation output; define missing-asset fallback explicitly. | Product/UX confirmation + API/design review; both device orientations. PD-09 itself is already approved. | **OPEN** |
| D / **P0** | Decide browser-composited final JPEG vs canonical server composition, strict visual enforcement, snapshot timing and burst budget. Browser option fits existing direct PUT but metadata cannot prove pixels. Server option enforces output but adds transient processing and cost. | Owner + Engineering architecture ADR, adversarial pixel test, mobile perf, 500 starts/sec load and storage/retention design. | **OPEN** |
| E / **P0** | Specify Live eligibility under INSTANT/APPROVAL and exact viewer Like/share/download rights. Recommend only committed `PUBLISHED` photos and initial `GALLERY_READ` viewer scope; no invented viewer Like identity. | Product + Security; permission matrix and Gateway concurrency/revocation tests. | **OPEN** |
| F / **P0** | Set frame PNG input byte cap, decoded-pixel/alpha limits and any transient raw retention/security constraints. Existing 5 MB cover and 700000-byte final JPEG limits are distinct. | Security + architecture; decompression tests, storage lifecycle and vendor/provider limits. | **OPEN** |
| G / **P0** | Define migration, old-client negotiation/versioning, Live rollback, derived job/read consistency and frame/schedule revisions. Preserve all delayed album instants. | Architecture/API/data review; rehearsed migration and rollback with old clients and historical albums. | **OPEN** |

## Risks and controls

| Risk | Severity | Control / unresolved evidence |
|---|---|---|
| Live exposes PENDING/HIDDEN/deleted photo or stale ticket after hold/revoke | **Critical** | Shared server eligibility predicate at list/detail/Gateway, current moderation/access version per fetch; tests T-08–T-11. Gate E. |
| Viewer credential gains capture rights or increments `guest_count_final` | **Critical** | Separate principal namespace, deny capture APIs by server scope, no GuestSession row; tests T-04–T-07. Gate B. |
| Browser sends a correctly labeled but unframed/unfiltered JPEG | **High** | Do not assert server pixel verification for browser pipeline; Gate D ADR must choose acceptable trust or server compositor. |
| Frame changes after `capture_start` through authorize/commit/race | **High** | Server-clock transactional freeze on every mutating entry point, immutable version/snapshot; T-16–T-18. Gate C/G. |
| Existing delayed albums misread as Live or reveal at shifted time | **High** | Explicit backfill, historical instant preservation, old-client plan and rollback; T-21–T-23. Gate A/G. |
| Crafted cover/frame decompression or disguised PNG | **High** | Magic/decode/geometry/alpha/byte checks, bounded decode, private staging cleanup; T-14–T-15. Gate F. |
| 500 upload starts/sec collapses if server processing added | **High** | Benchmark hot album quota lock, CPU/memory, storage and gateway; avoid declaring target met from local E2E. Gate D/F. |
| Anonymous viewer Like/share/download identity or leakage unspecified | **High** | Initial read-only recommendation, explicit action caps and denial; product/security decision Gate E. |
| Camera switch hidden on permission-limited devices or leaves stream running | **Medium** | Always-visible UI, capability/fallback state and real-device lifecycle tests T-24–T-25. |
| Legal H06/H07 or separate UAT issues treated as approved by this audit | **Medium** | Keep legal content draft/unapproved, track H27/H42/footer/Guest ZIP/H80/H91 separately. |

## Architecture ADR needed for Gate D

| Option | Data path | Benefits | Material cost/risk |
|---|---|---|---|
| Browser compositor | Client captures, applies versioned LUT/frame, compresses final JPEG, private direct PUT; server verifies bytes/type/size, snapshot IDs, checksum and commit. | Matches existing direct-to-storage design; immediate preview and less server CPU. | Metadata and hash cannot prove pixels carry the LUT/frame. Browser canvas/device variance and tampering need explicit trust acceptance. |
| Server compositor | Client sends transient capture input through reviewed bounded ingest; server applies canonical LUT/frame and writes only final ≤700000-byte JPEG as Photo. | Enforces canonical output if implemented and verified. | Transient raw handling, privacy, resource use, burst latency/cost, retry/idempotency and new API/storage path; no raw permanent backup. |

An optional hybrid verifier is not assumed to solve pixel proof without a specified algorithm and measured false results. The ADR must state trust boundary, definition of “final only persisted,” transient cleanup, preview parity, and failure/retry semantics. No implementation choice is locked here.

## Review exit criteria

Record signed decisions for A–G and any new product ambiguity; align PRD/BPMN/DFD/ERD/Physical DB/Permission/API Contract; review a source OpenAPI diff and compatibility rollout; approve the test matrix and privacy threat model. Then, in a separate authorized implementation, regenerate clients and run backend/frontend/integration/device/load tests. Backend remains **ON HOLD** until separately released. This documentation PR stops before merge for independent architecture review.
