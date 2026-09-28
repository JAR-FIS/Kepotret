# FE-8 API Contract Changes — 2026-09-28

This frontend milestone adds the minimum browser contract needed for the
Superadmin operations console. It does not add database tables, migrations, or
backend implementation.

## Admin boundary and CSRF

Admin authentication and its Secure, HttpOnly session cookie remain separate
from ordinary User and Guest authentication. Browser code uses the dedicated
`GET /api/v1/admin/security/csrf` operation for Admin login, MFA, logout,
step-up, and mutations. The backend must bind tokens to the current
pre-authentication, MFA, or AdminSession context, enforce Origin, and never log
the token. The browser does not persist Admin credentials or tokens.

`POST /api/v1/admin/auth/step-up` verifies TOTP for the current AdminSession and
returns server-authoritative `verified_at` and `expires_at`. The backend must
invalidate step-up when the session ends or is revoked.

## Typed operational projections

Admin overview, users, albums, payment diagnosis, packages and versions,
operational configuration, issues, audit logs, and the Admin roster now have
typed projections. Collection operations use cursor pagination and allowlisted
filters. Projections omit credentials, raw provider payloads, private media,
and raw logs. Payment reconcile remains provider re-check only. Package terms
are immutable per version. Operational configuration is typed, allowlisted,
versioned, and explicitly marks whether an individual value is editable; hard
product rules must remain non-editable. Updates use expected versions.

The Admin roster is read-only. The contract does not expose Admin creation,
invitation, password reset, deletion, or grant mutation.

## Sensitive Access and Operational Hold

The album-scoped Sensitive Access operation returns view-only media references
under a short-lived server grant. Current AdminSession and grant authorization
must be rechecked on every media delivery. No download, share, ZIP, moderation,
delete, or restore authority is granted.

Operational Hold exposes current state and reasoned create/release operations.
Hold contains guest access, capture, gallery, sharing, downloads, and new ZIP
creation; it does not change schedule, payment, ownership, retention, or delete
media. Hold does not grant Sensitive Access. Each authority is independent.

## Backend responsibilities

The backend remains authoritative for authentication, MFA challenge lifetime,
CSRF/Origin binding, step-up lifetime, permission checks, audit records,
pagination, filtering, conflict responses, and current state. It must redact
provider data and secrets, preserve append-only audit records and immutable
payment/package snapshots, and enforce all operational side effects. No new DB
table or migration is included in this contract update.
