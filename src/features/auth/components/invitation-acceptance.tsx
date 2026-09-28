'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AuthMe, getApiV1CollaboratorInvitationsInvitationIdPreview, getApiV1SecurityCsrf, postApiV1CollaboratorInvitationsInvitationIdAccept, postApiV1CollaboratorInvitationsInvitationIdResolve } from '@/lib/api/browser';
import type { InvitationPreview } from '@/lib/api/generated/index.schemas';
import { GoogleSignInButton } from '@/features/auth/components/google-sign-in-button';
import type { Locale } from '@/features/marketing/content';
import { useAppLocale } from '@/providers/locale-provider';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type State = 'loading' | 'ready' | 'error' | 'invalid' | 'expired' | 'used' | 'unauthenticated' | 'mismatch' | 'accepted';
const permissionKeys = ['can_setup', 'can_moderate', 'can_export_zip'] as const;

function apiErrorCode(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('error' in value)) return undefined;
  const error = value.error;
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : undefined;
}

export function InvitationAcceptance({ invitationId, locale }: { invitationId: string; locale: Locale }) {
  const t = useTranslations('collaboration.invitation');
  const { locale: appLocale } = useAppLocale();
  const router = useRouter();
  const [state, setState] = useState<State>('loading');
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const invitationSecretRef = useRef<string | null>(null);

  useEffect(() => {
    if (state === 'invalid' || state === 'expired' || state === 'used') {
      router.replace(`/undangan/kolaborator/tidak-valid?state=${state}`);
    }
  }, [router, state]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!uuidPattern.test(invitationId)) { setState('invalid'); return; }
      try {
        const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
        if (invitationSecretRef.current === null && fragment) {
          invitationSecretRef.current = fragment;
          window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
        }
        let currentPreview: InvitationPreview;
        if (invitationSecretRef.current !== null) {
          const resolved = await postApiV1CollaboratorInvitationsInvitationIdResolve(invitationId, { invitation_secret: invitationSecretRef.current });
          if (!active) return;
          if (resolved.status === 404 || resolved.status === 422) { invitationSecretRef.current = null; setState('invalid'); return; }
          if (resolved.status === 410) { invitationSecretRef.current = null; setState(apiErrorCode(resolved.data) === 'INVITATION_USED' || apiErrorCode(resolved.data) === 'INVITATION_REVOKED' ? 'used' : 'expired'); return; }
          if (resolved.status !== 200) { setState('error'); return; }
          invitationSecretRef.current = null;
          currentPreview = resolved.data.data;
        } else {
          const current = await getApiV1CollaboratorInvitationsInvitationIdPreview(invitationId);
          if (!active) return;
          if (current.status === 404) { setState('invalid'); return; }
          if (current.status === 410) {
            const code = apiErrorCode(current.data);
            setState(code === 'INVITATION_USED' || code === 'INVITATION_REVOKED' ? 'used' : 'expired');
            return;
          }
          if (current.status !== 200) { setState('error'); return; }
          currentPreview = current.data.data;
        }

        if (currentPreview.status === 'EXPIRED') { setState('expired'); return; }
        if (currentPreview.status === 'ACCEPTED' || currentPreview.status === 'REVOKED') { setState('used'); return; }

        const user = await getApiV1AuthMe();
        if (!active) return;
        if (user.status === 200) setSignedInEmail(user.data.data.email);
        else if (user.status !== 401) { setState('error'); return; }
        setPreview(currentPreview);
        setState(user.status === 401 ? 'unauthenticated' : 'ready');
      } catch {
        if (active) setState('error');
      }
    })();
    return () => { active = false; };
  }, [invitationId, attempt]);

  async function accept() {
    if (!preview || state !== 'ready') return;
    setState('loading');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status === 401) { setState('unauthenticated'); return; }
      if (csrf.status !== 200) { setState('error'); return; }
      const result = await postApiV1CollaboratorInvitationsInvitationIdAccept(invitationId, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 201) { setState('accepted'); router.replace(`/album/${encodeURIComponent(preview.album_id)}`); return; }
      if (result.status === 401) { setState('unauthenticated'); return; }
      if (result.status === 403 && apiErrorCode(result.data) === 'VERIFIED_EMAIL_MISMATCH') { setState('mismatch'); return; }
      if (result.status === 404) { setState('invalid'); return; }
      if (result.status === 410) {
        const code = apiErrorCode(result.data);
        setState(code === 'INVITATION_USED' || code === 'INVITATION_REVOKED' ? 'used' : 'expired');
        return;
      }
      setState('error');
    } catch { setState('error'); }
  }

  if (state === 'loading') return <LoadingState label={t('loading')} />;
  if (state === 'error') return <ErrorState title={t('errorTitle')} description={t('errorDescription')} retryLabel={t('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;
  if (state === 'invalid' || state === 'expired' || state === 'used') return null;
  if (state === 'mismatch') return <section role="alert" className="space-y-3"><h2 className="font-[var(--font-display)] text-xl font-bold">{t('mismatchTitle')}</h2><p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{t('mismatchDescription')}</p><p className="break-all text-sm font-semibold">{signedInEmail}</p><Link href="/akun" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">{t('useAnotherAccount')}</Link></section>;

  if (state === 'accepted') return <p role="status" className="text-sm font-semibold">{t('accepted')}</p>;
  if (!preview) return null;

  const returnTo = `/undangan/kolaborator/${encodeURIComponent(invitationId)}`;
  return <div className="space-y-5">
    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description')}</p>
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--color-muted-foreground)]">{t('eventLabel')}</p>
      <h2 className="mt-2 break-words font-[var(--font-display)] text-xl font-bold">{preview.event_name ?? t('unnamed')}</h2>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t('expires', { date: new Intl.DateTimeFormat(appLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(preview.expires_at)) })}</p>
      {preview.invited_email_hint && <p className="mt-2 break-all text-sm text-[var(--color-muted-foreground)]">{t('invitedEmailHint', { email: preview.invited_email_hint })}</p>}
    </section>
    <section><h3 className="font-semibold">{t('permissionsTitle')}</h3><ul className="mt-3 space-y-2">{permissionKeys.map((key) => <li key={key} className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"><span aria-hidden="true" className={`mt-0.5 inline-flex size-5 items-center justify-center rounded-full text-xs font-bold ${preview.permissions[key] ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'}`}>{preview.permissions[key] ? '✓' : '–'}</span><span><span className="block text-sm font-semibold">{t(`capabilities.${key}.title`)}</span><span className="mt-1 block text-xs leading-5 text-[var(--color-muted-foreground)]">{t(`capabilities.${key}.description`)}</span></span></li>)}</ul></section>
    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{t('emailRequirement')}</p>
    {state === 'unauthenticated' ? <div><GoogleSignInButton locale={locale} returnTo={returnTo} /><p className="mt-2 text-xs leading-5 text-[var(--color-muted-foreground)]">{t('noSecretInReturnPath')}</p></div> : <div><p className="mb-3 break-all text-sm text-[var(--color-muted-foreground)]">{t('signedInAs', { email: signedInEmail ?? '' })}</p><Button type="button" onClick={() => void accept()}>{t('accept')}</Button></div>}
  </div>;
}
