'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import { HelpFrame } from '@/features/help/help-frame';
import { GuideSearch, matchesGuideText } from '@/features/help/guide-search';

const sections = {
  id: [
    ['Masuk, MFA, dan sesi Admin', 'Admin masuk melalui halaman terpisah dan memverifikasi MFA. Sesi Admin berbeda dari akun Kepotret biasa; sesi pengguna biasa tidak membuka konsol Admin. Keluar mengakhiri sesi Admin.'],
    ['Pengguna', 'Cari akun dengan filter server. Detail menyediakan penangguhan, aktivasi kembali, dan pencabutan sesi pengguna biasa. Album dan pembayaran tetap dipertahankan. Tidak ada penghapusan akun atau pengaturan kata sandi.'],
    ['Diagnostik album', 'Detail menampilkan jadwal, kuota, status kesiapan, transaksi, isu, dan siklus hidup. Admin bukan Pemilik dan tidak dapat mengambil alih setup, izin kolaborator, tautan, moderasi, jadwal, upgrade, atau ekspor milik Pemilik.'],
    ['Pembayaran', 'Diagnosis menampilkan snapshot transaksi dan ringkasan tanda terima yang telah disaring. Rekonsiliasi hanya memeriksa ulang status provider. Admin tidak dapat menandai pembayaran berhasil, memberi entitlement, mengubah kuota, atau melakukan refund.'],
    ['Katalog paket', 'Riwayat versi bersifat immutable. Perubahan harga atau kuota membuat versi baru. Status penjualan tidak mengubah snapshot transaksi lama. Kategori acara dapat dikelola tanpa menghapus identitas historis.'],
    ['Konfigurasi operasional', 'Ubah hanya nilai bertipe yang secara eksplisit ditandai dapat diedit. Setiap perubahan memakai versi server; jika terjadi konflik, tinjau nilai terbaru sebelum menyimpan lagi. Aturan produk inti tetap terkunci.'],
    ['Isu operasional dan audit', 'Isu menyediakan ringkasan aman, acknowledgment, dan penyelesaian dengan alasan. Log audit hanya-baca dan append-only; keduanya bukan penampil log mentah.'],
    ['Roster Admin', 'Roster hanya-baca. Dashboard tidak menyediakan pembuatan Admin, undangan, reset kata sandi, perubahan grant, atau penghapusan Admin. Provisioning ditangani melalui proses operator.'],
    ['Akses media sensitif', 'Dari detail album, minta grant sementara dengan alasan dan MFA step-up. Grant hanya untuk satu album, view-only, dan dicatat. Tidak ada unduh, berbagi, ZIP, moderasi, hapus, atau pemulihan. Grant berakhir atau dapat dicabut.'],
    ['Operational Hold', 'Dari detail album, buat atau lepaskan Hold menggunakan alasan dan MFA step-up. Hold menutup akses tamu, kamera, galeri, berbagi, unduhan, dan ZIP baru; tidak mengubah jadwal, pembayaran, kepemilikan, retensi, atau media. Hold tidak memberikan akses foto privat.'],
    ['Batas kewenangan', 'Konsol tidak menyediakan pengambilalihan Pemilik, mutasi foto arbitrer, keberhasilan pembayaran manual, pemberian entitlement, atau pengelolaan kredensial Admin. Akses media sensitif dan Hold adalah wewenang yang terpisah.'],
  ],
  en: [
    ['Admin sign-in, MFA, and session', 'Admins use a separate sign-in page and verify MFA. An Admin session is distinct from an ordinary Kepotret account; an ordinary User session cannot open the Admin console. Signing out ends the Admin session.'],
    ['Users', 'Search accounts with server-side filters. Details support suspension, reactivation, and revoking ordinary User sessions. Albums and payments are preserved. There is no account deletion or password setting.'],
    ['Album diagnostics', 'Details show schedule, quota, readiness, transactions, issues, and lifecycle. Admin is not the Owner and cannot take over setup, collaborator permissions, links, moderation, schedules, upgrades, or Owner exports.'],
    ['Payments', 'Diagnosis shows transaction snapshots and redacted receipt summaries. Reconciliation only re-checks the provider state. Admin cannot mark a payment successful, grant entitlements, change quota, or issue refunds.'],
    ['Package catalog', 'Version history is immutable. Price or quota changes create a new version. Sale status does not change historical transaction snapshots. Event categories can be managed without deleting historical identity.'],
    ['Operational configuration', 'Change only typed values explicitly marked editable. Each update uses the server version; after a conflict, review the current value before saving again. Core product rules remain locked.'],
    ['Operational issues and audit', 'Issues provide safe summaries, acknowledgement, and reasoned resolution. Audit records are read-only and append-only; neither surface is a raw log viewer.'],
    ['Admin roster', 'The roster is read-only. The dashboard does not create Admins, invite them, reset passwords, change grants, or delete Admins. Provisioning is handled through the operator process.'],
    ['Sensitive media access', 'From an album detail, request a temporary grant with a reason and MFA step-up. A grant is limited to one album, view-only, and audited. There is no download, sharing, ZIP, moderation, delete, or restore. Grants expire or can be revoked.'],
    ['Operational Hold', 'From an album detail, create or release a Hold with a reason and MFA step-up. A Hold closes guest access, camera, gallery, sharing, downloads, and new ZIP creation; it does not change schedule, payment, ownership, retention, or media. A Hold does not grant private-photo access.'],
    ['Authority boundaries', 'The console does not provide Owner takeover, arbitrary photo mutation, manual payment success, entitlement grants, or Admin credential management. Sensitive media access and Hold are separate authorities.'],
  ],
} as const;

export default function AdminHelpPage() {
  const locale = useLocale() === 'en' ? 'en' : 'id'; const id = locale === 'id';
  const [query, setQuery] = useState('');
  const visible = sections[locale].map(([title, body], index) => ({ title, body, index })).filter(({ title, body }) => matchesGuideText(query, title, body));
  const contents = id ? 'Isi panduan' : 'Guide contents';
  return <HelpFrame locale={locale}><main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
    <header className="mb-8 border-b border-[var(--color-border)] pb-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">{id ? 'PANDUAN ADMIN' : 'ADMIN GUIDE'}</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">{id ? 'Operasi yang jelas, dengan batas kewenangan.' : 'Clear operations with clear authority.'}</h1><p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{id ? 'Panduan Superadmin Kepotret. Semua akses sensitif tetap mengikuti sesi, verifikasi, dan keputusan server.' : 'Kepotret Superadmin guide. Sensitive access always follows the current session, verification, and server decisions.'}</p></header>
    <GuideSearch locale={locale} query={query} onQueryChange={setQuery} count={visible.length} />
    <div className="grid min-w-0 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <nav aria-label={contents} className="lg:sticky lg:top-6 lg:self-start"><details className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:hidden"><summary className="cursor-pointer font-semibold">{contents}</summary><ol className="mt-3 space-y-1">{visible.map(({ title, index }) => <li key={index}><a href={`#admin-guide-${index + 1}`} className="inline-flex min-h-11 items-center text-sm hover:underline">{title}</a></li>)}</ol></details><div className="hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:block"><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--color-muted-foreground)]">{contents}</p><ol className="mt-3 space-y-1">{visible.map(({ title, index }) => <li key={index}><a href={`#admin-guide-${index + 1}`} className="flex min-h-11 items-center rounded-[var(--radius-md)] px-2 text-sm hover:bg-[var(--color-muted)]">{title}</a></li>)}</ol></div></nav>
      <div className="min-w-0 space-y-4">{visible.map(({ title, body, index }) => <section id={`admin-guide-${index + 1}`} key={index} className="scroll-mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"><h2 className="font-[family-name:var(--font-display)] text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{body}</p></section>)}</div>
    </div>
    <Link href="/admin" className="mt-8 inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold hover:bg-[var(--color-muted)]">{id ? 'Kembali ke konsol Admin' : 'Back to Admin console'}</Link>
  </main></HelpFrame>;
}
