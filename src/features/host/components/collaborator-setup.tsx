'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumIdCollaboratorInvitations, getApiV1SecurityCsrf, postApiV1AlbumsAlbumIdCollaboratorInvitations } from '@/lib/api/browser';
import type { CollaboratorPermissions, InvitationSummary } from '@/lib/api/generated/index.schemas';

export function CollaboratorSetup({ albumId }: { albumId: string }) {
  const t = useTranslations('host.collaborators');
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [permissions, setPermissions] = useState<CollaboratorPermissions>({ can_setup: false, can_moderate: false, can_export_zip: false });
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void getApiV1AlbumsAlbumIdCollaboratorInvitations(albumId).then((result) => {
      if (!active) return;
      if (result.status === 200) { setInvitations(result.data.data); setState('ready'); }
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage('');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) {
        if (csrf.status === 401) setState('unauthenticated');
        else if (csrf.status === 403) setState('forbidden');
        else setMessage(t('error'));
        return;
      }
      const result = await postApiV1AlbumsAlbumIdCollaboratorInvitations(albumId, { email: email.trim(), ...permissions }, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 201) {
        setInvitations((items) => [result.data.data, ...items]);
        setEmail('');
        setMessage(t('created'));
      } else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else if (result.status === 409) setMessage(t('conflict'));
      else setMessage(t('error'));
    } catch {
      setMessage(t('error'));
    } finally {
      setPending(false);
    }
  }

  if (state === 'loading') return <LoadingState label={t('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={t('reauthTitle')} description={t('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={t('forbiddenTitle')} description={t('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={t('errorTitle')} description={t('errorDescription')} retryLabel={t('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  return <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <form onSubmit={submit} className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
      <h2 className="font-semibold">{t('title')}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description')}</p>
      <label htmlFor="collaborator-email" className="mt-5 block text-sm font-semibold">{t('email')}</label>
      <input id="collaborator-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-base" />
      <fieldset className="mt-5 space-y-3"><legend className="mb-3 text-sm font-semibold">{t('permissions')}</legend>
        {(['can_setup', 'can_moderate', 'can_export_zip'] as const).map((permission) => <label key={permission} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={permissions[permission]} onChange={(event) => setPermissions((current) => ({ ...current, [permission]: event.target.checked }))} className="size-5 accent-[var(--color-foreground)]" />{t(permission)}</label>)}
      </fieldset>
      <p className="mt-4 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('noBilling')}</p>
      {message && <p role="status" className="mt-3 text-sm text-[var(--color-muted-foreground)]">{message}</p>}
      <Button type="submit" loading={pending} className="mt-5">{t('submit')}</Button>
    </form>
    <section className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7"><h2 className="font-semibold">{t('listTitle')}</h2>
      {invitations.length ? <ul className="mt-4 space-y-3">{invitations.map((invitation) => <li key={invitation.invitation_id} className="min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"><p className="break-all text-sm font-semibold">{invitation.email}</p><ul className="mt-2 flex flex-wrap gap-2">{(['can_setup', 'can_moderate', 'can_export_zip'] as const).filter((permission) => invitation.permissions[permission]).map((permission) => <li key={permission} className="rounded-full bg-[var(--color-muted)] px-3 py-1 text-xs">{t(permission)}</li>)}</ul></li>)}</ul> : <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('empty')}</p>}
    </section>
  </div>;
}
