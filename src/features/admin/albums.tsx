'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { getApiV1AdminAlbums, getApiV1AdminAlbumsAlbumId } from '@/lib/api/admin-browser';
import type { AdminAlbumDetail, AdminAlbumSummary } from '@/lib/api/generated/index.schemas';
import { AdminCard, AdminEmpty, AdminError, AdminPage, AdminPagination, AdminStatus, formatAdminDate, formatAdminNumber, type AdminLocale } from './common';

function useAdminCopy() {
  const locale = (useLocale() === 'en' ? 'en' : 'id') as AdminLocale;
  return { locale, id: locale === 'id', t: useTranslations('admin.legacyCopy'), commonT: useTranslations('admin.common') };
}

export function AdminAlbums() {
  const { locale, t, commonT } = useAdminCopy();
  const [rows, setRows] = useState<AdminAlbumSummary[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [more, setMore] = useState(false); const [busy, setBusy] = useState(true); const [error, setError] = useState<number>();
  async function load(next?: string) { setBusy(true); setError(undefined); try { const r = await getApiV1AdminAlbums({ limit: 25, ...(next ? { cursor: next } : {}) }); if (r.status === 200) { setRows(r.data.data); setCursor(r.data.meta.next_cursor ?? null); setMore(r.data.meta.has_more); } else setError(r.status); } catch { setError(0); } finally { setBusy(false); } }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- start the initial server read after mount
  useEffect(() => { void load(); }, []);
  return <AdminPage title={t('albums_albums')} description={t('albums_operational_metadata_only_opening')}>
    {error !== undefined ? <AdminError locale={locale} status={error} retry={() => void load()} /> : <AdminCard title={t('albums_all_albums')}>
      {busy && <p role="status">{t('albums_loading_albums')}</p>}
      {!busy && rows.length === 0 ? <AdminEmpty>{t('albums_no_albums_to_display')}</AdminEmpty> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[56rem] text-left text-sm"><thead><tr className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted-foreground)]"><th className="p-3">{t('albums_event_owner')}</th><th className="p-3">{t('albums_readiness')}</th><th className="p-3">{t('albums_capture_window')}</th><th className="p-3">{t('albums_quota')}</th><th className="p-3">{commonT('hold')}</th><th className="p-3" /></tr></thead><tbody>{rows.map(a => <tr key={a.album_id} className="border-b border-[var(--color-border)]"><td className="max-w-80 break-words p-3"><b>{a.event_name || (t('albums_untitled_event'))}</b><span className="block break-all text-xs text-[var(--color-muted-foreground)]">{a.owner_email} · {a.album_id}</span></td><td className="p-3"><AdminStatus value={a.readiness} /></td><td className="whitespace-nowrap p-3">{formatAdminDate(a.capture_start, locale)}<br />{formatAdminDate(a.capture_end, locale)}</td><td className="p-3 tabular-nums">{formatAdminNumber(a.committed_count, locale)} / {a.quota_total == null ? '—' : formatAdminNumber(a.quota_total, locale)}<span className="block text-xs text-[var(--color-muted-foreground)]">{formatAdminNumber(a.reserved_count, locale)} {t('albums_reserved')}</span></td><td className="p-3"><AdminStatus value={a.hold_active ? 'ACTIVE HOLD' : 'NONE'} /></td><td className="p-3"><Link className="font-semibold underline underline-offset-4" href={`/admin/albums/${encodeURIComponent(a.album_id)}`}>{t('albums_details')}</Link></td></tr>)}</tbody></table></div>
        <ul className="space-y-3 md:hidden">{rows.map(a => <li key={a.album_id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"><div className="flex flex-wrap justify-between gap-2"><strong className="min-w-0 break-words">{a.event_name || (t('albums_untitled_event'))}</strong><AdminStatus value={a.readiness} /></div><p className="mt-1 break-all text-xs text-[var(--color-muted-foreground)]">{a.owner_email} · {a.album_id}</p><dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt>{t('albums_photos')}</dt><dd>{formatAdminNumber(a.committed_count, locale)} / {a.quota_total ?? '—'}</dd></div><div><dt>{commonT('hold')}</dt><dd>{a.hold_active ? 'ACTIVE' : 'NONE'}</dd></div></dl><Link className="mt-2 inline-flex min-h-11 items-center font-semibold underline" href={`/admin/albums/${encodeURIComponent(a.album_id)}`}>{t('albums_open_diagnostics')}</Link></li>)}</ul>
      </>}
      <AdminPagination hasMore={more} cursor={cursor} busy={busy} locale={locale} onNext={() => cursor && void load(cursor)} />
    </AdminCard>}
  </AdminPage>;
}

export function AdminAlbumDetailPage({ albumId }: { albumId: string }) {
  const { locale, t } = useAdminCopy();
  const [data, setData] = useState<AdminAlbumDetail | null>(null); const [busy, setBusy] = useState(true); const [error, setError] = useState<number>();
  async function load() { setBusy(true); setError(undefined); try { const r = await getApiV1AdminAlbumsAlbumId(albumId); if (r.status === 200) setData(r.data.data); else setError(r.status); } catch { setError(0); } finally { setBusy(false); } }
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- reload when the route album changes
  useEffect(() => { void load(); }, [albumId]); const a = data?.summary;
  return <AdminPage title={t('albums_album_diagnostics')} description={t('albums_all_information_here_is_operationa')}>
    {error !== undefined ? <AdminError locale={locale} status={error} retry={() => void load()} /> : busy ? <p role="status">{t('albums_loading_diagnostics')}</p> : !data || !a ? <AdminEmpty>{t('albums_album_not_found')}</AdminEmpty> : <>
      <AdminCard title={a.event_name || (t('albums_untitled_event'))}><dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3"><div><dt className="text-xs text-[var(--color-muted-foreground)]">ID</dt><dd className="break-all font-mono">{a.album_id}</dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('albums_owner_reference')}</dt><dd className="break-all">{data.summary.owner_email}<br /><span className="font-mono text-xs">{data.summary.owner_user_id}</span></dd></div><div><dt>{t('albums_readiness')}</dt><dd><AdminStatus value={a.readiness} /></dd></div><div><dt>{t('albums_capture_schedule')}</dt><dd>{formatAdminDate(a.capture_start, locale)} – {formatAdminDate(a.capture_end, locale)}<br />{data.timezone}</dd></div><div><dt>{t('albums_photo_quota')}</dt><dd>{formatAdminNumber(a.committed_count, locale)} {t('albums_committed')} · {formatAdminNumber(a.reserved_count, locale)} {t('albums_reserved')} / {a.quota_total ?? '—'}</dd></div><div><dt>{t('albums_hold_status')}</dt><dd><AdminStatus value={a.hold_active ? 'ACTIVE HOLD' : 'NONE'} /></dd></div></dl></AdminCard>
      <div className="grid gap-4 lg:grid-cols-2"><AdminCard title={t('albums_contextual_operational_actions')}><p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{t('albums_sensitive_access_and_operational_h')}</p><div className="mt-4 flex flex-wrap gap-2"><Link className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold hover:bg-[var(--color-muted)]" href={`/admin/albums/${encodeURIComponent(albumId)}/sensitive-access`}>{t('albums_sensitive_media_access')}</Link><Link className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold hover:bg-[var(--color-muted)]" href={`/admin/albums/${encodeURIComponent(albumId)}/hold`}>{t('albums_manage_operational_hold')}</Link></div></AdminCard><AdminCard title={t('albums_lifecycle')}>{data.lifecycle ? <dl className="space-y-3 text-sm"><div><dt>{t('albums_normal_access_ends')}</dt><dd>{formatAdminDate(data.lifecycle.normal_access_end_at, locale)}</dd></div><div><dt>{t('albums_recovery_ends')}</dt><dd>{formatAdminDate(data.lifecycle.recovery_end_at, locale)}</dd></div><div><dt>{t('albums_backup_cleanup')}</dt><dd>{formatAdminDate(data.lifecycle.backup_cleanup_deadline_at, locale)}</dd></div></dl> : <p>{t('albums_not_available')}</p>}</AdminCard></div>
      <AdminCard title={t('albums_related_transactions')}>{data.payment_transactions.length ? <ul className="space-y-2">{data.payment_transactions.map(p => <li key={p.transaction_id} className="flex flex-wrap justify-between gap-2 border-b border-[var(--color-border)] py-2 text-sm"><span className="break-all font-mono">{p.transaction_id}</span><Link className="font-semibold underline" href={`/admin/payments/${encodeURIComponent(p.transaction_id)}`}>{'Diagnosis'}</Link></li>)}</ul> : <p className="text-sm text-[var(--color-muted-foreground)]">{t('albums_no_related_transactions')}</p>}</AdminCard>
      <AdminCard title={t('albums_related_issues')}>{data.related_issues.length ? <ul className="space-y-2">{data.related_issues.map(i => <li key={i.issue_id} className="border-b border-[var(--color-border)] py-2 text-sm"><Link className="font-semibold underline" href={`/admin/issues/${encodeURIComponent(i.issue_id)}`}>{i.summary}</Link><p className="font-mono text-xs">{i.issue_id}</p></li>)}</ul> : <p className="text-sm text-[var(--color-muted-foreground)]">{t('albums_no_related_issues')}</p>}</AdminCard>
    </>}
  </AdminPage>;
}
