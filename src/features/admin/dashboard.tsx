'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { Activity, Album, Camera, CreditCard, ShieldAlert, Users } from 'lucide-react';

import { getApiV1AdminOverview } from '@/lib/api/admin-browser';
import type { AdminOverview } from '@/lib/api/generated/index.schemas';
import { AdminCard, AdminError, AdminFeedback, AdminPage, formatAdminDate, formatAdminNumber, type AdminLocale } from './common';

export function AdminDashboard() {
  const locale = (useLocale() === 'en' ? 'en' : 'id') as AdminLocale;
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<number | undefined>();
  const [busy, setBusy] = useState(true);
  const id = locale === 'id';

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
    { label: id ? 'Pengguna' : 'Users', value: data.total_users, note: id ? `${data.suspended_users} ditangguhkan` : `${data.suspended_users} suspended`, icon: Users, href: '/admin/users' },
    { label: id ? 'Album' : 'Albums', value: data.total_albums, note: id ? `${data.ready_albums} siap · ${data.payment_pending_albums} menunggu pembayaran` : `${data.ready_albums} ready · ${data.payment_pending_albums} awaiting payment`, icon: Album, href: '/admin/albums' },
    { label: id ? 'Foto tersimpan' : 'Committed photos', value: data.committed_photos, note: id ? `${data.reserved_photos} sedang dicadangkan` : `${data.reserved_photos} currently reserved`, icon: Camera, href: '/admin/albums' },
    { label: id ? 'Pembayaran berhasil' : 'Successful payments', value: data.successful_payments, note: id ? `${data.pending_payments} menunggu · ${data.processing_payments} diproses` : `${data.pending_payments} pending · ${data.processing_payments} processing`, icon: CreditCard, href: '/admin/payments' },
    { label: id ? 'Isu terbuka' : 'Open issues', value: data.open_issues, note: id ? `${data.acknowledged_issues} sudah ditanggapi` : `${data.acknowledged_issues} acknowledged`, icon: Activity, href: '/admin/issues' },
    { label: id ? 'Operational Hold aktif' : 'Active operational holds', value: data.active_holds, note: id ? 'Containment aktif pada album' : 'Containment active on albums', icon: ShieldAlert, href: '/admin/albums' },
  ] : [];

  return <AdminPage title={id ? 'Ringkasan operasional' : 'Operations overview'} description={id ? 'Agregat terkini yang dihitung server. Ringkasan ini tidak membuka media privat.' : 'Current server-derived aggregates. This overview does not expose private media.'}>
    {error !== undefined || (!data && !busy) ? <AdminError locale={locale} status={error} retry={() => void load()} /> : <>
      {busy && <p role="status" className="text-sm text-[var(--color-muted-foreground)]">{id ? 'Memuat ringkasan…' : 'Loading overview…'}</p>}
      {data && <>
        <section aria-label={id ? 'Metrik operasional' : 'Operational metrics'} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ label, value, note, icon: Icon, href }) => <Link key={label} href={href} className="group min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-foreground)] sm:p-5"><span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-muted)]"><Icon size={19} aria-hidden="true" /></span><span className="mt-4 block text-sm font-semibold text-[var(--color-muted-foreground)]">{label}</span><span className="mt-1 block font-[var(--font-display)] text-3xl font-bold tabular-nums">{formatAdminNumber(value, locale)}</span><span className="mt-2 block text-xs leading-5 text-[var(--color-muted-foreground)]">{note}</span></Link>)}
        </section>
        <AdminCard title={id ? 'Pembayaran selain berhasil' : 'Other payment states'}>
          <div className="grid gap-3 sm:grid-cols-2"><p className="rounded-[var(--radius-md)] bg-[var(--color-muted)] p-4 text-sm">{id ? 'Menunggu' : 'Pending'} <strong className="ml-2 tabular-nums">{formatAdminNumber(data.pending_payments, locale)}</strong></p><p className="rounded-[var(--radius-md)] bg-[var(--color-muted)] p-4 text-sm">{id ? 'Diproses' : 'Processing'} <strong className="ml-2 tabular-nums">{formatAdminNumber(data.processing_payments, locale)}</strong></p><p className="rounded-[var(--radius-md)] bg-[var(--color-muted)] p-4 text-sm">{id ? 'Gagal' : 'Failed'} <strong className="ml-2 tabular-nums">{formatAdminNumber(data.failed_payments, locale)}</strong></p></div>
        </AdminCard>
        <AdminFeedback kind="status">{id ? `Data agregat diperbarui ${formatAdminDate(data.generated_at, locale)}. Semua metrik berasal dari server.` : `Aggregates updated ${formatAdminDate(data.generated_at, locale)}. All metrics are server-derived.`}</AdminFeedback>
      </>}
    </>}
  </AdminPage>;
}
