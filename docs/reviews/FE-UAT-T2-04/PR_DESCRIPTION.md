## Summary

- Complete H91 description width and localized bottom guidance (UAT-T2-35/36).
- Make H91/H92 TOTP requirements and rejected characters understandable, repair the expired/mismatched synthetic Owner fixtures, and preserve step-up, CSRF, confirmation, server authority, and private-media expiry behavior (UAT-T2-37/38/39).
- Replace raw Admin `HTTP xxx` fallbacks with safe localized status guidance and cover hostile API error payloads (UAT-T2-44).

## Security and contract

- No backend, database, migration, OpenAPI, generated client, or locked product-rule change.
- UI mutations remain blocked after failed MFA; stale H91 media cannot reappear after grant expiry or revoke.
- H91 revoke now performs an extra frontend step-up. OpenAPI still specifies Admin session + CSRF for revoke, so this PR does not claim server-side MFA enforcement for that endpoint.
- Owner issues remain open. Synthetic engineering verification is not Owner acceptance.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` — 281 passed
- `pnpm api:check`
- `pnpm build`
- `pnpm uat:smoke` — 2 passed
- Focused H91/H92 Playwright `--retries=0` — 28 passed across configured desktop/mobile browsers, 1 evidence-only skip
- Guest Owner UAT `--retries=0` — 36 passed
- Screenshot capture — 1 passed, five synthetic images
- Full Playwright — 205 passed / 3 evidence-oriented skips; no reported flaky tests

Traceability, reproduction evidence, UAT URLs, screenshots, and remaining dependencies: [FE-UAT-T2-04 review](https://github.com/JAR-FIS/Kepotret/blob/fix/fe-uat-t2-04-privileged-safe-errors/docs/reviews/FE-UAT-T2-04/README.md).
