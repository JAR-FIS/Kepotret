'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumIdCollaboratorInvitations, getApiV1SecurityCsrf, postApiV1CollaboratorInvitationsInvitationIdRevoke } from '@/lib/api/browser';
import type { InvitationSummary } from '@/lib/api/generated/index.schemas';
import { useConnectivity } from '@/hooks/use-connectivity';

type State = 'loading' | 'ready' | 'error' | 'unauthenticated' | 'forbidden';
const permissions = ['can_setup', 'can_moderate', 'can_export_zip'] as const;

export function InvitationHistory({ albumId }: { albumId: string }) {
  const t = useTranslations('collaboration.history');
  const common = useTranslations('collaboration');
  const host = useTranslations('host');
  const locale = useLocale();
  const online = useConnectivity();
  const [state, setState] = useState<State>('loading');
  const [rows, setRows] = useState<InvitationSummary[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<InvitationSummary | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void getApiV1AlbumsAlbumIdCollaboratorInvitations(albumId, { limit: 25 }).then((result) => {
      if (!active) return;
      if (result.status === 200) { setRows(result.data.data); setCursor(result.data.meta.has_more ? result.data.meta.next_cursor ?? undefined : undefined); setState('ready'); }
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  async function loadMore() {
    if (!cursor || busy) return;
    setBusy(true);
    try {
      const result = await getApiV1AlbumsAlbumIdCollaboratorInvitations(albumId, { limit: 25, cursor });
      if (result.status === 401) { setState('unauthenticated'); return; }
      if (result.status === 403) { setState('forbidden'); return; }
      if (result.status !== 200) { setMessage(t('error')); return; }
      setRows((current) => [...current, ...result.data.data.filter((item) => !current.some((existing) => existing.invitation_id === item.invitation_id))]);
      setCursor(result.data.meta.has_more ? result.data.meta.next_cursor ?? undefined : undefined);
    } catch { setMessage(t('error')); }
    finally { setBusy(false); }
  }

  async function revoke() {
    if (!revokeTarget || revokeTarget.status !== 'PENDING' || !online || !navigator.onLine || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status === 401) { setState('unauthenticated'); return; }
      if (csrf.status === 403) { setState('forbidden'); return; }
      if (csrf.status !== 200) { setMessage(t('error')); return; }
      const result = await postApiV1CollaboratorInvitationsInvitationIdRevoke(revokeTarget.invitation_id, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 401) { setState('unauthenticated'); return; }
      if (result.status === 403) { setState('forbidden'); return; }
      if (result.status === 404 || result.status === 409) { setMessage(t('conflict')); setAttempt((value) => value + 1); return; }
      if (result.status === 422) { setMessage(t('validation')); return; }
      if (result.status === 429) { setMessage(t('rateLimited')); return; }
      if (result.status !== 200) { setMessage(t('error')); return; }
      setRows((current) => current.map((row) => row.invitation_id === result.data.data.invitation_id ? result.data.data : row));
      setRevokeTarget(null);
      setMessage(t('revoked'));
    } catch { setMessage(t('error')); }
    finally { setBusy(false); }
  }

  if (state === 'loading') return <LoadingState label={common('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={host('reauthTitle')} description={host('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={host('forbiddenTitle')} description={host('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={t('errorTitle')} description={t('errorDescription')} retryLabel={host('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  return <div className="max-w-5xl space-y-5">
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">{t('eyebrow')}</p><h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold">{t('title')}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description')}</p></section>
    {message && <p role="status" className="text-sm text-[var(--color-muted-foreground)]">{message}</p>}
    {!rows.length ? <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} icon={<Mail size={25} />} /> : <ul className="space-y-3">
      {rows.map((row) => <li key={row.invitation_id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="break-all text-lg font-semibold">{row.email}</p><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('created', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(row.created_at)) })} · {t('expires', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(row.expires_at))})}</p>{row.accepted_at && <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{t('accepted', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(row.accepted_at)) })}</p>}{row.revoked_at && <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{t('revokedAt', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(row.revoked_at)) })}</p>}</div><span className="inline-flex w-fit rounded-full bg-[var(--color-muted)] px-3 py-1 text-xs font-bold">{t(`status.${row.status}`)}</span></div>
        <ul className="mt-3 flex flex-wrap gap-2">{permissions.filter((key) => row.permissions[key]).map((key) => <li key={key} className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs">{common(`capabilities.${key}`)}</li>)}</ul>
        {row.status === 'PENDING' && <Button type="button" variant="danger" disabled={!online || busy} className="mt-4" onClick={() => setRevokeTarget(row)}>{t('revoke')}</Button>}
      </li>)}
    </ul>}
    {!online && <p role="status" className="text-sm text-[var(--color-muted-foreground)]">{common('offline')}</p>}
    {cursor && <Button type="button" variant="secondary" loading={busy} disabled={!online} onClick={() => void loadMore()}>{t('loadMore')}</Button>}
    <ConfirmDialog open={!!revokeTarget} title={t('revokeTitle')} description={t('revokeDescription')} confirmLabel={t('confirmRevoke')} cancelLabel={t('cancel')} disabled={!online || busy} onCancel={() => setRevokeTarget(null)} onConfirm={() => void revoke()} />
  </div>;
}
