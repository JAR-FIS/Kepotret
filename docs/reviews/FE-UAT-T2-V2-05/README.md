# FE-UAT-T2-V2-05 — Help guides and public footer

## Baseline and Owner status

This frontend batch starts from clean `main` at PR #36's squash commit `3548a21bbd377ff2fc9a59f8e57b1adb6904635b`. The feature branch is `fix/fe-uat-t2-v2-05-help-footer`. The immutable final HEAD and hosted run are reported in PR checks and the Phase A completion report; a commit cannot contain its own SHA.

| Owner ticket | Before | Change | Owner route and synthetic evidence | State |
| --- | --- | --- | --- | --- |
| UAT-T2-40 — Admin guide footer | The shared Help frame ended after the Admin guide content. | One semantic footer follows the Admin guide, with localized Home and Guides links. Search and the 11-section contents remain. | [Admin guide](http://localhost:3000/help/admin?uat=normal): [ID/Light desktop](evidence/synthetic-admin-desktop-1440-id-light.png), [EN/Dark mobile](evidence/synthetic-admin-mobile-390-en-dark.png). | **REOPENED; OWNER RECHECK PENDING** |
| UAT-T2-41 — Host guide footer | The 19-step Host guide had no footer. | The same footer follows all 19 steps and the final CTA in document flow. | [Host guide](http://localhost:3000/help/host?uat=normal): [ID/Light desktop](evidence/synthetic-host-desktop-1440-id-light.png), [EN/Dark mobile](evidence/synthetic-host-mobile-390-en-dark.png). | **REOPENED; OWNER RECHECK PENDING** |
| UAT-T2-42 — Collaborator guide footer | The Collaborator guide had no footer. | The same footer follows guide content; localized search and empty/reset states remain. | [Collaborator guide](http://localhost:3000/help/collaborator?uat=normal): [ID/Light desktop](evidence/synthetic-collaborator-desktop-1440-id-light.png), [EN/Dark mobile](evidence/synthetic-collaborator-mobile-390-en-dark.png). | **REOPENED; OWNER RECHECK PENDING** |
| UAT-T2-45 — public Help group guide link | The public footer Help group linked to `/bantuan` and `/keamanan` but not the existing guides landing page. | Adds exactly one localized `Panduan` / `Guides` link to `/help` in the existing group. Both existing links remain. | [Public Help page](http://localhost:3000/bantuan): [ID/Light desktop](evidence/synthetic-public-help-desktop-1440-id-light.png), [EN/Dark mobile](evidence/synthetic-public-help-mobile-390-en-dark.png). The same shared footer is checked on `/`. | **NEW; Owner state unassigned** |

Screenshots are **synthetic local browser evidence**, captured at the footer viewport with `?uat=normal`; they do not prove live API access or physical-device behavior. They show no session credentials, private media, operational IDs, or fixture secrets. Owner Visual Recheck is deferred until the correction batches are independently reviewed and merged. No ticket is marked SOLVED.

## Changes and design decisions

- `src/features/help/help-frame.tsx` renders one compact footer after `{children}` for `/help` and all three guides. It uses existing color tokens, `next/link`, 44 px link targets, keyboard focus styling, and a mobile stack to keep links clear of the floating support widget. The footer stays in document flow and does not add a second `main`.
- `src/features/help/content.ts` adds only localized footer navigation, Home, and Guides labels. Both footers now call `/help` `Panduan` / `Guides`; the public `/bantuan` link retains `Pusat Bantuan` / `Help Center`.
- `src/features/marketing/components/site-footer.tsx` and `src/features/marketing/content.ts` add the localized `/help` link in the existing public footer Help group. Product, social, legal, support, and copyright links remain unchanged.
- `tests/e2e/help.spec.ts` checks footer order and uniqueness, all 19 Host steps and CTA, mobile clickability, the public link and destination, keyboard Tab focus, ID/EN Light/Dark widths, and captures the eight screenshots. `tests/features/marketing/site-footer.test.tsx` checks both locales and preservation of `/bantuan` and `/keamanan`.

No new component, route, endpoint, dependency, permission path, or authentication behavior was needed. `/help` remains the public guides landing page; `/help/admin` is not used as the public footer destination. Guest camera and Gallery fullscreen surfaces are untouched.

## Validation and security review

| Check | Result |
| --- | --- |
| `pnpm lint`, `pnpm typecheck`, `pnpm api:check`, `pnpm build`, `git diff --check` | Passed locally. |
| `pnpm test` | Final isolated run: 42 files, 288 tests passed. The first sandboxed launch could not spawn esbuild (`EPERM`). A later parallel quality run had one unrelated Guest Gallery lazy-thumbnail test time out at 20 seconds; the isolated rerun passed all 288. No code or timeout setting was changed for that test. |
| `playwright test tests/e2e/help.spec.ts --project=chromium --retries=0` | 4 passed, 1 evidence-only skip. The mobile Host footer link was clicked successfully. |
| `playwright test tests/e2e/admin-configuration-guidance.spec.ts tests/e2e/homepage.spec.ts --project=chromium --retries=0` | 20 passed, 1 evidence-only skip. Existing guide search/clear, homepage and Admin behavior passed. |
| `UAT_CAPTURE_EVIDENCE=1 playwright test tests/e2e/help.spec.ts --grep 'capture synthetic T2 Help/Footer evidence' --project=chromium --retries=0` | 1 passed; eight screenshot files captured. |
| [Hosted CI on originally reviewed HEAD `2383553`](https://github.com/JAR-FIS/Kepotret/actions/runs/39540245481) | Quality passed with 288 unit tests; full E2E 244 passed/5 evidence-only skipped, no retry passes; privileged Admin 28 passed/1 skipped; Guest Owner UAT 40 passed. M1 needs checks on its new HEAD. |
| M1 local quality: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm api:check`, `pnpm build`, `git diff --check` | Passed; 42 unit files and 288 tests passed. |
| M1 focused `playwright test tests/e2e/help.spec.ts --project=chromium --retries=0`; synthetic evidence capture | 4 passed/1 evidence-only skipped; screenshot capture 1 passed. ID/EN guide label, `/help` navigation, public `/bantuan` navigation, keyboard and responsive checks passed. |
| Hosted quality, full browser E2E, privileged Admin, Guest Owner UAT on final M1 HEAD | Pending push. PR #37 Checks and the Phase A report will record final results. |

The first new responsive run detected 320 px overflow on `/` when an already loaded desktop carousel was shrunk. The existing H01 homepage regression passed; initializing each route at the target mobile width made the new page-width check deterministic, and it then passed. **Separate H01 regression follow-up:** load `/` at desktop width, resize the loaded page to 320 px, compare `document.documentElement.scrollWidth` and `clientWidth`, then isolate the carousel sizing and confirm the root cause. This batch does not claim that live desktop-to-mobile resizing is robust. Visual inspection also found the floating support widget covering the mobile Help footer's right-hand link; stacking links on mobile resolved this, and the mobile link click plus recaptured screenshot verified it.

## Independent review follow-up on PR #37

The review of `2383553b8a97998916a25b7142cac043abf1c3d4` requested one Medium correction (M1): the new guide footer called `/help` `Pusat bantuan` / `Help center`, while the public footer uses that label for `/bantuan`. The guide footer now calls `/help` `Panduan` / `Guides` in ID/EN. Focused tests follow both destinations and retain the public support and security links. The six guide screenshots were regenerated; public footer screenshots remain linked above. No role navigation, route, API or permission changed. Independent re-review is required on the new HEAD before any merge.

Links use fixed, existing internal routes. No footer displays API responses or sensitive values. Existing guide search, section anchors, language/theme controls, Admin authority, sessions, MFA and CSRF are unchanged. Backend, database, migrations, OpenAPI, generated clients, and product rules remain **ON HOLD / unchanged**. The H91 revoke server-side MFA contract dependency remains for future backend/security review. H80 authoritative cross-page sorting is still pending separate API approval; it is outside this batch.
