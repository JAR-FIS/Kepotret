'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  getApiV1AdminUsers,
  getApiV1AdminUsersUserId,
  postApiV1AdminUsersUserIdReactivate,
  postApiV1AdminUsersUserIdRevokeSessions,
  postApiV1AdminUsersUserIdSuspend,
} from '@/lib/api/admin-browser';
import type { AdminUserDetail, AdminUserSummary } from '@/lib/api/generated/index.schemas';
import {
  AdminCard, AdminEmpty, AdminError, AdminFeedback, AdminField, AdminOfflineNote, AdminPage, AdminPagination,
  AdminStatus, adminCsrfHeaders, adminInputClass, formatAdminDate, formatAdminNumber,
  type AdminLocale, useAdminOnline,
} from './common';

function useAdminCopy() {
  const locale = (useLocale() === 'en' ? 'en' : 'id') as AdminLocale;
  return { locale, id: locale === 'id', t: useTranslations('admin.legacyCopy'), commonT: useTranslations('admin.common') };
}

export function AdminUsers() {
  const { locale, t, commonT } = useAdminCopy();
  const online = useAdminOnline();
  const [rows, setRows] = useState<AdminUserSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [suspended, setSuspended] = useState('');
  const [params, setParams] = useState<{ query?: string; suspended?: boolean; cursor?: string }>({});
  const [error, setError] = useState<number | undefined>();
  const [busy, setBusy] = useState(true);

  async function load(nextParams = params) {
    setBusy(true); setError(undefined);
    try {
      const result = await getApiV1AdminUsers({ ...nextParams, limit: 25 });
      if (result.status === 200) { setRows(result.data.data); setCursor(result.data.meta.next_cursor ?? null); setHasMore(result.data.meta.has_more); }
      else setError(result.status);
    } catch { setError(undefined); }
    finally { setBusy(false); }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- start the initial server read after mount
  useEffect(() => { void load({}); }, []);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { ...(query.trim() ? { query: query.trim() } : {}), ...(suspended !== '' ? { suspended: suspended === 'true' } : {}) };
    setParams(next); void load(next);
  }
  function nextPage() {
    if (!cursor) return;
    const next = { ...params, cursor };
    void load(next);
  }

  return <AdminPage title={t('users_users')} description={t('users_search_accounts_and_status_using_s')}>
    <AdminOfflineNote online={online} locale={locale} />
    <AdminCard title={t('users_filter_users')}>
      <form onSubmit={applyFilters} className="grid gap-4 sm:grid-cols-[minmax(12rem,1fr)_minmax(10rem,15rem)_auto] sm:items-end">
        <AdminField label={t('users_email_or_name')}><input className={adminInputClass} type="search" value={query} maxLength={120} onChange={(event) => setQuery(event.target.value)} /></AdminField>
        <AdminField label={t('users_account_status')}><select className={adminInputClass} value={suspended} onChange={(event) => setSuspended(event.target.value)}><option value="">{t('users_all')}</option><option value="false">{t('users_active')}</option><option value="true">{t('users_suspended')}</option></select></AdminField>
        <Button type="submit" variant="secondary" disabled={busy}>{t('users_apply_filters')}</Button>
      </form>
    </AdminCard>
    {error !== undefined ? <AdminError locale={locale} status={error} retry={() => void load()} /> : <AdminCard title={t('users_search_results')}>
      {busy && <p role="status" className="mb-3 text-sm text-[var(--color-muted-foreground)]">{t('users_loading_users')}</p>}
      {!busy && rows.length === 0 ? <AdminEmpty>{t('users_no_users_match_these_filters')}</AdminEmpty> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[46rem] border-collapse text-left text-sm"><thead><tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]"><th className="px-3 py-3">{t('users_user')}</th><th className="px-3 py-3">{commonT('status')}</th><th className="px-3 py-3">{t('users_albums')}</th><th className="px-3 py-3">{t('users_created')}</th><th className="px-3 py-3">{t('users_active_sessions')}</th><th className="px-3 py-3"><span className="sr-only">{t('users_actions')}</span></th></tr></thead><tbody>{rows.map((user) => <tr key={user.user_id} className="border-b border-[var(--color-border)] last:border-0"><td className="max-w-64 break-all px-3 py-3"><span className="block font-semibold">{user.display_name ?? '—'}</span><span className="text-xs text-[var(--color-muted-foreground)]">{user.email}</span></td><td className="px-3 py-3"><AdminStatus value={user.suspended ? 'SUSPENDED' : 'ACTIVE'} /></td><td className="px-3 py-3 tabular-nums">{formatAdminNumber(user.owned_album_count, locale)} {t('users_owned')} · {formatAdminNumber(user.collaborator_album_count, locale)} {t('users_assigned')}</td><td className="whitespace-nowrap px-3 py-3">{formatAdminDate(user.created_at, locale)}</td><td className="px-3 py-3 tabular-nums">{user.active_session_count === null ? '—' : formatAdminNumber(user.active_session_count, locale)}</td><td className="px-3 py-3"><Link className="font-semibold underline underline-offset-4" href={`/admin/users/${encodeURIComponent(user.user_id)}`}>{t('users_open')}</Link></td></tr>)}</tbody></table></div>
        <ul className="space-y-3 md:hidden">{rows.map((user) => <li key={user.user_id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-words font-semibold">{user.display_name ?? '—'}</p><p className="break-all text-xs text-[var(--color-muted-foreground)]">{user.email}</p></div><AdminStatus value={user.suspended ? 'SUSPENDED' : 'ACTIVE'} /></div><dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-[var(--color-muted-foreground)]">{t('users_albums')}</dt><dd>{formatAdminNumber(user.owned_album_count, locale)} {t('users_owned')} · {formatAdminNumber(user.collaborator_album_count, locale)} {t('users_assigned')}</dd></div><div><dt className="text-[var(--color-muted-foreground)]">{t('users_created')}</dt><dd>{formatAdminDate(user.created_at, locale)}</dd></div></dl><Link className="mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4" href={`/admin/users/${encodeURIComponent(user.user_id)}`}>{t('users_view_details')}</Link></li>)}</ul>
        </>}
      <AdminPagination hasMore={hasMore} cursor={cursor} busy={busy} locale={locale} onNext={nextPage} />
    </AdminCard>}
  </AdminPage>;
}

type UserAction = 'suspend' | 'reactivate' | 'revoke';
export function AdminUserDetailPage({ userId }: { userId: string }) {
  const { locale, t, commonT } = useAdminCopy();
  const online = useAdminOnline();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [busy, setBusy] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<number | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<UserAction | null>(null);

  async function load() {
    setBusy(true); setError(undefined);
    try {
      const result = await getApiV1AdminUsersUserId(userId);
      if (result.status === 200) setDetail(result.data.data);
      else setError(result.status);
    } catch { setError(undefined); }
    finally { setBusy(false); }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- reload when the route user changes
  useEffect(() => { void load(); }, [userId]);

  async function mutate() {
    if (!pending || mutating || !online) return;
    setMutating(true); setError(undefined); setMessage(null);
    try {
      const options = { headers: await adminCsrfHeaders() };
      const result = pending === 'suspend'
        ? await postApiV1AdminUsersUserIdSuspend(userId, options)
        : pending === 'reactivate'
          ? await postApiV1AdminUsersUserIdReactivate(userId, options)
          : await postApiV1AdminUsersUserIdRevokeSessions(userId, options);
      if (result.status === 200) {
        setMessage(pending === 'suspend' ? (t('users_account_suspended_albums_and_payme')) : pending === 'reactivate' ? (t('users_account_reactivated')) : (t('users_ordinary_account_sessions_revoked')));
        setPending(null);
        await load();
      } else setError(result.status);
    } catch (reason) { setError(reason instanceof Error && 'status' in reason ? Number(reason.status) : undefined); }
    finally { setMutating(false); }
  }

  const user = detail?.summary;
  const actionLabels: Record<UserAction, string> = { suspend: t('users_suspend_account'), reactivate: t('users_reactivate_account'), revoke: t('users_revoke_ordinary_sessions') };
  const confirmText: Record<UserAction, string> = {
    suspend: t('users_the_account_cannot_use_ordinary_se'),
    reactivate: t('users_the_account_can_use_ordinary_servi'),
    revoke: t('users_active_ordinary_user_sessions_will'),
  };
  return <AdminPage title={t('users_user_detail')} description={t('users_account_diagnostics_and_limited_se')}>
    <AdminOfflineNote online={online} locale={locale} />
    {error !== undefined ? <AdminError locale={locale} status={error} retry={() => void load()} /> : busy ? <p role="status">{t('users_loading_user')}</p> : !user ? <AdminEmpty>{t('users_this_user_is_unavailable')}</AdminEmpty> : <>
      <AdminCard title={user.display_name ?? (t('users_user'))}>
        <dl className="grid gap-4 text-sm sm:grid-cols-2"><div className="min-w-0"><dt className="text-xs text-[var(--color-muted-foreground)]">{commonT('email')}</dt><dd className="break-all font-semibold">{user.email}</dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('users_account_status')}</dt><dd className="mt-1"><AdminStatus value={user.suspended ? 'SUSPENDED' : 'ACTIVE'} /></dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('users_created')}</dt><dd>{formatAdminDate(user.created_at, locale)}</dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('users_last_activity')}</dt><dd>{formatAdminDate(detail?.last_activity_at, locale)}</dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('users_owned_albums')}</dt><dd>{formatAdminNumber(user.owned_album_count, locale)}</dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('users_collaborator_albums')}</dt><dd>{formatAdminNumber(user.collaborator_album_count, locale)}</dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('users_active_ordinary_sessions')}</dt><dd>{user.active_session_count === null ? '—' : formatAdminNumber(user.active_session_count, locale)}</dd></div></dl>
      </AdminCard>
      <AdminCard title={t('users_user_security_actions')}>
        <p className="mb-4 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('users_password_controls_and_album_owner')}</p>
        <div className="flex flex-wrap gap-2">{user.suspended ? <Button variant="secondary" disabled={!online || mutating} onClick={() => setPending('reactivate')}>{actionLabels.reactivate}</Button> : <Button variant="danger" disabled={!online || mutating} onClick={() => setPending('suspend')}>{actionLabels.suspend}</Button>}<Button variant="secondary" disabled={!online || mutating || user.active_session_count === 0} onClick={() => setPending('revoke')}>{actionLabels.revoke}</Button></div>
        {message && <div className="mt-4"><AdminFeedback kind="status">{message}</AdminFeedback></div>}
      </AdminCard>
    </>}
    <ConfirmDialog open={!!pending} title={pending ? actionLabels[pending] : ''} description={pending ? confirmText[pending] : ''} confirmLabel={t('users_confirm')} cancelLabel={t('users_cancel')} destructive={pending === 'suspend' || pending === 'revoke'} disabled={mutating || !online} onCancel={() => setPending(null)} onConfirm={() => void mutate()} />
  </AdminPage>;
}
