'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Activity, Album, Camera, CreditCard, ShieldAlert, Users } from 'lucide-react';

import { getApiV1AdminOverview } from '@/lib/api/admin-browser';
import type { AdminOverview } from '@/lib/api/generated/index.schemas';
import { AdminCard, AdminError, AdminFeedback, AdminPage, formatAdminDate, formatAdminNumber, type AdminLocale } from './common';

export function AdminDashboard() {
  const t = useTranslations('admin.dashboard');
  const locale = (useLocale() === 'en' ? 'en' : 'id') as AdminLocale;
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<number | undefined>();
  const [busy, setBusy] = useState(true);

  async function load() {
    setBusy(true); setError(undefined);
    try {
      const result = await getApiV1AdminOverview();
      if (result.status === 200) setData(result.data.data);
      else setError(result.status);
    } catch { setError(undefined); }
    finally { setBusy(false); }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load server-derived metrics after mount
  useEffect(() => { void load(); }, []);

  const cards = data ? [
    { label: t('users'), value: data.total_users, note: t('suspended', { count: data.suspended_users }), icon: Users, href: '/admin/users' },
    { label: t('albums'), value: data.total_albums, note: t('albumsNote', { ready: data.ready_albums, awaiting: data.payment_pending_albums }), icon: Album, href: '/admin/albums' },
    { label: t('photos'), value: data.committed_photos, note: t('reserved', { count: data.reserved_photos }), icon: Camera, href: '/admin/albums' },
    { label: t('payments'), value: data.successful_payments, note: t('paymentsNote', { pending: data.pending_payments, processing: data.processing_payments }), icon: CreditCard, href: '/admin/payments' },
    { label: t('issues'), value: data.open_issues, note: t('acknowledged', { count: data.acknowledged_issues }), icon: Activity, href: '/admin/issues' },
    { label: t('holds'), value: data.active_holds, note: t('holdNote'), icon: ShieldAlert, href: '/admin/albums' },
  ] : [];

  return <AdminPage title={t('title')} description={t('description')}>
    {error !== undefined || (!data && !busy) ? <AdminError locale={locale} status={error} retry={() => void load()} /> : <>
      {busy && <p role="status" className="text-sm text-[var(--color-muted-foreground)]">{t('loading')}</p>}
      {data && <>
        <section aria-label={t('metrics')} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ label, value, note, icon: Icon, href }) => <Link key={label} href={href} className="group min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-foreground)] sm:p-5"><span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-muted)]"><Icon size={19} aria-hidden="true" /></span><span className="mt-4 block text-sm font-semibold text-[var(--color-muted-foreground)]">{label}</span><span className="mt-1 block font-[var(--font-display)] text-3xl font-bold tabular-nums">{formatAdminNumber(value, locale)}</span><span className="mt-2 block text-xs leading-5 text-[var(--color-muted-foreground)]">{note}</span></Link>)}
        </section>
        <AdminCard title={t('otherPayments')}>
          <div className="grid gap-3 sm:grid-cols-2"><p className="rounded-[var(--radius-md)] bg-[var(--color-muted)] p-4 text-sm">{t('pending')} <strong className="ml-2 tabular-nums">{formatAdminNumber(data.pending_payments, locale)}</strong></p><p className="rounded-[var(--radius-md)] bg-[var(--color-muted)] p-4 text-sm">{t('processing')} <strong className="ml-2 tabular-nums">{formatAdminNumber(data.processing_payments, locale)}</strong></p><p className="rounded-[var(--radius-md)] bg-[var(--color-muted)] p-4 text-sm">{t('failed')} <strong className="ml-2 tabular-nums">{formatAdminNumber(data.failed_payments, locale)}</strong></p></div>
        </AdminCard>
        <AdminFeedback kind="status">{t('updated', { date: formatAdminDate(data.generated_at, locale) })}</AdminFeedback>
      </>}
    </>}
  </AdminPage>;
}
