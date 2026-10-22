# FE-UAT V2-08B — public UX, copy, controls, and fade-in handoff

Baseline: merged V2-08A PR #40 on `main` at `f94bf7e4761db4aec05080ce2546803ea0359776`. Branch: `fix/fe-uat-v2-08b-public-ux-copy-fadein`. Backend remains **ON HOLD**. This is engineering and synthetic browser evidence, not Owner acceptance or legal approval.

## Owner traceability

| Owner item | Before | PR B result | Evidence |
| --- | --- | --- | --- |
| UAT-FINAL-014/015/016/023 · H14/H15/H16/H23 | Language/theme controls were inside each auth card. | The four routes place one shared language/theme control group to the right of the logo, above the card. Google start, processing, failure/retry, and re-auth routing remain intact. System and invitation pages retain their prior frame behavior. | [Desktop H14](evidence/h14-auth-desktop-1440-id-light.png), [mobile H14](evidence/h14-auth-mobile-390-en-dark.png), browser regression |
| UAT-FINAL-029 · H29; H53 linked regression | Reveal selection was a dropdown with an unsupported LIVE preview choice. | A native fieldset/radio chip group offers only D+1, D+3, D+5, D+7. H53 reuses it and remains disabled when the server says rescheduling is unavailable. Schedule validation, confirmation, timezone, and write payload remain server-governed. | [Desktop H29](evidence/h29-schedule-desktop-1440-id-light.png), [mobile H29](evidence/h29-schedule-mobile-390-en-dark.png), browser regressions |
| UAT-FINAL-033/035 · H33/H35 | Paid package choice and review repeated photo quota after the name and price. | Paid choice shows API package name and formatted API price. Review reconciles the selected version ID with the catalog and shows the same price. The free choice and unavailable-catalog fallback remain. | [H33 desktop](evidence/h33-packages-desktop-1440-id-light.png), [H33 mobile](evidence/h33-packages-mobile-390-en-dark.png), [H35 desktop](evidence/h35-review-desktop-1440-id-light.png), [H35 mobile](evidence/h35-review-mobile-390-en-dark.png) |
| UAT-FINAL-058 · H58 | Cover help stated accepted types and byte limits, with no pixel recommendation. | The generated design upload contract confirms JPEG/PNG/WebP and an exact 5,000,000-byte maximum. No approved pixel dimensions or aspect ratio were found; the existing grounded upload help remains, and pixel guidance is deferred. The `Image` preview dimensions are presentation hints only. | Contract review; no invented pixel claim |
| UAT-FINAL-079 · H79 | Account status used a native browser select. | The shared branded Select presents All/Active/Suspended. Its `''`, `false`, `true` query values, cursor reset on Apply, and server filtering are verified. | [Desktop](evidence/h79-users-desktop-1440-id-light.png), [mobile](evidence/h79-users-mobile-390-en-dark.png) |
| UAT-FINAL-084 · H84 | Create-version link appeared beside one version; Retire used bright `#ff8282`. | Each package card has one lime create-version link beside plain-language immutable-history guidance, above its version list. Retire is compact with `#fff0ef` and dark red foreground. Sale status, version identity, confirmation, and Admin authorization remain unchanged. | [Desktop](evidence/h84-catalog-desktop-1440-id-light.png), [mobile](evidence/h84-catalog-mobile-390-en-dark.png) |
| UAT-FINAL-102 · footer | Help contained a disabled “Hubungi Kami / Contact us” row. | Only that dead row was removed. `/bantuan`, `/help`, `/keamanan`, legal links, and social groups remain. The WhatsApp URL was not changed. | [Desktop](evidence/footer-help-desktop-1440-id-light.png), [mobile](evidence/footer-help-mobile-390-en-dark.png) |
| Owner public fade directive | Home had scroll-linked `h01-reveal`; other public information pages entered statically. | The shared keyframes now use visible 0.84 opacity and an 8 px rise. Home hero and public information/help pages enter for 300 ms with CSS only; Home lower sections retain the existing view timeline. Reduced motion disables the effect. Header/footer, forms, dialogs, and loading spinners do not animate. | [Home desktop](evidence/h01-home-desktop-1440-id-light.png), [Home mobile](evidence/h01-home-mobile-390-en-dark.png), [FAQ desktop](evidence/h04-faq-desktop-1440-id-light.png), [FAQ mobile](evidence/h04-faq-mobile-390-en-dark.png) |

Public FAQ and Host guest-guide copy now describe the four supported delayed reveal choices and server authorization in ID/EN. They no longer suggest that LIVE publication can be selected.

## Validation

- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test` — 42 files, 293 tests passed.
- `pnpm api:check` — passed; generated API client remains fresh.
- `pnpm build` — passed.
- Focused Chromium Playwright with `--retries=0` — 51 passed, 2 evidence-only tests skipped. Coverage includes H14/H15/H16/H23, H29/H53, H33/H35, H79, H84, footer, public motion and reduced motion, plus V2-08A navigation, Host/Collaborator access, and Guest saved/gallery gating. The separate synthetic evidence run passed (1 test). Hosted matrix results are reported on the PR checks for the exact final HEAD.
- After the first complete hosted e2e run exposed older assertions for paid-package quota text and guest-guide wording, the four affected browser files were updated and rerun locally with `--retries=0`: 15 passed, 1 evidence-only test skipped. The Help footer geometry check now waits for the 300 ms entrance animation to finish. Lint, typecheck, 293 unit tests, API drift, and build passed again after this follow-up.

Screenshots are marked **OWNER VISUAL UAT · SYNTHETIC FIXTURES**. They use deterministic browser API fixtures and include ID-light 1440 px desktop and EN-dark 390 px mobile. The browser regressions also cover 320 px overflow, no-JavaScript heading visibility, keyboard radio selection, menu navigation, and server-disabled states. Real devices, real OAuth, live backend, and Owner acceptance are separate gates.

## Dependencies and phased work

- Backend, database, auth/session contract, permissions, and OpenAPI remain unchanged and **ON HOLD**. The previously merged V2-08A Kelola/Lainnya navigation and capability-aware links remain covered by regression tests.
- Approved cover pixel dimensions/aspect ratio need an official design specification before they can be recommended in H58.
- The Owner supplied `https://wa.me/81387788811`; the existing app uses `https://wa.me/6281377888111`. These differ. The target needs authorized confirmation before any URL change.
- Guest multi-photo ZIP still depends on Gateway/CORS, media permission, file integrity, device save, and memory verification. The approved selection maximum remains 20. H80 global sorting still needs backend/OpenAPI support. H91 MFA revoke remains deferred.
- H42 Host Gallery and H06/H07 legal body content belong to V2-08C. Legal drafts are not legally approved. No Owner UAT ticket status is changed here.
- Stop before merge for independent code review and later Owner Final Recheck.
