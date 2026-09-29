# Kepotret Owner Visual UAT Guide

## Purpose and safety

This is a test-only, owner-operated visual review harness for routes H01-H92 and shared states C01-C09. It runs the real frontend against deterministic synthetic API responses intercepted in the browser. It does not require an account, contact the real API, upload real media, send messages, or perform payment actions. Do not remove the `OWNER VISUAL UAT` badge while capturing review evidence.

The runner pauses on the landing page after its smoke checks. From there, change the local URL using the route catalog below to inspect each screen. Each route can select a state with `?uat=<scenario>`; synthetic state names are documented beside routes. The API interceptor remains installed while paused. A URL fragment can be used for synthetic guest-link resolution, for example `#synthetic-owner-uat-secret`.

## Start the harness

From the repository root in PowerShell:

```powershell
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm uat:visual
```

This launches a visible desktop Chromium window at 100% zoom. The first run starts the local Next.js development server; later runs reuse it. To review the mobile viewport, close the desktop runner and run:

```powershell
pnpm uat:visual:mobile
```

The mobile project uses Playwright's Pixel 7 viewport/device emulation in visible Chromium. Browser camera input is synthetic. Stop the paused run with Ctrl+C in the terminal. Use the app's language selector to review Bahasa Indonesia and English, and its appearance control to review Light and Dark themes. Keep browser zoom at 100% for consistent spacing checks.

To select an API-driven scenario, append one of these values to a route's `uat` query parameter: `normal`, `live`, `draft`, `empty`, `error`, `waiting`, `closed`, `pin`, `collaborator`, `hold`, `success`, `failure`, `pending`, `queued`, `running`, `ready`, `failed`, `recovery-active`, or `recovery-media`. A scenario only affects components that consume that API projection. Use the documented route examples and check the visible badge before recording results.

## Review procedure

For every H route, record desktop and mobile independently. Review Indonesian and English, Light and Dark, page width/overflow, typography, spacing, primary CTA hierarchy, loading, empty, error and permission states where applicable, dialogs/panels, and key interactions. Some routes share a URL and depend on fixture state; some system boundaries cannot be selected as application routes. Use the route notes to distinguish those cases.

Mark PASS only when the rendered route matches the intended product state and all applicable checks are complete. Mark ISSUE when a concrete visual, content, responsive, interaction, or state defect is reproducible; include the route, scenario, viewport, language, theme, steps, expected and actual result, and screenshot path. Use RECHECK for an incomplete observation. Use N/A only when the field truly does not apply. Keep real customer data, credentials, provider URLs, and personal information out of screenshots and issue notes.

## Route catalog and review order

Wave numbers are a suggested owner review sequence, not product severity. Routes with `STATE-DRIVEN` or `SHARED ROUTE` need the scenario or parent component shown in the notes. The not-found route intentionally uses an unresolved path. H11 is an error boundary, not a navigable product route; do not add a fake route to trigger it. Trigger it only through an approved development-only component failure if one is available, otherwise record it as not directly deep-linkable.

[Open the H01-H92 route catalog](Kepotret_Owner_Visual_UAT_Route_Catalog.md).

## Shared Assistant review: C01-C09

| ID | Review point | Suggested surface |
|---|---|---|
| C01 | Launcher is visible on eligible public, authenticated Host, collaborator, Guest non-camera, and Admin surfaces. | H01, H24, H60, H73, H77 |
| C02 | Labelled non-modal panel opens, focuses its input, closes with Escape, and restores launcher focus. | H24 desktop; H24 mobile |
| C03 | Conversation and informational response stay in component memory during the page session. | H24 |
| C04 | Request failure shows the generic safe fallback. | H24 `?uat=error` |
| C05 | Context surface and album hint are treated as untrusted hints; the UI makes no authority claim. | H24, H60, H77 |
| C06 | Loading state appears while a response is pending. | Inspect with throttling if needed; no live service is called. |
| C07 | Synthetic 503 unavailable state leaves the main page usable. | H24 `?uat=error` |
| C08 | 401/403, 429, and recoverable error presentations are legible and recoverable where exercised by the app. | Existing development/API error fixture only |
| C09 | Assistant is a desktop side panel and a full-screen mobile dialog with usable close/focus behavior. | H24 desktop and mobile |

## Issue log

| Issue ID | H-code | URL | Viewport | Theme | Locale | Severity | Steps to reproduce | Screenshot | Expected | Actual | Decision | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
