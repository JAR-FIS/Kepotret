# Kepotret frontend

This repository contains the Kepotret V1 frontend foundation (FE-0). Product features are intentionally not implemented in this bootstrap.

## Local development

The project is pinned to Node.js `24.21.0` and pnpm `10.27.0` through Corepack.

```bash
corepack enable
pnpm install
pnpm dev
```

Quality commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

The authoritative OpenAPI contract is committed at
`contracts/openapi/Kepotret_OpenAPI_v1_Baseline.yaml`.

Generated API code is written to `src/lib/api/generated` by `pnpm api:generate`.
Use `src/lib/api/browser.ts` for browser-facing imports; internal service
operations remain isolated under `src/lib/api/generated/internal`.

```bash
pnpm api:generate
pnpm api:check
```
