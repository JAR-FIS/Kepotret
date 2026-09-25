'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { getApiV1SecurityCsrf, postApiV1CollaboratorInvitationsInvitationIdAccept } from '@/lib/api/browser';
import { getContent, type Locale } from '@/features/marketing/content';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function InvitationAcceptance({ invitationId, locale }: { invitationId: string; locale: Locale }) {
  const copy = getContent(locale).auth;
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error' | 'unauthenticated'>('idle');

  const accept = async () => {
    if (!uuidPattern.test(invitationId) || status === 'pending') {
      if (!uuidPattern.test(invitationId)) setStatus('error');
      return;
    }
    setStatus('pending');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status === 401) { setStatus('unauthenticated'); return; }
      if (csrf.status !== 200) throw new Error('CSRF session unavailable');
      const result = await postApiV1CollaboratorInvitationsInvitationIdAccept(invitationId, {
        headers: { 'X-CSRF-Token': csrf.data.data.csrf_token },
      });
      if (result.status === 201) setStatus('success');
      else if (result.status === 401) setStatus('unauthenticated');
      else if (result.status === 404 || result.status === 409) router.replace('/undangan/kolaborator/tidak-valid');
      else throw new Error('Invitation acceptance failed');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') return <p role="status" className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm font-semibold">{copy.inviteSuccess}</p>;
  if (status === 'unauthenticated') return <div><p className="mb-4 text-sm text-[var(--color-muted-foreground)]">{copy.inviteDescription}</p><Button type="button" onClick={() => router.push('/masuk')}>{copy.signInTitle}</Button></div>;

  return <div>
    <p className="mb-4 text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.inviteDescription}</p>
    {status === 'error' && <p role="alert" className="mb-4 text-sm text-[var(--color-destructive)]">{copy.inviteError}</p>}
    <Button type="button" onClick={accept} loading={status === 'pending'}>{copy.acceptInvite}</Button>
  </div>;
}
