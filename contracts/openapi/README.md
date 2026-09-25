# OpenAPI contract boundary

`Kepotret_OpenAPI_v1_Baseline.yaml` is the authoritative OpenAPI 3.1 source
for the generated frontend client and types. It is copied without semantic
changes from the supplied baseline artifact.

The committed contract is the authoritative integration baseline for frontend
and backend work. Any semantic contract change still requires architecture and
API approval before the OpenAPI YAML or generated client baseline is changed.
The `x-kepotret-final-lock` marker remains unchanged by frontend foundation
work.

Orval writes generated output to `src/lib/api/generated`. The generated
`internal` tag is intentionally excluded from the browser-facing barrel at
`src/lib/api/browser.ts`; `/internal/v1/*` operations are service boundaries,
not ordinary browser application APIs.
