'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

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

export function adminErrorKey(status?: number) {
  if (status === 401) return 'error401';
  if (status === 403) return 'error403';
  if (status === 404) return 'error404';
  if (status === 409) return 'error409';
  if (status === 422) return 'error422';
  if (status === 429) return 'error429';
  if (status === 503) return 'error503';
  return 'errorGeneric';
}

export function formatAdminDate(value: string | null | undefined, locale: AdminLocale) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatAdminNumber(value: number | null | undefined, locale: AdminLocale) {
  return new Intl.NumberFormat(locale).format(value ?? 0);
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
  const t = useTranslations('admin.common');
  return <main className="mx-auto w-full max-w-7xl px-4 py-7 pb-24 sm:px-6 lg:px-8 lg:py-10">
    <header className="mb-7 border-b border-[var(--color-border)] pb-6">
      <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">{t('operationsLabel')}</p>
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
  void locale;
  const router = useRouter();
  const t = useTranslations('admin.common');
  return <AdminCard>
    <AdminFeedback>{t(adminErrorKey(status))}</AdminFeedback>
    <Button className="mt-4" variant="secondary" onClick={status === 401 ? () => router.replace('/admin/masuk') : retry}>{status === 401 ? t('signInAgain') : t('reload')}</Button>
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
  const t = useTranslations('admin.common');
  void locale;
  if (!hasMore || !cursor) return null;
  return <div className="flex justify-end"><Button variant="secondary" disabled={busy} loading={busy} onClick={onNext}>{t('loadNextPage')}</Button></div>;
}

export function AdminOfflineNote({ online, locale }: { online: boolean; locale: AdminLocale }) {
  const t = useTranslations('admin.common');
  void locale;
  return online ? null : <AdminFeedback kind="status">{t('offline')}</AdminFeedback>;
}

export function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 text-sm font-semibold">{label}<span className="mt-1.5 block">{children}</span></label>;
}

export const adminInputClass = 'min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-normal text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-60';
