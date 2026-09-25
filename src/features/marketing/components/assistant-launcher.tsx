'use client';

import { MessageCircleQuestion, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { getContent, type Locale } from '@/features/marketing/content';

export function Assistant({ locale }: { locale: Locale }) {
  const copy = getContent(locale).footer;
  const [open, setOpen] = useState(false);

  return <div className="fixed bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
    {open && <div id="assistant-panel" className="mb-3 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-semibold">{locale === 'id' ? 'Butuh bantuan?' : 'Need a hand?'}</p><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{locale === 'id' ? 'Temukan jawaban di Pusat Bantuan.' : 'Find answers in the Help Center.'}</p></div>
        <button type="button" aria-label={locale === 'id' ? 'Tutup bantuan' : 'Close help'} onClick={() => setOpen(false)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--color-muted)]"><X size={18} aria-hidden="true" /></button>
      </div>
      <Link href="/bantuan" className="mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">{copy.helpCenter}</Link>
    </div>}
    <button type="button" aria-expanded={open} aria-controls={open ? 'assistant-panel' : undefined} aria-label={open ? (locale === 'id' ? 'Tutup bantuan' : 'Close help') : (locale === 'id' ? 'Butuh bantuan?' : 'Need help?')} onClick={() => setOpen((value) => !value)} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] shadow-[var(--shadow-soft)] hover:brightness-95">
      <MessageCircleQuestion size={19} aria-hidden="true" /><span>{locale === 'id' ? 'Butuh bantuan?' : 'Need help?'}</span>
    </button>
  </div>;
}
