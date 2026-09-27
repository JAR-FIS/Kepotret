# FE-6 API contract corrections

Date: 2026-09-27  
Scope: frontend contract corrections for FE-6 payment, export, lifecycle, recovery, and rescheduling screens.

## Why the contract changed

The approved FE-6 flows require server-owned decisions that the baseline contract did not project to browser clients. Before this correction, checkout creation returned no navigation target or immutable purchase snapshot; album package options did not express eligibility or an active checkout; histories could not page; export capabilities did not authorize selected mode; export jobs omitted truthful progress and output expiry; lifecycle responses omitted an explicit server state and recovery actions; recovery media had no Owner-only view; and schedule responses omitted the timezone and reschedule bounds.

## Contract changes

- Album package options now return current quota/counts, cutoff and server time, server eligibility/block reason, active checkout summary, and only higher eligible package targets.
- Payment creation returns an ephemeral HTTPS checkout target plus immutable transaction snapshots. Public status is `PENDING | SUCCESS | FAILURE | EXPIRED`; internal `PROCESSING` remains defined only for internal state projection. Payment history supports cursor pagination.
- Export capability includes `allow_selected`. A read-only selection projection is available only when the server permits selected exports. Export history is paginated. Jobs expose processed and total item counts and output expiry. Download returns a short-lived HTTPS delivery descriptor, not ZIP bytes or a storage locator.
- Lifecycle projection carries the server retention state/time, fixed deadlines, and recovery action flags. The Owner-only recovery media projection exposes only currently available media and download capability.
- Schedule projection includes the persisted IANA timezone, server time, current reschedule eligibility and server-provided start bounds. Reschedule writes require the expected schedule version.
- The logical/physical table inventory reference is synchronized to 44 existing tables after FE-3. This contract update adds no table, migration, worker, or service implementation.

## Authorization and implementation boundary

All eligibility, lifecycle, permission, cutoff, active-checkout, selection-size, and download authorization decisions remain backend-owned. The browser does not interpret provider return query parameters as payment status, proxy ZIP bytes, store delivery targets, restore recovery photos, or commit a reschedule before server confirmation. FE-6 implements browser screens and generated clients only; payment provider integration, Go services, database migrations, and background workers remain outside this change.

Regenerate the Orval client after editing `contracts/openapi/Kepotret_OpenAPI_v1_Baseline.yaml`, then run `node scripts/check-openapi.mjs` to verify freshness.
