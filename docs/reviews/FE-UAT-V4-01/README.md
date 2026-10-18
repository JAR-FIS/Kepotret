# FE-UAT-V4-01 engineering verification

This batch is limited to UAT-016 (H01 label alignment) and UAT-134 (H33 package layout). UAT-194's approved wording and the previously approved UAT-195, UAT-142, and UAT-179 corrections are preserved. Screenshots are synthetic engineering evidence and do not constitute Owner approval.

## Issue traceability

| Issue | Surface | Root cause | Correction and verification |
| --- | --- | --- | --- |
| UAT-016 | H01, fourth smartphone mockup | The approved label used block layout with centered text alignment, but no vertical container alignment. Its padding and minimum height left the line visually high in the lime label. | The label now uses flex centering on both axes, with the approved ID/EN text in a full-width centered text span. Playwright checks label/text box centers, clipping, overflow, locale/theme states, and widths 360, 390, 768, 1024, and 1440px. |
| UAT-134 | H33, package selection | `Math.floor(total / 2)` assigned the extra choice in an odd-sized list to the right column, producing 3-left/4-right for seven choices. | `Math.ceil(total / 2)` assigns the extra option to the left. This keeps API catalog order; mobile stacks the columns in DOM order. Vitest covers 1, 2, 5, and 7 total choices. Playwright checks 4-left/3-right, sequential order, mobile stacking, keyboard radio selection, and no overflow. Existing save-payload tests continue to cover authoritative package IDs and Free as `null`. |

No package identifiers, names, prices, capacities, or catalog records were added to production code. No API, backend, database, migration, or business-rule changes were made. No Owner UAT issue was marked SOLVED. Backend remains ON HOLD.

## Synthetic visual evidence

- `evidence/h01-desktop-1440-light-id.png`
- `evidence/h01-mobile-360-light-id.png`
- `evidence/h01-mobile-390-dark-en.png`
- `evidence/h33-desktop-1440-light-id.png`
- `evidence/h33-mobile-390-dark-en.png` (English and Dark Mode)

## Validation

| Check | Result |
| --- | --- |
| Focused tests | Passed: focused setup-flow Vitest 20/20; focused Chromium V3/V4 Playwright 3/3. |
| `pnpm lint` | Passed. |
| `pnpm typecheck` | Passed (`next typegen` and `tsc --noEmit`). |
| `pnpm test` | Passed: 39 files, 275 tests. |
| `pnpm api:check` | Passed; generated client is fresh and OpenAPI was unchanged. |
| `pnpm build` | Passed; optimized build generated all 42 static pages. |
| `pnpm uat:smoke` | Passed: 2/2. |
| `pnpm e2e` | Passed: 164/164 across Chromium, Firefox, WebKit, and mobile projects; 0 failed, 0 flaky. |
| `git diff --check` | Passed. |
| Hosted GitHub Actions | Pending PR creation |

The full E2E run initially exposed Windows write errors when legacy visual tests overwrote tracked historical PNGs. Those visual tests now write to Playwright's per-test output directory. The final full run passed without changing historical screenshots. E2E output also included existing non-failing `localhost:8080` proxy refusals from unmocked requests and synthetic Owner Visual UAT badge hydration warnings; these are outside this batch's two UI corrections.
