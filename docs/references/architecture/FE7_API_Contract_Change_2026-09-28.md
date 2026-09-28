# FE-7 API Contract Change

Date: 2026-09-28  
Scope: FE-7 frontend contract additions for ordinary Users collaborating on albums. This note changes the OpenAPI contract and generated frontend client only. It adds no Go implementation, database migration, worker, or table.

## Source audit

The checkout includes the locked Frontend Handoff Package, UI/UX 8.1 inventory, UI/UX 8.2 navigation flow, UI/UX 8.3 wireframe architecture, component direction, and brand identity references. Separate PRD/BPMN/Use Case and Permission/Authorization Model files, and the standalone Frontend Development Handoff v1.1 file, were not present in this checkout. The detailed FE-7 request supplied for this change is therefore the available business-rule source; any upstream contract conflict must be reviewed before backend implementation.

## Actor access and album listing

`AlbumSummary` and `AlbumDetail` now carry required `actor_access`. `AlbumActorAccess` contains `relationship`, `collaborator_permissions`, and `permission_version`. An Owner is represented by `OWNER` with both collaborator fields null. A collaborator has `COLLABORATOR` with both fields present. Owner rights are not mapped to three `true` collaborator flags.

The server derives this projection from the current relationship and membership state on every authorized request. A rendered response is a display snapshot and never freezes later authorization. Existing `GET /api/v1/albums` gains an optional server-side `relationship=OWNER|COLLABORATOR` filter and supports `cursor` and `limit`; the unfiltered form continues to list both relationships. Owner album surfaces request `OWNER`; assigned-album surfaces request `COLLABORATOR`.

## Collaborator and invitation projections

Owner-facing `CollaboratorSummary` adds nullable `display_name`, email, `joined_at`, permissions, and `permission_version`, while excluding provider subjects, OAuth data, session identifiers, and internal secrets. The active collaborator list supports cursor pagination.

`InvitationSummary` adds normalized server status (`PENDING`, `ACCEPTED`, `REVOKED`, or `EXPIRED`), creation/expiry dates, and nullable accepted/revoked dates. Invitation history supports cursor pagination. The UI does not infer status from local time.

Permission PATCH requests include `expected_permission_version` and the three independent flags. The returned collaborator projection supplies the new server version and flags; clients do not optimistically grant capability.

## Idempotent invite creation

Invite creation retains the existing `Idempotency-Key` plus CSRF contract. One key is bound to album, normalized email, and all three capability values. The frontend reuses the key only for an unchanged logical intent after an ambiguous result, changes keys when the payload changes, and discards a key after `201`.

## Secure invitation continuation

Invitation links carry the one-time raw secret only in the URL fragment: `/undangan/kolaborator/{invitation_id}#<secret>`. The browser sends that value in the JSON body of the public resolve request. A valid resolve establishes a short-lived Secure, HttpOnly, SameSite=Lax continuation cookie and returns a safe preview; it never returns the raw secret. The frontend removes the fragment after successful resolve and stores no continuation credential in JavaScript-accessible storage.

The safe preview contains invitation and album IDs, event name, permission snapshot, expiry, normalized current status, and an optional masked email hint. It is available after resolve and through a current preview GET using the continuation cookie, including after OAuth. Neither operation is a membership grant or a freeze on invitation state.

The Google start operation gains `return_to`, a frontend-relative allowlisted path. Invitation sign-in uses `/undangan/kolaborator/{invitation_id}` only. The secret is never placed in the return path or OAuth state. Accept requires both the ordinary User session and the continuation cookie plus CSRF. The backend revalidates the current pending/expiry/one-time state, album validity, verified Google email, and User identity before atomically consuming the invite and creating a membership with a permission version. Expired or consumed invite states may return `410 Gone`; mismatch is represented by a typed safe error code and never resolved in the browser.

## Backend responsibilities and limits

The backend must enforce current relationship and capability on every request, filter and paginate server-side, rate-limit secret resolution, keep continuation short-lived and HttpOnly, mask invitation identity before proof, validate the Google verified email, and make acceptance/membership creation atomic. A continuation is possession context only, not authorization for general album access. Frontend output does not implement those controls.

No Go, SQL, migration, new database table, Redis, email provider, worker, or real Google OAuth implementation is part of FE-7. Existing database tables and backend authorization must support the contract before production use. Generated Orval output is regenerated from the OpenAPI source and is not hand-edited.
