# FE-3 API contract gaps

These gaps keep FE-3 partial. The frontend follows the generated client and does not add local substitutes for missing server state.

- **FE3-CONTRACT-GAP-01:** Album/Event basics required by H28 are not represented in `AlbumPatchRequest` beyond timezone. V1 exposes timezone editing only; event name, location, and category are unavailable.
- **FE3-CONTRACT-GAP-02:** No draft package-selection write contract exists. H33 can display saleable package options, but any local choice would remain provisional and is not persisted.
- **FE3-CONTRACT-GAP-03:** `ConfirmSetupRequest` contains only `expected_setup_revision` while endpoint rules require persisted `confirmed_package_version_id` for paid activation. A safe paid confirmation flow cannot be represented by this request.
- **FE3-CONTRACT-GAP-04:** The review endpoint returns `AlbumEnvelope` rather than a dedicated completeness checklist/setup snapshot required for full H35 review UX.

H36 activation depends on gaps 02, 03, and 04. The UI may display readiness returned by the server, but cannot safely claim to complete paid/free package confirmation or manufacture READY/PAYMENT_PENDING transitions.

## FE-3 completion matrix

| Surface | State |
| --- | --- |
| FE-3.1 Host shell | Implemented |
| FE-3.2 Dashboard/list | Implemented |
| H28 Event basics | Partial: timezone only (gap 01) |
| H29 Schedule & reveal | Implemented against generated schedule contract |
| H30 PIN | Implemented |
| H31 per_guest_limit | Implemented |
| H32 Design | Contract-limited / unavailable |
| H33 Package selection | Read-only catalog, provisional (gap 02) |
| H34 Collaborator invitation | Implemented |
| H35 Review | Server status fields only (gap 04) |
| H36 Activation | Server readiness display only; confirmation remains blocked by gaps 02/03/04 |

Overall: **FE-3 PARTIAL — API CONTRACT REVIEW REQUIRED**.
