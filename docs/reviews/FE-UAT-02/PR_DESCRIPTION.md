## Summary

Align H01 with the approved visual reference and the FE-UAT-02 Owner issue log. Preserve FE-UAT-01 improvements and locked business rules. No backend, database, or OpenAPI changes.

## UAT issue traceability

- **UAT-001:** Implemented in FE-UAT-02: desktop navigation is centered against the viewport; mobile menu behavior is regression-tested.
- **UAT-002–005:** Inherited from FE-UAT-01 and preserved: ID/ENG control, full-rounded controls, bold album CTA, Space Grotesk / Plus Jakarta Sans. Engineering-verified; Owner approval is pending.
- **UAT-006–023:** Implemented in FE-UAT-02: one decorative lime hero dot, approved hero collage/proof/CTA layout, wedding photo, highlighted How heading, photo-backed feature, cream gradient and dark copy, photo-led event strip, four phone mockups, seven-stop capacity slider, H01 single-open FAQ, approved LIVE/D+1 FAQ copy, final CTA collage, spacing/smooth anchor/enter animation, reduced-motion support, and styled accessible locale menu.
- **UAT-024–026:** Inherited from FE-UAT-01 and preserved: icon-only Assistant, non-overlapping composer, and white Dark Mode logo. Engineering-verified; Owner approval is pending.
- **UAT-027:** Implemented in FE-UAT-02: H01 Dark Mode alternates Ink and Mid Gray section backgrounds with readable contrast.

All implemented items remain pending Owner UAT V2. Owner Visual Recheck is deferred until FE-UAT-05.

## Visual evidence

- [Approved H01 reference](../../references/screens/Kepotret_H01_Approved_Visual_Reference_v1_0.png)
- [Desktop, Indonesian, Light](H01-desktop-light-id.png)
- [Desktop, Indonesian, Dark](H01-desktop-dark-id.png)
- [Desktop, English, Dark](H01-desktop-dark-en.png)
- [Mobile, Indonesian, Light](H01-mobile-light-id.png)
- [Mobile, Indonesian, Dark](H01-mobile-dark-id.png)
- [Mobile event photo strip](H01-mobile-events.png)

Screenshots are implementation evidence for independent review, not Owner visual approval.

## Verification

- `pnpm lint` — passed
- `pnpm typecheck` — passed
- `pnpm test` — passed (178 tests)
- `pnpm api:check` — passed; generated client fresh, contract unchanged
- `pnpm build` — passed
- `pnpm uat:smoke` — passed (2 tests)
- `pnpm e2e` — passed (108 tests across Chromium, Firefox, WebKit, mobile Chromium, mobile WebKit)
- `git diff --check` — passed

Focused tests cover headline punctuation, package capacities/prices, FAQ one-open state and bilingual LIVE copy, custom language-menu keyboard behavior, pricing range keyboard/pointer/touch, desktop/mobile widths, both locales and themes, dark logo, reduced motion, smooth anchors, and horizontal overflow.

## Remaining review notes

- Owner Visual Recheck and UAT V2 are pending until FE-UAT-05.
- D01 LIVE is reflected in marketing copy only; no backend/API functionality is implemented by this PR.
- The seven package capacities and prices are unchanged.
