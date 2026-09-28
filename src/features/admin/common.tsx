'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { getApiV1AdminSecurityCsrf } from '@/lib/api/admin-browser';

export type AdminLocale = 'id' | 'en';

export class AdminRequestError extends Error {
  constructor(readonly status: number) {
    super(`Admin request failed with status ${status}`);
    this.name = 'AdminRequestError';
  }
}

export async function adminCsrfHeaders(): Promise<HeadersInit> {
  const response = await getApiV1AdminSecurityCsrf();
  if (response.status !== 200) throw new AdminRequestError(response.status);
  return { 'X-CSRF-Token': response.data.data.csrf_token };
}

export function adminErrorText(locale: AdminLocale, status?: number) {
  if (status === 401) return locale === 'id' ? 'Sesi Admin berakhir. Masuk kembali untuk melanjutkan.' : 'Your Admin session ended. Sign in again to continue.';
  if (status === 403) return locale === 'id' ? 'Akses Admin tidak tersedia untuk tindakan ini.' : 'Admin access is not available for this action.';
  if (status === 404) return locale === 'id' ? 'Data tidak ditemukan.' : 'The requested record was not found.';
  if (status === 409) return locale === 'id' ? 'Data berubah di tempat lain. Muat ulang sebelum mencoba lagi.' : 'This record changed elsewhere. Reload before trying again.';
  if (status === 422) return locale === 'id' ? 'Server menolak nilai ini. Periksa isian dan coba lagi.' : 'The server rejected this value. Review the fields and try again.';
  if (status === 429) return locale === 'id' ? 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.' : 'Too many requests. Wait briefly, then try again.';
  if (status === 503) return locale === 'id' ? 'Layanan pendukung sedang tidak tersedia. Coba lagi nanti.' : 'A supporting service is unavailable. Try again later.';
  return locale === 'id' ? 'Data Admin belum dapat dimuat. Coba lagi.' : 'Admin data could not be loaded. Try again.';
}

export function formatAdminDate(value: string | null | undefined, locale: AdminLocale) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatAdminNumber(value: number | null | undefined, locale: AdminLocale) {
  return new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-US').format(value ?? 0);
}

export function useAdminOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export function AdminPage({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-7xl px-4 py-7 pb-24 sm:px-6 lg:px-8 lg:py-10">
    <header className="mb-7 border-b border-[var(--color-border)] pb-6">
      <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">KEPOTRET · OPERATIONS</p>
      <h1 className="font-[var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-muted-foreground)]">{description}</p>}
    </header>
    <div className="space-y-6">{children}</div>
  </main>;
}

export function AdminCard({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5 ${className}`}>
    {title && <h2 className="mb-4 font-[var(--font-display)] text-lg font-bold">{title}</h2>}
    {children}
  </section>;
}

export function AdminFeedback({ children, kind = 'error' }: { children: React.ReactNode; kind?: 'error' | 'status' }) {
  return <p role={kind === 'error' ? 'alert' : 'status'} className={`rounded-[var(--radius-md)] border p-3 text-sm leading-6 ${kind === 'error' ? 'border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/5' : 'border-[var(--color-border)] bg-[var(--color-muted)]'}`}>{children}</p>;
}

export function AdminError({ locale, status, retry }: { locale: AdminLocale; status?: number; retry: () => void }) {
  const router = useRouter();
  return <AdminCard>
    <AdminFeedback>{adminErrorText(locale, status)}</AdminFeedback>
    <Button className="mt-4" variant="secondary" onClick={status === 401 ? () => router.replace('/admin/masuk') : retry}>{status === 401 ? (locale === 'id' ? 'Masuk kembali' : 'Sign in again') : (locale === 'id' ? 'Muat ulang' : 'Reload')}</Button>
  </AdminCard>;
}

export function AdminEmpty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">{children}</p>;
}

export function AdminStatus({ value }: { value: string }) {
  const tone = value === 'OPEN' || value === 'PENDING' || value === 'DRAFT' ? 'border-amber-500/40 bg-amber-500/10' : value === 'SUCCESS' || value === 'READY' || value === 'ACTIVE' || value === 'RESOLVED' ? 'border-emerald-600/30 bg-emerald-600/10' : value === 'REVOKED' || value === 'FAILURE' || value === 'EXPIRED' ? 'border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/5' : 'border-[var(--color-border)] bg-[var(--color-muted)]';
  return <span className={`inline-flex max-w-full break-words rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{value.replaceAll('_', ' ')}</span>;
}

export function AdminPagination({ hasMore, cursor, busy, locale, onNext }: { hasMore: boolean; cursor: string | null; busy: boolean; locale: AdminLocale; onNext: () => void }) {
  if (!hasMore || !cursor) return null;
  return <div className="flex justify-end"><Button variant="secondary" disabled={busy} loading={busy} onClick={onNext}>{locale === 'id' ? 'Muat halaman berikutnya' : 'Load next page'}</Button></div>;
}

export function AdminOfflineNote({ online, locale }: { online: boolean; locale: AdminLocale }) {
  return online ? null : <AdminFeedback kind="status">{locale === 'id' ? 'Kamu sedang offline. Aksi Admin dinonaktifkan dan tidak akan dimasukkan ke antrean.' : 'You are offline. Admin actions are disabled and will not be queued.'}</AdminFeedback>;
}

export function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 text-sm font-semibold">{label}<span className="mt-1.5 block">{children}</span></label>;
}

export const adminInputClass = 'min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-normal text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-60';
