import Link from 'next/link';
import { ArrowLeft, Camera, Images } from 'lucide-react';
import { getLocale } from 'next-intl/server';

import { HelpFrame } from '@/features/help/help-frame';
import type { HelpLocale } from '@/features/help/content';

const guide = {
  id: {
    eyebrow: 'PANDUAN TAMU', title: 'Ikut memotret dan menikmati momen.', intro: 'Tamu tidak perlu membuat akun. Gunakan QR atau tautan acara yang diberikan penyelenggara.', back: 'Semua panduan',
    steps: [
      ['Buka acara', 'Pindai QR atau buka tautan acara. Masukkan nama tampilan; jika diminta, masukkan PIN dari penyelenggara. Nama yang sama boleh digunakan oleh lebih dari satu tamu.'],
      ['Izinkan kamera', 'Baca pemberitahuan privasi, lalu izinkan kamera browser. Foto hanya dapat diambil langsung dari kamera selama waktu potret masih dibuka oleh server; unggah dari penyimpanan perangkat tidak tersedia.'],
      ['Tinjau foto', 'Setelah memotret, pilih Ambil ulang atau Gunakan foto. Tunggu sampai penyimpanan dikonfirmasi sebelum mengambil foto berikutnya.'],
      ['Tunggu publikasi', 'Foto baru tampil setelah waktu publikasi album, sesuai pengaturan D+1, D+3, D+5, atau D+7 dan moderasi penyelenggara.'],
      ['Jelajahi galeri', 'Saat galeri tersedia, urutkan dan buka foto untuk melihat detail. Jumlah foto yang ditampilkan hanya menghitung foto yang telah dimuat di halaman.'],
      ['Sukai, unduh, bagikan', 'Tindakan ini tersedia hanya jika diizinkan untuk foto tersebut. Unduh satu foto melalui tombol pada detail foto; unduh ZIP beberapa foto belum tersedia.'],
      ['Akses berakhir', 'Kamera berhenti setelah waktu potret selesai. Galeri juga tidak dapat dibuka lagi setelah masa akses tamu berakhir.'],
    ],
  },
  en: {
    eyebrow: 'GUEST GUIDE', title: 'Take photos and enjoy the moments.', intro: 'Guests do not need an account. Use the event QR code or link shared by the organizer.', back: 'All guides',
    steps: [
      ['Open the event', 'Scan the QR code or open the event link. Enter a display name and, if requested, the PIN from the organizer. More than one guest may use the same name.'],
      ['Allow camera access', 'Read the privacy notice, then allow browser camera access. Photos can only be taken directly with the camera while the server keeps capture open; device uploads are unavailable.'],
      ['Review your photo', 'After capture, choose Retake or Use photo. Wait for the save confirmation before taking another photo.'],
      ['Wait for reveal', 'Photos appear after the album reveal time, following the organizer’s D+1, D+3, D+5, or D+7 setting and moderation.'],
      ['Browse the gallery', 'When the gallery is available, sort and open photos for details. The displayed photo count covers only photos loaded on the page.'],
      ['Like, download, share', 'These actions appear only when permitted for that photo. Download one photo from its detail view; multi-photo ZIP download is not available yet.'],
      ['When access ends', 'The camera closes after the capture window. The gallery also closes when guest access ends.'],
    ],
  },
} as const;

export default async function GuestHelpPage() {
  const locale = await getLocale() as HelpLocale;
  const copy = guide[locale];
  return <HelpFrame locale={locale}><main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
    <Link href="/help" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"><ArrowLeft size={18} aria-hidden="true" />{copy.back}</Link>
    <div className="mt-8 flex gap-3 text-[var(--color-foreground)]"><Camera size={22} aria-hidden="true" /><Images size={22} aria-hidden="true" /></div>
    <p className="mt-6 text-xs font-bold tracking-[.16em] text-[var(--color-muted-foreground)]">{copy.eyebrow}</p>
    <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-5xl">{copy.title}</h1>
    <p className="mt-4 max-w-2xl leading-7 text-[var(--color-muted-foreground)]">{copy.intro}</p>
    <ol className="mt-9 grid gap-4 sm:grid-cols-2">{copy.steps.map(([title, body], index) => <li key={title} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"><span className="text-xs font-bold text-[var(--color-muted-foreground)]">{index + 1}</span><h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{body}</p></li>)}</ol>
  </main></HelpFrame>;
}
