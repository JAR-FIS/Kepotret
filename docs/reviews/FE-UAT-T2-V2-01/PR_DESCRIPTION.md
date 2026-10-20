## Summary

- Give H69 a dedicated fullscreen, safe-area-aware camera view with shutter and an available-camera switch. Match captured crop and front-camera mirror to the preview; keep server readiness, CSRF, and idempotent reservation checks.
- Recompose H70 review with the existing H09/404 frame, preferences above the card and a localized Home link below. Keep the photo and reservation across preference changes.
- Use concise H71 “Take again” / “Ambil ulang” copy and state-specific H72 waiting, closed, publication countdown, and revealed guidance.

## Validation

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (281 passed), `pnpm api:check`, `pnpm build`, `git diff --check` passed locally.
- Guest capture Chromium: 23 passed with `--retries=0`; focused H69/H70 cross-browser: 5 passed with `--retries=0`.
- Guest Owner UAT desktop/mobile: 36 passed with `--retries=0`; Owner catalog smoke: 2 passed.
- Full Playwright matrix with `--retries=0`: 215 passed, 3 existing evidence-only skips, no flaky passes. Hosted checks are pending.

Issue traceability, security review, before/after synthetic screenshots, Owner UAT links, and real-device checklist: [FE-UAT-T2-V2-01 handoff](https://github.com/JAR-FIS/Kepotret/blob/fix/fe-uat-t2-v2-01-camera-h69-h72/docs/reviews/FE-UAT-T2-V2-01/README.md).

## Remaining verification

H69 needs Owner testing on real iPhone Safari and Android Chrome. Synthetic browser tests cannot prove physical front/back camera selection, permission UI, or actual photo framing. Browser device enumeration may hide the switch when it cannot identify a distinct active device. Owner issues remain open for Visual Recheck. Backend remains ON HOLD; the existing H91 revoke server-side MFA contract dependency is unchanged.

Stop after Phase A. Independent review and explicit Owner approval are required before merge.
