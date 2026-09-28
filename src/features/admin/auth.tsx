'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LocaleControl } from '@/components/ui/locale-control';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import type { AdminSessionState } from '@/lib/api/generated/index.schemas';
import {
  getApiV1AdminAuthMe,
  postApiV1AdminAuthLogin,
  postApiV1AdminAuthLogout,
  postApiV1AdminAuthMfaVerify,
} from '@/lib/api/admin-browser';
import {
  AdminCard,
  AdminFeedback,
  AdminField,
  AdminRequestError,
  adminCsrfHeaders,
  adminErrorText,
  adminInputClass,
  type AdminLocale,
} from './common';
import { AdminShell } from './shell';

function localeOf(locale: string): AdminLocale { return locale === 'en' ? 'en' : 'id'; }

function AuthFrame({ locale, children }: { locale: AdminLocale; children: React.ReactNode }) {
  const text = locale === 'id';
  return <main className="min-h-screen bg-[var(--color-background)] px-4 py-5 text-[var(--color-foreground)] sm:px-6">
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-3">
      <Link href="/" aria-label="Kepotret" className="inline-flex min-h-11 items-center rounded bg-white px-2 py-1"><Image src="/brand/logo.svg" alt="Kepotret" width={106} height={35} priority /></Link>
      <div className="flex items-center gap-1"><LocaleControl label={text ? 'Bahasa' : 'Language'} indonesianLabel="Bahasa Indonesia" englishLabel="English" indonesianShort="ID" englishShort="EN" /><ThemeToggle lightLabel={text ? 'Ganti ke tema terang' : 'Switch to light theme'} darkLabel={text ? 'Ganti ke tema gelap' : 'Switch to dark theme'} /></div>
    </header>
    <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-6xl items-center gap-10 py-10 lg:grid-cols-[1fr_minmax(20rem,30rem)] lg:gap-20">
      <section className="hidden max-w-xl lg:block"><p className="flex items-center gap-2 text-xs font-bold tracking-[.17em] text-[var(--color-muted-foreground)]"><span className="size-2.5 rounded-full bg-[var(--color-primary)] ring-1 ring-[var(--color-foreground)]" />KEPOTRET · OPERATIONS</p><h1 className="mt-5 font-[var(--font-display)] text-5xl font-bold tracking-tight">{text ? 'Ruang kerja operasional.' : 'Operations, with clear authority.'}</h1><p className="mt-4 max-w-lg text-base leading-7 text-[var(--color-muted-foreground)]">{text ? 'Akses khusus Admin menggunakan sesi dan verifikasi yang terpisah dari akun Kepotret biasa.' : 'Privileged Admin access uses its own session and verification, separate from ordinary Kepotret accounts.'}</p></section>
      <div className="mx-auto w-full max-w-lg">{children}</div>
    </div>
  </main>;
}

export function AdminLogin() {
  const locale = localeOf(useLocale());
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = locale === 'id';

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const result = await postApiV1AdminAuthLogin({ email: email.trim(), password }, { headers: await adminCsrfHeaders() });
      setPassword('');
      if (result.status === 202) { router.replace('/admin/mfa'); return; }
      if (result.status === 403) { router.replace('/admin/akses-ditolak'); return; }
      setError(result.status === 400 || result.status === 401 ? (id ? 'Email atau kata sandi tidak dapat diverifikasi.' : 'The email or password could not be verified.') : adminErrorText(locale, result.status));
    } catch (reason) {
      setPassword('');
      setError(reason instanceof AdminRequestError ? adminErrorText(locale, reason.status) : adminErrorText(locale));
    } finally { setBusy(false); }
  }

  return <AuthFrame locale={locale}><AdminCard>
    <span className="inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-muted)]"><ShieldCheck size={21} aria-hidden="true" /></span>
    <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">H20 · {id ? 'SUPERADMIN' : 'SUPERADMIN'}</p>
    <h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold">{id ? 'Masuk sebagai Superadmin' : 'Superadmin sign in'}</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{id ? 'Gunakan kredensial Admin yang dikelola melalui proses internal yang disetujui.' : 'Use Admin credentials provisioned through the approved internal process.'}</p>
    <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
      <AdminField label={id ? 'Email' : 'Email'}><input className={adminInputClass} type="email" name="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} /></AdminField>
      <AdminField label={id ? 'Kata sandi' : 'Password'}><input className={adminInputClass} type="password" name="password" autoComplete="current-password" required maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /></AdminField>
      {error && <AdminFeedback>{error}</AdminFeedback>}
      <Button type="submit" className="w-full" loading={busy}>{id ? 'Lanjutkan ke verifikasi MFA' : 'Continue to MFA verification'}</Button>
    </form>
    <p className="mt-5 text-xs leading-5 text-[var(--color-muted-foreground)]">{id ? 'Tidak ada pendaftaran publik, login Google, atau pemulihan kata sandi di sini.' : 'There is no public signup, Google sign-in, or password reset here.'}</p>
    <Link href="/" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"><ArrowLeft size={16} aria-hidden="true" />{id ? 'Kembali ke Kepotret' : 'Back to Kepotret'}</Link>
  </AdminCard></AuthFrame>;
}

export function AdminMfa() {
  const locale = localeOf(useLocale());
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = locale === 'id';

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const result = await postApiV1AdminAuthMfaVerify({ totp_code: code }, { headers: await adminCsrfHeaders() });
      setCode('');
      if (result.status === 200) { router.replace('/admin'); return; }
      if (result.status === 403) { router.replace('/admin/akses-ditolak'); return; }
      if (result.status === 404) { router.replace('/admin/masuk'); return; }
      setError(result.status === 401 ? (id ? 'Kode tidak diterima atau tantangan telah berakhir. Coba masuk kembali.' : 'The code was not accepted or the challenge expired. Sign in again.') : adminErrorText(locale, result.status));
    } catch (reason) {
      setCode('');
      setError(reason instanceof AdminRequestError ? adminErrorText(locale, reason.status) : adminErrorText(locale));
    } finally { setBusy(false); }
  }

  return <AuthFrame locale={locale}><AdminCard>
    <span className="inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-muted)]"><ShieldCheck size={21} aria-hidden="true" /></span>
    <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">H21 · MFA</p>
    <h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold">{id ? 'Verifikasi kode MFA' : 'Verify your MFA code'}</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{id ? 'Masukkan kode sekali pakai untuk menyelesaikan sesi Admin. Kode tidak disimpan.' : 'Enter your one-time code to complete the Admin session. The code is not stored.'}</p>
    <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
      <AdminField label={id ? 'Kode autentikasi' : 'Authentication code'}><input className={`${adminInputClass} text-center font-mono text-xl tracking-[.35em]`} type="text" inputMode="numeric" pattern="[0-9]{6,12}" autoComplete="one-time-code" name="totp_code" required minLength={6} maxLength={12} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 12))} disabled={busy} /></AdminField>
      {error && <AdminFeedback>{error}</AdminFeedback>}
      <Button type="submit" className="w-full" loading={busy}>{id ? 'Verifikasi dan masuk' : 'Verify and sign in'}</Button>
    </form>
    <Link href="/admin/masuk" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">{id ? 'Mulai kembali dengan masuk' : 'Start again from sign in'}</Link>
  </AdminCard></AuthFrame>;
}

export function AdminDenied() {
  const locale = localeOf(useLocale());
  const id = locale === 'id';
  return <AuthFrame locale={locale}><AdminCard>
    <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">H22 · {id ? 'AKSES ADMIN' : 'ADMIN ACCESS'}</p>
    <h2 className="mt-3 font-[var(--font-display)] text-2xl font-bold">{id ? 'Akses Admin tidak tersedia' : 'Admin access is unavailable'}</h2>
    <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{id ? 'Akses istimewa dikunci atau tidak tersedia. Detail kredensial tidak ditampilkan. Hubungi operator melalui proses internal yang disetujui.' : 'Privileged access is locked or unavailable. Credential details are not shown. Contact an operator through the approved internal process.'}</p>
    <Link href="/admin/masuk" className="mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)]">{id ? 'Kembali ke masuk Admin' : 'Back to Admin sign in'}</Link>
  </AdminCard></AuthFrame>;
}

export function AdminWorkspace({ children }: { children: React.ReactNode }) {
  const locale = localeOf(useLocale());
  const [session, setSession] = useState<AdminSessionState | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorCode, setErrorCode] = useState<number | undefined>();

  async function verifySession() {
    setStatus('loading');
    try {
      const result = await getApiV1AdminAuthMe();
      if (result.status === 200 && result.data.data.mfa_verified) {
        setSession(result.data.data); setStatus('ready'); setErrorCode(undefined); return;
      }
      setSession(null);
      if (result.status === 403) { window.location.replace('/admin/akses-ditolak'); return; }
      if (result.status === 401 || result.status === 200) { window.location.replace('/admin/masuk'); return; }
      setErrorCode(result.status); setStatus('error');
    } catch {
      setErrorCode(undefined); setStatus('error');
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- verify the cookie session after mount
  useEffect(() => { void verifySession(); }, []);

  async function logout() {
    try {
      const result = await postApiV1AdminAuthLogout({ headers: await adminCsrfHeaders() });
      if (result.status === 200 || result.status === 401) { window.location.replace('/admin/masuk'); return; }
      setErrorCode(result.status); setStatus('error');
    } catch (reason) {
      setErrorCode(reason instanceof AdminRequestError ? reason.status : undefined); setStatus('error');
    }
  }

  if (status === 'loading') return <div role="status" className="grid min-h-screen place-items-center p-6 text-sm text-[var(--color-muted-foreground)]">{locale === 'id' ? 'Memeriksa sesi Admin…' : 'Checking Admin session…'}</div>;
  if (status === 'error') return <main className="mx-auto max-w-xl p-6"><AdminCard><AdminFeedback>{adminErrorText(locale, errorCode)}</AdminFeedback><Button className="mt-4" variant="secondary" onClick={() => void verifySession()}>{locale === 'id' ? 'Coba lagi' : 'Try again'}</Button></AdminCard></main>;
  if (!session) return null;
  return <AdminShell session={session} locale={locale} onLogout={() => void logout()}>{children}</AdminShell>;
}
