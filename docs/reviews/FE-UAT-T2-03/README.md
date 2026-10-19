# FE-UAT-T2-03 — Admin configuration and operational guidance

This is **synthetic engineering evidence**, not Owner approval. The screenshots use the real frontend with API responses intercepted by the Playwright Owner Visual UAT harness. The visible `OWNER VISUAL UAT · SYNTHETIC FIXTURES` badge identifies the synthetic session. No Owner issue is marked SOLVED.

## Owner finding traceability

| Owner finding | Surface | Before | Engineering disposition and after behavior |
|---|---|---|---|
| UAT-T2-24 | H85 | Plain numeric price input. | **FRONTEND IMPLEMENTED** — IDR grouping while typing and pasting, with a canonical integer request amount and localized separators. |
| UAT-T2-25 | H85 | Absolute quota bounds without a price/quota cross-check. | **PARTIAL / DEFERRED POLICY** — integer quota 1–10,000, inline invalid-value feedback, price per photo, a warning for the Owner's Rp450,000/25 example, and explicit confirmation. No approved price/quota ratio or forbidden combination exists; a blocking commercial rule needs an Owner-approved policy and server validation. |
| UAT-T2-26 | H85 | A single form card and no clear creation-versus-sale explanation. | **FRONTEND IMPLEMENTED** — responsive form and explanation columns, immutable-version and sale/effective-state guidance, and success feedback from the HTTP 201 projection. |
| UAT-T2-27 | H86 | The intro used the shared narrow description width. | **FRONTEND IMPLEMENTED** — the full-width intro fits on wide screens and wraps naturally on mobile. |
| UAT-T2-28 | H86 | No bottom guidance. | **FRONTEND IMPLEMENTED** — compact bottom guidance covers allowlisting, editable typed values, revisions, 409 refresh, and locked rules. |
| UAT-T2-29 | H87 | No bottom guidance. | **FRONTEND IMPLEMENTED** — bottom guidance explains issue states, filtering, and the limits of triage. |
| UAT-T2-30 | H87 | Browser-default status select. | **FRONTEND IMPLEMENTED** — a branded native status select retains keyboard semantics, server filtering, and cursor reset. |
| UAT-T2-31 | H88 | Metadata labels blended with values. | **FRONTEND IMPLEMENTED** — labels are small and muted; values and status indicators remain legible. |
| UAT-T2-32 | H88 | Triage controls lacked clear grouping and spacing. | **FRONTEND IMPLEMENTED** — responsive layout and touch-sized actions; confirmation, reason, CSRF, offline disablement, and server states remain authoritative. |
| UAT-T2-33 | H88 | No bottom explanation of triage effects. | **FRONTEND IMPLEMENTED** — bottom guidance distinguishes acknowledgement from reasoned resolution and avoids promising incident repair. |
| UAT-T2-34 | H90 | Read-only roster had no bottom explanation. | **FRONTEND IMPLEMENTED** — a compact bottom card explains the read-only roster and operator-controlled provisioning. |
| UAT-T2-40 | Admin Help | No left contents column or local search. | **FRONTEND IMPLEMENTED** — desktop left contents navigation, mobile collapsible navigation, and local title/body search with count, empty state, and reset. |
| UAT-T2-41 | Host Help | Guide contents had no search. | **FRONTEND IMPLEMENTED** — local title/lead/step/note search keeps existing anchors, ordering, and the 19-step numbering. |
| UAT-T2-42 | Collaborator Help | Guide sections had no search. | **FRONTEND IMPLEMENTED** — localized section title/body search with count, empty state, and reset. |
| UAT-T2-43 | H85/H86/H87/H88/H90 | These identified Admin pages lacked consistent action-impact context. | **FRONTEND IMPLEMENTED for this batch** — small muted Info cards explain each surface. H79/H81/H83 guidance from T2-02 remains in place. Other Admin pages require separate review; H91/H92 belong to T2-04. |

## Open the Owner Visual UAT browser

Run `pnpm uat:visual` for desktop, or `pnpm uat:visual:mobile` for mobile. Paste the URLs below into **that Playwright browser window** after it opens. A regular browser, or a `?uat=` parameter alone, does not install the synthetic Admin session or API intercepts. Switch ID/EN and Light/Dark with the existing controls. The supplied evidence shows 1440px ID/Light and 390px EN/Dark; automated width checks also cover 360, 768, and 1024px.

| Surface | Synthetic URL | Inspect |
|---|---|---|
| H85 | [Create package version](http://localhost:3000/admin/catalog/packages/88888888-8888-4888-8888-888888888888/versions/new?uat=normal) | Enter `450000` and quota `25`; review the warning and price per photo, cancel once, then confirm. The new version's sale/effective values come from the response. Try invalid input and a zero price. |
| H86 | [Operational configuration](http://localhost:3000/admin/config?uat=normal) | Compare editable and locked entries, save the typed synthetic value, and read the bottom guide. |
| H87 | [Operational issues](http://localhost:3000/admin/issues?uat=normal) | Use the native status filter with keyboard or touch; apply it and inspect the guide. |
| H88 | [Issue detail](http://localhost:3000/admin/issues/77777777-7777-4777-8777-777777777777?uat=normal) | Review labels, acknowledgement, resolution reason and confirmation, and the triage guide. |
| H90 | [Admin roster](http://localhost:3000/admin/admins?uat=normal) | Inspect the read-only entries and operator-controlled provisioning explanation. |
| Help | [Admin](http://localhost:3000/help/admin?uat=normal) · [Host](http://localhost:3000/help/host?uat=normal) · [Collaborator](http://localhost:3000/help/collaborator?uat=normal) | Search a title and body phrase, clear the query, and use the contents links. |

## Synthetic screenshots

| Surface | Desktop ID/Light | Mobile EN/Dark |
|---|---|---|
| H85 | [Desktop](evidence/h85-desktop-1440-id-light.png) | [Mobile](evidence/h85-mobile-390-en-dark.png) |
| H86 | [Desktop](evidence/h86-desktop-1440-id-light.png) | [Mobile](evidence/h86-mobile-390-en-dark.png) |
| H87 | [Desktop](evidence/h87-desktop-1440-id-light.png) | [Mobile](evidence/h87-mobile-390-en-dark.png) |
| H88 | [Desktop](evidence/h88-desktop-1440-id-light.png) | [Mobile](evidence/h88-mobile-390-en-dark.png) |
| H90 | [Desktop](evidence/h90-desktop-1440-id-light.png) | [Mobile](evidence/h90-mobile-390-en-dark.png) |
| Admin Help | [Desktop](evidence/help-admin-desktop-1440-id-light.png) | [Mobile](evidence/help-admin-mobile-390-en-dark.png) |
| Host Help | [Desktop](evidence/help-host-desktop-1440-id-light.png) | [Mobile](evidence/help-host-mobile-390-en-dark.png) |
| Collaborator Help | [Desktop](evidence/help-collaborator-desktop-1440-id-light.png) | [Mobile](evidence/help-collaborator-mobile-390-en-dark.png) |

H85 interaction evidence: [desktop price/quota review](evidence/h85-review-desktop-1440-id-light.png), [desktop confirmation](evidence/h85-confirm-desktop-1440-id-light.png), [mobile price/quota review](evidence/h85-review-mobile-390-en-dark.png), and [mobile confirmation](evidence/h85-confirm-mobile-390-en-dark.png). These are synthetic examples; the confirm dialog was cancelled during capture.

The synthetic API fixture lives in `tests/uat` and is installed only by Playwright. Production Admin authentication, MFA, authorization, CSRF, idempotency, API contracts, package business rules, and server-owned issue states are unchanged. Help search uses only public localized page copy and makes no Admin API request.

## Local verification

`pnpm lint`, `pnpm typecheck`, `pnpm test` (281 passed), `pnpm api:check`, `pnpm build`, `pnpm uat:smoke` (2 passed), and `pnpm e2e` (184 passed, 2 evidence-only skipped) passed. The focused T2-03 Playwright run with `--retries=0` passed 12 tests with 1 evidence-only skip. The Guest Owner UAT suite passed 36/36 with `--retries=0`. The explicit evidence capture passed and produced the 20 synthetic images linked above. No flaky test was reported. The first full E2E run exposed a T2-02 assertion for H85's former numeric input role; the assertion was updated for the accessible text input and the complete suite passed on rerun. Hosted CI status must be checked on the PR.

**Remaining decisions:** the Owner must define any price/quota commercial mismatch rule before it can become blocking validation. H91/H92 privileged flows remain assigned to FE-UAT-T2-04. Owner recheck stays deferred until all four Tahap 2 batches finish. D01 LIVE persistence remains unsupported. Backend remains **ON HOLD** until all Desktop and Mobile Owner Visual UAT stages complete and the Owner explicitly approves backend development.
