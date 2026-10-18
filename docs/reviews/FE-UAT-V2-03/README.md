# FE-UAT-V2-03 engineering evidence

These captures use Playwright's synthetic Owner UAT API fixtures. They do not establish production catalog contents or complete the deferred Owner Visual Recheck.

| Owner issue | Surface | Correction and verification |
| --- | --- | --- |
| UAT-009 | H01 | Hero's upper-left photo uses `wedding-03.jpg` with the bride in focus; responsive ID/EN evidence. |
| UAT-016 | H01 | Fourth guest phone contains a wrapping photo-use label; browser test checks that label does not overflow. |
| UAT-022 | H01 | Modest section-spacing increase with existing content and motion retained; full-page desktop/mobile evidence. |
| UAT-028 | H02 | Seven branded interface illustrations follow the approved Host and guest steps; browser test counts all seven. |
| UAT-049 | H09 | The 404 page shares the H10 authentication frame; browser test checks HTTP 404 and responsive evidence. |
| UAT-075, UAT-076 | H17 | Invitation copy spacing and full-width rounded CTA; browser test checks card-width CTA. |
| UAT-090 | H21 | Baseline browser reproduction showed numeric typing worked, while non-digit typing was silently discarded. The form now announces that only digits are accepted. Synthetic login/MFA fixture models a pending challenge, rejects an absent challenge and wrong code, and succeeds only with its test code. Unit/browser tests cover entry, paste, focus, error, and CSRF flow. Production authentication and authorization paths remain server-enforced. |
| UAT-120 | H27 | Owner album overview presents the selected package from the server catalog and actual quota from the album detail independently. Missing catalog/quota states remain explicit; collaborators do not see the owner package panel. Album list no longer calls a mere selected ID a paid entitlement. |
| UAT-124 | H28 | Synthetic catalog offers five active categories with unique IDs and ID/EN labels. Application displays only active server entries; browser tests cover keyboard choice, saved ID, empty and forbidden states. |
| UAT-134 | H33 | Synthetic catalog offers six distinct LOCKED paid tiers with the specified capacities and prices. Browser tests cover all tiers, FREE30 null selection, submitted IDs, empty catalog, and error state. |

## Captures

`evidence/` contains 20 screenshots named `{surface}-{viewport-theme-locale}.png`:

- H01, H02, H09, H17, H21, H27, H28, and H33 at 1440px light/ID and 390px dark/EN.
- H01 and H02 at 1024px dark/EN.
- H01 and H17 at 360px light/ID.

H01/H02 and the Host setup pages use full-page captures. The browser matrix checks horizontal overflow, plus route-specific visibility and status assertions.

The actual production category and package choices depend on the server catalog. Owner Visual Recheck remains deferred until FE-UAT-V2-04 is engineering-verified and merged. No Owner issue is marked SOLVED here.
