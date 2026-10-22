# Kepotret — FE-UAT-T2-V2-07
## Owner UAT Tahap 2 / Recheck #3 — Four-ticket remediation

**Date:** 2026-10-22
**Baseline:** `main` after PR #38 squash merge, `3310fe640c569e4be4e4c51e9c1f2a0bafaa3199`
**Backend:** ON HOLD
**Source of truth:** Owner-uploaded `Kepotret_Owner_UAT_Tahap_2_Recheck_3_2026-10-22(1).xlsx`, sheet `01 Recheck Enam` (rows 10–11 and 15–16), and existing PR #38 handoff.

## Objective and workflow

Remediate **four** Owner findings only. Preserve the 43 historically/now approved tickets (39 prior approvals plus four newly accepted on Recheck #3: T2-01/H70, T2-21/H84, T2-28/H86, T2-30/H87). Do not silently change their accepted layouts, state transitions, or server contracts.

Create **one** feature branch and **one** PR against the latest clean `origin/main`, after confirming baseline includes PR #38. Do not work on another branch or merge automatically. If the local working tree is not clean, inspect and preserve changes rather than discarding them.

### Important ticket ID collision

The Owner's two *new* rows are temporarily labeled `UAT-T2-41` and `UAT-T2-42`, but those IDs already belong to **approved Host Help and Collaborator Help** tickets. In this brief, use:

- **UAT-T2-46 (NEW)** — Guest Entry shared visual structure; source Excel row 15 (temporary `UAT-T2-41`).
- **UAT-T2-47 (NEW)** — Photo Saved button copy; source Excel row 16 (temporary `UAT-T2-42`).

Keep original Owner wording in documentation and explicitly record this mapping. Never overwrite or reopen the already-approved T2-41 / T2-42 Help tickets.

## Scope and acceptance criteria

### T2-05 / H73 — Gallery presentation and select mode (REOPENED)

**Owner's Recheck #3 findings (verbatim):**

> 1. dropdownlist & icon ganti mode view seharusnya sejajar
> 2. card selected photo (yang di dalamnya terdapat button zip juga) seharusnya card ini hanya muncul setelah user melakukan select photo.
> 3. terdapat button small di paling kanan, sejajar dengan text "foto yang ditampilkan" dan "sisa tempat foto album", button "select photo". setelah button ini diklik, barulah muncul card yang di point 2 saya maksudkan tadi
> 4. pada card photo, form checlist dan text "pilih" juga hanya muncul ketika button "select photo" tadi di klik
> 5, copywriting "sisa tempat foto album" sepertinya agak ambigu, bagaiman jika diganti dengan "sisa kuota foto"

**Required behavior:**

1. Group the branded sort selector and grid/list toggles in one aligned control row. Keep consistent vertical alignment on desktop and narrow mobile; allow responsive wrapping **of the group** when physically necessary, without clipping or horizontal overflow.
2. Default Gallery is **browse mode**: no selection action card, no checkbox/"Pilih" label on photo cards.
3. Place a compact **"Pilih foto" / "Select photos"** button at the far right of the information row containing *photos displayed* and *remaining quota*. It must be keyboard accessible and have a clear selection-mode state (label or pressed state). On narrower screens it can wrap while retaining grouping and usable tap targets.
4. Clicking the button activates **selection mode**. Only then display the selection toolbar/card, showing count `0 dari 20` initially, "Batalkan pilihan", and **disabled** ZIP action with a clear layperson explanation. Show per-photo checkboxes only in selection mode. Exiting selection mode clears the selection and hides the toolbar/checkboxes.
5. Keep maximum 20 selected photos, and permit only photos with `actions.can_download`. A photo with download disallowed must not be selectable. A change of sort, album access state, loaded data, or permissions must not retain stale or unauthorized selections.
6. Replace `Sisa tempat foto album` with **`Sisa kuota foto`** (English: **`Photo quota remaining`**). Display this only when fresh, authoritative `capture-readiness.album_remaining_count` is provided; do not invent an album-wide total. Clearly distinguish the number of **photos loaded** from the album total.
7. ZIP generation and bulk download remain **disabled / not delivered**. Do not imply that selecting 20 photos enables a working download. Keep single-photo authorized download untouched.
8. Preserve revealed-Gallery capture restrictions, Guest-only guide route (`/help/guest`), photo viewer, browser-back behavior, like/share/download permissions, and server-authorized sorting.

**Likely files:** `src/features/guest/components/guest-gallery.tsx`, `src/messages/id.json`, `src/messages/en.json`, and focused Gallery tests.

**Tests:** Default state hides selected controls; enter mode shows toolbar and checkboxes; select 20 and prevent 21st; deselect/exit clears; permission denied; load-more/sort refresh; mobile responsive layout; keyboard accessibility; 1/0/no-readiness values for quota and offline/expired state; ZIP disabled.

### T2-13 / H80 — Remove unwanted API language (REOPENED)

**Owner's exact instruction:**

> hapus copywriting ini "API menentukan bidang album yang dicocokkan."

**Required behavior:** Remove **that sentence** from Indonesian Superadmin UI and avoid equivalent programmer-facing wording in English. Preserve the useful high-level explanation that search works across pages, if it still reads naturally; do not replace it with unsupported claims about which fields the API searches. Keep search in the same card next to "Semua album", Enter-to-search, clear, pagination and error states. Global sorting remains pending backend/OpenAPI: the sort cues stay inert, nonfocusable, and clearly identified as unavailable.

**Likely files:** `src/messages/id.json`, `src/messages/en.json`, with focused H80 copy/regression tests. Avoid unnecessary rewrite of `albums.tsx`.

### T2-46 (NEW) — Guest Entry screens share the approved H70 / 404 visual frame

**Owner's original note (from Excel row 15):**

> Pada halaman setelah membuka url undangan, Saya ingin ikuti style halaman 404, terdapat logo di atas card di sebelah kiri, sebelah kanannya dropdownlist ganti bahasa dan ganti mode tema, di bawahnya ada card dan isi content & dibawah card ada text button untuk mengarahkan ke halaman beranda kepotret
>
> termasuk pula halaman ini, halaman input nama peserta, halaman checklist s&k, & halaman untuk buka kamera

**Required behavior:** The non-camera Guest entry states **welcome / invitation preview**, **guest-name and optional PIN**, **consent / privacy agreement**, and **ready / waiting-to-open-camera** should share the approved H70 `AuthPageFrame` visual pattern: logo left and language/theme controls right *above* a centered card; state-specific content within the card; a clear text link to Kepotret home below the card. Verify responsive desktop and mobile, keyboard order and accessible labels.

**Critical exclusions:** The *live camera viewfinder* is already an Owner-locked fullscreen experience containing only the camera UI, shutter and camera-switch affordances. **Do not add logo, header, footer, language/theme controls, or navigation to live camera.** The approved H70 captured-photo review must remain visually and behaviorally unchanged. Do not alter authentication/consent, PIN, camera permissions, reservation, upload, quota enforcement, time gating, retry or capture lifecycle. The saved, closed, and other states should not be accidentally broken by a frame refactor; reuse the same wrapper when appropriate only if it preserves existing semantics.

**Likely files:** `src/features/guest/components/guest-entry-flow.tsx`, `src/features/guest/components/guest-entry-surfaces.tsx`, existing `src/features/auth/components/auth-page-frame.tsx` (prefer unchanged), localization and tests.

**Tests:** Route entry after QR/link; welcome → name/PIN → consent → ready; invalid name/PIN and consent blocking; success into full-screen live camera (with chrome absent), review preserves H70; keyboard/tab, locale/theme switches, back-to-home destination, responsive mobile, denied camera / closed / wait scenarios.

### T2-47 (NEW) — Photo Saved action label

**Owner's original note (from Excel row 16):**

> Pada halaman informasi photo telah tersimpan, terdapat button "simpan ke perangkat" dan "ambil foto lagi", ubah text button "simpan ke perangkat" menjadi "simpan" cukup seperti itu saja.

**Required behavior:** In the **Photo Saved / CaptureSuccess** state, rename the existing primary download action **`Simpan ke perangkat` → `Simpan`** (English: **`Save to device` → `Save`**) using the existing i18n key where safely scoped. Preserve file save behavior, state transition, event filename, availability, and the **`Ambil foto lagi`** control. If the translation key is reused elsewhere, scope the change safely so it does not unintentionally rename unrelated download buttons.

**Likely files:** `src/features/guest/components/guest-entry-surfaces.tsx`, `src/messages/id.json`, `src/messages/en.json`, and focused Guest capture tests.

**Tests:** ID/EN labels; actual action still triggers the same save handler; capture-again remains; no effect on gallery single-photo download or ZIP (disabled).

## Security & behavior boundaries

- Backend, DB, OpenAPI and security contracts are **ON HOLD**. Do not edit them.
- Guest PIN/session/consent cannot be bypassed by navigation or visual refactoring.
- Prevent XSS and leaking invitation fragments, access tokens, photo URLs or internal errors.
- All photo capabilities must remain server-authorized. ZIP is not implemented and must remain visibly unavailable.
- Preserve approved H69 fullscreen camera, H70 review, H71 save flow, H72 closed/waiting rules, H74 photo detail, and all Host/Admin behavior.
- Keep code changes focused. Avoid new dependencies unless unavoidable.

## Validation / evidence

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm api:check`, `pnpm build`, relevant focused Playwright checks **without retries**, and existing Guest Owner UAT suite. Include critical cross-browser checks, especially mobile WebKit for Guest entry and Gallery.

Create deterministic synthetic screenshots for:
- H73 default browse vs selection mode (0/1/20 selected), 1440px desktop and 390px mobile (ID light / EN dark as applicable).
- H80 revised copy, desktop.
- T2-46 each Guest entry stage and live-camera fullscreen contrast, desktop and mobile.
- T2-47 Photo Saved state, desktop and mobile.

Update `docs/reviews/FE-UAT-T2-V2-07/README.md` with exact ticket mapping, changed files, tests, screenshot paths, remaining dependencies, and meaningful CI evidence. Clearly distinguish synthetic evidence from Owner acceptance and real-device proof. Note that historical flaky WebKit CI failures have occurred and record reruns rather than concealing them.

## Delivery requirements

1. Start from the latest `main` containing PR #38 squash commit `3310fe640c569e4be4e4c51e9c1f2a0bafaa3199`.
2. Create a single focused V2-07 feature branch and preserve a clean scope.
3. Implement the four tickets and run local gates.
4. Commit, push, open one PR against `main`, and run hosted quality/E2E.
5. Report exact HEAD SHA, PR URL, validation summary, known limitations, and worktree/branch status.
6. **STOP BEFORE MERGE. Mandatory independent code review, then Owner recheck on the four tickets.**

## Outstanding outside this batch

- Guest ZIP (max 20 per ZIP) is still BLOCKED/UNVERIFIED pending authorized Gateway/CORS, file integrity, device save, and memory tests.
- H80 server-wide sorting requires backend/OpenAPI support.
- Default `downloads_enabled=true` for newly created albums requires backend changes.
- Real iPhone/Android camera validation and historical CI/WebKit flakiness remain to be addressed separately.
- H91 server-side MFA revoke is a security/backend dependency.
