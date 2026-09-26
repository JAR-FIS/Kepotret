# FE-3 API contract change note — 2026-09-27

The repository has no `docs/references/architecture` directory, so this note is stored directly in the existing `docs/references` directory without adding a folder.

## Approved contract corrections

- H28 album PATCH/read models now include event name, location, category identity, and IANA timezone.
- Added a public active event-category catalog and Superadmin list/create/update operations. Category identity is retained; there is no hard-delete operation.
- Album list/detail projections expose compact event, schedule, guest, and quota fields.
- Added authenticated schedule readback and design readback.
- Added persisted draft package selection using `selected_package_version_id`; confirmation snapshots it as `confirmed_package_version_id`.
- Public package catalog presentation includes package identity, version, code, name, price, currency, and quota.
- Setup review now returns a typed authoritative review, blocking issues, and compact setup snapshot.
- ZIP creation accepts ALL or SELECTED mode, reports selected-count/expiry/revision projections, and exposes album-specific operational capabilities.
- Existing commercial catalogs, operational configuration boundaries, and hard product/security rules remain distinct. No generic public configuration endpoint or user-preference API was added.

## Frontend impact

The generated browser client/types are regenerated from the OpenAPI source. H28–H36 consume server readbacks and persisted selection state. Timezone-aware wall-clock conversion uses the pinned `@js-temporal/polyfill` dependency because browser `Date` does not safely interpret event-local times or reject DST gaps/ambiguities. FE-6 ZIP UI and FE-8 category-management UI are not included.

## Future physical database impact

Expected album columns: `event_name`, `event_location`, `event_category_id`, and `selected_package_version_id`.

New normalized tables:

- `event_categories`: `category_id`, unique `code`, `label_id`, `label_en`, `display_order`, `active`, `created_at`, `updated_at`.
- `export_job_items`: `export_job_id`, `photo_id`, with unique `(export_job_id, photo_id)`.

`albums.event_category_id` references `event_categories.category_id`. The previously documented 42-table physical inventory becomes an expected 44-table inventory after these two additions. Actual migration design remains a backend checkpoint and must follow the existing goose/sqlc deployment policy. No Go implementation or database migration is part of this frontend PR.
