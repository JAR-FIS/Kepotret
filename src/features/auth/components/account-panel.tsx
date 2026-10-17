'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AuthMe, postApiV1AuthLogout, getApiV1SecurityCsrf } from '@/lib/api/browser';
import { useAppLocale } from '@/providers/locale-provider';
import { getContent } from '@/features/marketing/content';
import { CircleUserRound, LogOut, Mail } from 'lucide-react';

export function AccountPanel() {
  const router = useRouter();
  const { locale } = useAppLocale();
  const copy = getContent(locale).auth;
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'ready'; displayName: string | null; email: string } | { kind: 'error' } | { kind: 'unauthenticated' }>({ kind: 'loading' });
  const [pending, setPending] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  useEffect(() => {
    let active = true;
    void getApiV1AuthMe().then((result) => {
      if (!active) return;
      if (result.status === 200) setState({ kind: 'ready', displayName: result.data.data.display_name ?? null, email: result.data.data.email });
      else if (result.status === 401) setState({ kind: 'unauthenticated' });
      else setState({ kind: 'error' });
    }).catch(() => { if (active) setState({ kind: 'error' }); });
    return () => { active = false; };
  }, []);

  const signOut = async () => {
    if (pending) return;
    setPending(true);
    setSignOutError(false);
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) throw new Error('Could not start sign out');
      const result = await postApiV1AuthLogout({ headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status !== 200) throw new Error('Could not end session');
      router.replace('/');
      router.refresh();
    } catch {
      setPending(false);
      setSignOutError(true);
    }
  };

  if (state.kind === 'loading') return <LoadingState label={copy.accountLoading} />;
  if (state.kind === 'unauthenticated') return <div><p className="mb-4 text-sm text-[var(--color-muted-foreground)]">{copy.reauthDescription}</p><Button onClick={() => router.push('/masuk-ulang')}>{copy.signInTitle}</Button></div>;
  if (state.kind === 'error') return <ErrorState title={copy.accountTitle} description={copy.accountError} retryLabel={copy.retry} onRetry={() => { setState({ kind: 'loading' }); void getApiV1AuthMe().then((result) => { if (result.status === 200) setState({ kind: 'ready', displayName: result.data.data.display_name ?? null, email: result.data.data.email }); else if (result.status === 401) setState({ kind: 'unauthenticated' }); else setState({ kind: 'error' }); }).catch(() => setState({ kind: 'error' })); }} />;

  return <div>
    <div className="flex items-center gap-4">
      <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)]"><CircleUserRound size={30} aria-hidden="true" /></span>
      <div className="min-w-0">
        {state.displayName && <h2 className="break-words font-[family-name:var(--font-display)] text-xl font-bold">{state.displayName}</h2>}
        <p className="mt-1 flex min-w-0 items-start gap-2 break-all text-sm text-[var(--color-muted-foreground)]"><Mail className="mt-0.5 shrink-0" size={16} aria-hidden="true" /><span>{state.email}</span></p>
      </div>
    </div>
    {signOutError && <p role="alert" className="mt-4 text-sm text-[var(--color-destructive)]">{copy.accountError}</p>}
    <Button type="button" onClick={signOut} loading={pending} variant="primary" className="mt-6" style={{ backgroundColor: '#FC6C85', color: '#17130f' }}><LogOut size={17} aria-hidden="true" />{copy.signOut}</Button>
  </div>;
}
