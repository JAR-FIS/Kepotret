# Kepotret product and architecture contract audit v0.6

**Status:** documentation and contract proposal only. The 13 product decisions in the Owner addendum are **OWNER APPROVED**. Every API shape, persistence choice, and architecture alternative in this package is **TECHNICAL PROPOSAL** until independent architecture/API review. Backend remains **ON HOLD**; this package is not an implementation authorization.

## Source and scope

Baseline: `main` at `1600e0d1a8d7101f6fad522208406f99a4ff7919` (23 October 2026, after PR #42). The external package was read in order: `01_OWNER_PRODUCT_DECISION_ADDENDUM.md`, `02_ARCHITECTURE_API_IMPACT_AND_DECISION_GATES.md`, `03_CODEX_CONTRACT_AUDIT_ENGINEERING_BRIEF.md`, then its `README.md`, under `Downloads/Kepotret_Product_Architecture_Contract_v0_6_2026-10-23/Kepotret_Product_Contract_v0_6/`.

Approved baseline documents inspected under `Downloads/SELF EMPLOYEE/DOKUMEN KEPOTRET/`: PRD v0.5 Final; BPMN & Use Case v0.5 Final; DFD & ERD v0.5 Final; Permission and Authorization Model v0.2 Final; System Architecture v0.3 Final; Physical Database Design v0.3 Final; API Contract v0.1 Final; and Technology and Provider Selection v0.2 Final. Repository evidence: [`contracts/openapi/Kepotret_OpenAPI_v1_Baseline.yaml`](../../../contracts/openapi/Kepotret_OpenAPI_v1_Baseline.yaml), [`contracts/openapi/README.md`](../../../contracts/openapi/README.md), generated client/types (read only), `src/features/guest/{components,capture}`, `src/features/host/{components,schedule-validation.ts}`, route catalog, and prior FE-UAT handoffs. The addendum supersedes older rules **only where it expressly says so**.

The `1. Kepotret_Final_Frontend_Recheck_Seluruh_Halaman_2026-10-22.xlsx` workbook was inspected read only. Its `01 Final Recheck` sheet contains `UAT-FINAL-001` through `UAT-FINAL-102` (102 IDs). The engineering brief refers to a “107-item final audit,” but the supplied workbook has no `UAT-FINAL-103` through `107`; mapping those five would be invented. The separate `2. Kepotret_Final_Owner_Recheck_V2_08_2026-10-23.xlsx` has `01 Recheck 31` and `02 Approved 71` sheets. Neither workbook converts this audit into final Owner visual approval.

## Deliverables

| Document | Purpose |
|---|---|
| [Product change matrix](PRODUCT_CHANGE_MATRIX.md) | PD-01–13, superseded and preserved rules, page/UAT traceability |
| [Flow and state proposal](FLOW_AND_STATE_PROPOSAL.md) | Viewer/capture, reveal, frame freeze, processing, races and failures |
| [API contract proposal](API_CONTRACT_PROPOSAL.md) | Existing vs proposed schemas, operations, scopes, errors and compatibility |
| [Data impact](DATA_IMPACT.md) | DFD/ERD, storage, quota, migration and rollback proposal |
| [Risk and decision register](RISK_AND_DECISION_REGISTER.md) | P0/P1 risks and open gates A–G |
| [Test contract matrix](TEST_CONTRACT_MATRIX.md) | Contract, security, load, device and migration acceptance tests |

## Findings, ordered by severity

| Severity | Finding | Evidence and disposition |
|---|---|---|
| **Critical** | A naive Live implementation could expose a committed but PENDING/HIDDEN/deleted photo, or serve a previously issued ticket after hold/revoke. | PRD BR-08/FR-12/FR-13, Permission §8, Architecture §10 and OpenAPI Guest Gallery/Media Gateway require current authorization. The proposed gate is per request and per media fetch; Gate E remains open. |
| **High** | Existing schedule schema only permits `{1,3,5,7}` and `RevealState` alone cannot express Live while capture is open. | OpenAPI `ScheduleWriteRequest`, `AlbumSchedule`, `RevealState`; Host schedule choice. Use explicit policy proposal; no `delay=0`. Gate A/G. |
| **High** | Current Gallery requires `/guest/me`, which returns a named capture `GuestSession`; anonymous read-only viewing would pollute guest counts or grant capture if modeled as that session. | OpenAPI `GuestContext`, `GuestSessionCreateRequest`, Gallery `GuestCookie`; PRD BR-25 and Permission §8. Distinct scoped principal proposal, Gate B/E. |
| **High** | A browser-composited JPEG plus claimed LUT/frame IDs does not prove the actual pixels include those effects. Server rendering changes the direct upload architecture and burst cost. | Current `capture-processor.ts`, direct R2 flow in Architecture v0.3. Gate D/F must resolve enforcement and transient raw handling. |
| **High** | Frame mutations must fail at the server clock boundary, including asset upload/commit and concurrent schedule edits; disabling a UI button is insufficient. | PD-11, current cover-only design API. Versioned design/freeze proposal and race tests, Gate C/G. |
| **Medium** | Existing cover upload accepts 5 MB MIME only in the frontend; required intrinsic 1920×1080 and true-alpha frame validation need contract and byte-level policy. | `DesignAssetAuthorizeRequest` is `COVER` only; `design-setup.tsx` checks type/size. Gate F. |
| **Medium** | H69 hides camera switch when `enumerateDevices()` does not expose a second ID. | `guest-entry-surfaces.tsx:96`, `guest-entry-flow.tsx:658`; PD-13 overrides this. No backend endpoint required. |
| **Low** | Brief calls the final audit 107 items; available final workbook contains 102 IDs. | Source discrepancy recorded above; traceability uses verifiable IDs only. |

## Contract and document sync after gates

The later implementation plan must update PRD BR-06/08/25 and FR-02A/03/06/08/12/13; BPMN guest entry, capture, reveal and moderation; DFD/ERD and Physical Database; Permission Model; API Contract v0.1; **source OpenAPI first**, then generated clients; frontend H07/H29/H58/H64/H65/H69/H73 and related setup/review/reschedule/gallery states; ID/EN help and marketing copy that states four delayed choices. H06/H07 legal text remains draft and needs separate legal approval. Existing media Gateway, quota, payment and retention rules remain in force.

## Validation and handoff

This PR changes only these review documents. No service, migration, OpenAPI source, generated client, environment, authentication, or runtime behavior changes are made. Reviewer should resolve [gates A–G](RISK_AND_DECISION_REGISTER.md) before an implementation contract is approved. See the PR checks for validation and exact reviewed HEAD; **stop before merge for independent architecture review**.
