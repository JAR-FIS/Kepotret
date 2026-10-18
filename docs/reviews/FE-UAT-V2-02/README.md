# FE-UAT-V2-02 engineering evidence

These screenshots use the synthetic Owner UAT API fixtures and a fixed clock. They document the opened controls for engineering review; Owner Visual Recheck remains deferred.

| Issue | Engineering change |
| --- | --- |
| UAT-125, UAT-168 | Same-day end hours/minutes at or before the start are unavailable. Following-day times remain selectable when the elapsed duration is at most 120 hours. H29 uses the album timezone and its initial setup horizon; H53 uses server eligibility and start bounds. |
| UAT-126, UAT-169 | Shared branded calendar with bounded month navigation, disabled days, keyboard movement, Escape, outside click, and focus return. |
| UAT-127, UAT-170 | Shared branded hour/minute chooser with minute precision, disabled choices, keyboard movement, Escape, and mobile scrolling. |
| UAT-171 | H53 reveal dropdown includes LIVE as preview only. The save path accepts only the persisted D+1/D+3/D+5/D+7 values. |
| UAT-173 | H53 formats current and proposed event times in the persisted timezone. Invalid or incomplete drafts show readable text without raw ISO `T` separators. |
| UAT-128 | H29's existing branded reveal dropdown is retained and regression tested. |

The `evidence/` directory contains 16 screenshots: calendar and time controls open on H29 and H53 in desktop Light/ID, desktop Dark/EN, mobile 360 Light/ID, and mobile 390 Dark/EN. The filenames identify the route, viewport/theme/locale, and open control.

The frontend does not persist LIVE because the current OpenAPI contract has no LIVE reveal value. H53 does not invent a replacement when the server leaves reschedule bounds null; server eligibility and validation remain authoritative. No Owner issue is marked solved by this engineering batch.
