# Kepotret frontend

This repository contains the Kepotret V1 frontend foundation and shared FE-1 UI primitives. Product features are intentionally not implemented in this bootstrap.

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

## Optional error telemetry

The Sentry SDK is installed, but telemetry is disabled unless both
`NEXT_PUBLIC_SENTRY_ENABLED=true` and `NEXT_PUBLIC_SENTRY_DSN` are supplied in
the build/runtime environment. No Sentry project values or credentials are
committed. The baseline disables traces, request bodies, cookies, headers,
query parameters, user identification, and sensitive event fields. Source map
upload is not configured; it can be enabled after a Sentry project is provisioned.
