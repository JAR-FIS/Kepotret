# FE-UAT V2-08 — PR A navigation handoff

Baseline: `main` at `61ae67393b07c0f536f53c9f9bca6e81233c96dc` (PR #39). Branch: `feat/fe-uat-v2-08-navigation-discoverability`. Backend remains **ON HOLD**. This handoff records frontend work and synthetic browser evidence; it is not Owner acceptance or physical device validation.

## V2-08A blocking dropdown correction

Reproduction on the baseline: at 1440 px, clicking **Kelola** rendered the menu at `y=-362px`, above the viewport. Both desktop and mobile used `bottom: calc(100% + .75rem)` even though desktop navigation is near the top. A real mobile click also found the floating AI Assistant launcher covering **Lainnya** and intercepting pointer events.

The desktop menu now opens below its trigger; the mobile menu opens above the bottom navigation. The Assistant launcher clears that navigation at mobile widths, and an open menu stacks above the launcher. The controls retain menu roles and `aria-expanded`, focus the first item, support arrow keys, Home, End and Escape, return focus to the trigger on Escape, close on an outside click, and show focus outlines. Owner and Collaborator menu items still derive from server `actor_access` and readiness.

Evidence: [desktop Manage](evidence/workspace-manage-1440-id-light.png), [desktop More](evidence/workspace-more-1440-id-light.png), [390 px Manage](evidence/workspace-manage-390-id-light.png), [390 px More](evidence/workspace-more-390-id-light.png), [320 px Manage](evidence/workspace-manage-320-id-light.png), [320 px More](evidence/workspace-more-320-id-light.png), [English dark mobile](evidence/workspace-manage-390-en-dark.png). `tests/e2e/fe-uat-v2-08-navigation.spec.ts` clicks both menus and reaches allowed destinations at all three widths without forced clicks.

## PR A route traceability

| Owner item | Route and result | Evidence |
| --- | --- | --- |
| H19 Account | `/akun` uses the Host workspace shell, including account navigation on desktop and mobile, while keeping the existing account panel. | [Desktop](evidence/h19-account-1440-id-light.png) |
| H27 Album Overview | Draft and ready overviews offer grouped links to Gallery, Sharing, Guest Preview, Design, Export, Activity, Schedule, Retention, Settings, Collaborators, Payments, and eligible Upgrade. Upgrade appears only after the package-options projection permits checkout; the schedule link says “Ubah jadwal” only after the schedule projection permits it. Collaborator links follow `actor_access` and readiness. | [Owner desktop](evidence/h27-overview-1440-id-light.png), [English dark mobile](evidence/h27-overview-390-en-dark.png), [Collaborator](evidence/workspace-collaborator-1440-id-light.png) |
| H39 Sharing | Collaborator and Guest guides link to their respective help routes; refresh sits beside the existing conditional rotate control. Rotation confirmation and authorization remain. | [Desktop](evidence/h39-sharing-1440-id-light.png) |
| H45 → H46 | Existing Collaborators → Invitation History link is exercised by real click. No duplicate button added. | Browser regression |
| H47 → H48 | Existing Payment History → Transaction Detail link is exercised by real click. No duplicate button added. | Browser regression |
| H49, H53 | Contextual Upgrade CTA is server-eligibility gated; schedule entry is read-only when rescheduling is not permitted or unavailable. Destination pages keep their own server checks. | H27 browser regression, including 503 eligibility |
| H54 → H55; H57/H58 | Retention now links to Recovery Options after its authoritative lifecycle projection loads. Recovery activation and media actions remain server-gated. | Browser regression |
| H52, H59, H63 | Activity, Preview/Design/Export, and Collaborator Permissions are discoverable from the overview subject to actor capability. | Owner and Collaborator browser regressions |
| H71 | A **Lihat album / View album** link appears only after photo commit on the Saved state. The destination still checks the guest session and server reveal state; the hidden-gallery waiting state is verified. Existing Save and Capture Again actions remain. | [Mobile saved](evidence/h71-saved-390-id-light.png) |
| H80 → H81 → H92 | Existing Admin Albums → Album Diagnostics → Operational Hold links are exercised by real click. The privileged hold action and its checks remain unchanged. | Browser regression |

## Validation

- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test` — 42 files, 292 tests passed.
- `pnpm api:check` — passed; generated API client is fresh.
- `pnpm build` — passed.
- Focused Playwright PR A navigation and H71 regressions — 6 passed in Chromium with `--retries=0` and synthetic evidence capture. Desktop 1440 px, mobile 390/320 px, keyboard, outside click, English dark, Owner/Collaborator routing, existing click paths, and post-commit hidden-gallery gating were exercised.
- Hosted CI matrix — pending PR.

Screenshots use `tests/uat/mock-api.ts` synthetic data, a visible **OWNER VISUAL UAT · SYNTHETIC FIXTURES** badge, and a fake browser camera for H71. They demonstrate interface layout and click flow under controlled data. Real backend, real iPhone/Android camera, and Owner recheck are separate.

## Dependencies and phased work

- Backend stays **ON HOLD**. No database, OpenAPI, authentication, authorization, permission, or locked business-rule changes are included.
- Package upgrade and schedule changes remain subject to fresh server eligibility. H71 gallery visibility remains subject to the server guest and reveal projections.
- Guest ZIP download remains blocked pending Gateway/CORS, media permission, file integrity, device save, and memory verification. The approved 20-photo selection limit remains.
- H80 server sorting still needs backend/OpenAPI support; sorting cues remain inert and unfocusable.
- **V2-08B**: the new Owner directive for a lightweight 250–350 ms fade and subtle upward reveal on Home, How It Works, FAQ, Pricing, Help, Privacy, Terms, Security, and other appropriate public information pages is recorded for **PR B**. Reuse `h01-reveal` where appropriate; honor reduced motion, SSR/SEO visibility, mobile performance, and avoid duplicate animations.
- The remaining PR B public copy and visual work, and PR C Host Gallery/legal work, remain phased per the V2-08 package. Legal draft publication requires the documented approval. This PR stops before merge for independent code review.
