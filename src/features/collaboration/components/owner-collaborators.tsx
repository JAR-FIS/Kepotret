'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumIdCollaborators, getApiV1SecurityCsrf, patchApiV1AlbumsAlbumIdCollaboratorsUserId, deleteApiV1AlbumsAlbumIdCollaboratorsUserId } from '@/lib/api/browser';
import type { CollaboratorPermissions, CollaboratorSummary } from '@/lib/api/generated/index.schemas';
import { hostRoutes } from '@/features/host/routes';
import { useConnectivity } from '@/hooks/use-connectivity';

type State = 'loading' | 'ready' | 'error' | 'unauthenticated' | 'forbidden';
const permissions = ['can_setup', 'can_moderate', 'can_export_zip'] as const;

export function OwnerCollaborators({ albumId }: { albumId: string }) {
  const t = useTranslations('collaboration.owner');
  const shared = useTranslations('collaboration');
  const host = useTranslations('host');
  const locale = useLocale();
  const online = useConnectivity();
  const [state, setState] = useState<State>('loading');
  const [rows, setRows] = useState<CollaboratorSummary[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CollaboratorPermissions>>({});
  const [cursor, setCursor] = useState<string | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<CollaboratorSummary | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void getApiV1AlbumsAlbumIdCollaborators(albumId, { limit: 25 }).then((result) => {
      if (!active) return;
      if (result.status === 200) {
        setRows(result.data.data);
        setDrafts(Object.fromEntries(result.data.data.map((row) => [row.user_id, row.permissions])));
        setCursor(result.data.meta.has_more ? result.data.meta.next_cursor ?? undefined : undefined);
        setState('ready');
      } else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  async function loadMore() {
    if (!cursor || busyId) return;
    setBusyId('page');
    try {
      const result = await getApiV1AlbumsAlbumIdCollaborators(albumId, { limit: 25, cursor });
      if (result.status === 401) { setState('unauthenticated'); return; }
      if (result.status === 403) { setState('forbidden'); return; }
      if (result.status !== 200) { setMessage(t('loadError')); return; }
      setRows((current) => [...current, ...result.data.data.filter((row) => !current.some((existing) => existing.user_id === row.user_id))]);
      setDrafts((current) => ({ ...current, ...Object.fromEntries(result.data.data.map((row) => [row.user_id, row.permissions])) }));
      setCursor(result.data.meta.has_more ? result.data.meta.next_cursor ?? undefined : undefined);
    } catch { setMessage(t('loadError')); }
    finally { setBusyId(null); }
  }

  async function updatePermissions(row: CollaboratorSummary) {
    const next = drafts[row.user_id] ?? row.permissions;
    if (!online || !navigator.onLine || busyId) return;
    setBusyId(row.user_id);
    setMessage('');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status === 401) { setState('unauthenticated'); return; }
      if (csrf.status === 403) { setState('forbidden'); return; }
      if (csrf.status !== 200) { setMessage(t('error')); return; }
      const result = await patchApiV1AlbumsAlbumIdCollaboratorsUserId(albumId, row.user_id, { expected_permission_version: row.permission_version, ...next }, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 401) { setState('unauthenticated'); return; }
      if (result.status === 403) { setState('forbidden'); return; }
      if (result.status === 404) { setMessage(t('notFound')); setAttempt((value) => value + 1); return; }
      if (result.status === 409) { setMessage(t('conflict')); setAttempt((value) => value + 1); return; }
      if (result.status === 422) { setMessage(t('validation')); return; }
      if (result.status === 429) { setMessage(t('rateLimited')); return; }
      if (result.status !== 200) { setMessage(t('error')); return; }
      const updated = result.data.data;
      setRows((current) => current.map((item) => item.user_id === updated.user_id ? updated : item));
      setDrafts((current) => ({ ...current, [updated.user_id]: updated.permissions }));
      setMessage(t('updated'));
    } catch { setMessage(t('error')); }
    finally { setBusyId(null); }
  }

  async function revoke() {
    if (!revokeTarget || !online || !navigator.onLine || busyId) return;
    setBusyId(revokeTarget.user_id);
    setMessage('');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status === 401) { setState('unauthenticated'); return; }
      if (csrf.status === 403) { setState('forbidden'); return; }
      if (csrf.status !== 200) { setMessage(t('error')); return; }
      const result = await deleteApiV1AlbumsAlbumIdCollaboratorsUserId(albumId, revokeTarget.user_id, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 401) { setState('unauthenticated'); return; }
      if (result.status === 403) { setState('forbidden'); return; }
      if (result.status === 404) { setMessage(t('notFound')); setAttempt((value) => value + 1); return; }
      if (result.status === 409) { setMessage(t('conflict')); setAttempt((value) => value + 1); return; }
      if (result.status === 422) { setMessage(t('validation')); return; }
      if (result.status === 429) { setMessage(t('rateLimited')); return; }
      if (result.status !== 200) { setMessage(t('error')); return; }
      setRevokeTarget(null);
      setMessage(t('revoked'));
      setAttempt((value) => value + 1);
    } catch { setMessage(t('error')); }
    finally { setBusyId(null); }
  }

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={host('reauthTitle')} description={host('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={host('forbiddenTitle')} description={host('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={t('errorTitle')} description={t('errorDescription')} retryLabel={host('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  return <div className="max-w-5xl space-y-5">
    <section className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">{t('eyebrow')}</p><h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold">{t('title')}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description')}</p></div>
      <div className="flex flex-wrap gap-2"><Link href={hostRoutes.setup(albumId, 'kolaborator')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold">{t('invite')}<ArrowRight size={16} aria-hidden="true" /></Link><Link href={hostRoutes.invitations(albumId)} className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 text-sm font-semibold underline">{t('history')}</Link></div>
    </section>
    {message && <p role="status" className="text-sm text-[var(--color-muted-foreground)]">{message}</p>}
    {!rows.length ? <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} icon={<UserRound size={25} />} action={<Link href={hostRoutes.setup(albumId, 'kolaborator')} className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)]">{t('invite')}</Link>} /> : <ul className="space-y-4">
      {rows.map((row) => {
        const draft = drafts[row.user_id] ?? row.permissions;
        const changed = permissions.some((key) => draft[key] !== row.permissions[key]);
        return <li key={row.user_id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="break-words text-lg font-semibold">{row.display_name || row.email}</p>{row.display_name && <p className="mt-1 break-all text-sm text-[var(--color-muted-foreground)]">{row.email}</p>}<p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{t('joined', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(row.joined_at)) })}</p></div><span className="rounded-full bg-[var(--color-muted)] px-3 py-1 text-xs font-semibold">{t('permissionVersion', { version: row.permission_version })}</span></div>
          <fieldset className="mt-5 grid gap-2 md:grid-cols-3"><legend className="mb-3 text-sm font-semibold">{t('permissionMatrix')}</legend>{permissions.map((key) => <label key={key} className="flex min-h-16 items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"><input type="checkbox" checked={draft[key]} disabled={!online || busyId === row.user_id} onChange={(event) => setDrafts((current) => ({ ...current, [row.user_id]: { ...draft, [key]: event.target.checked } }))} className="mt-1 size-5 shrink-0 accent-[var(--color-foreground)]" /><span><span className="block text-sm font-semibold">{shared(`capabilities.${key}`)}</span><span className="mt-1 block text-xs leading-5 text-[var(--color-muted-foreground)]">{t(`permissionHelp.${key}`)}</span></span></label>)}</fieldset>
          <p className="mt-4 text-xs leading-5 text-[var(--color-muted-foreground)]">{t('ownerOnly')}</p>
          <div className="mt-4 flex flex-wrap gap-2"><Button type="button" disabled={!changed || !online || busyId === row.user_id} loading={busyId === row.user_id} onClick={() => void updatePermissions(row)}>{t('savePermissions')}</Button><Button type="button" variant="danger" disabled={!online || !!busyId} onClick={() => setRevokeTarget(row)}>{t('revoke')}</Button></div>
        </li>;
      })}
    </ul>}
    {!online && <p role="status" className="text-sm text-[var(--color-muted-foreground)]">{shared('offline')}</p>}
    {cursor && <Button type="button" variant="secondary" loading={busyId === 'page'} onClick={() => void loadMore()}>{t('loadMore')}</Button>}
    <ConfirmDialog open={!!revokeTarget} title={t('revokeTitle')} description={t('revokeDescription')} confirmLabel={t('confirmRevoke')} cancelLabel={t('cancel')} disabled={!!busyId || !online} onCancel={() => setRevokeTarget(null)} onConfirm={() => void revoke()} />
  </div>;
}
