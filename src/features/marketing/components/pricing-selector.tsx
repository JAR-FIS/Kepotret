'use client';

import { useState } from 'react';
import Link from 'next/link';

import { getContent, priceOptions, type Locale } from '@/features/marketing/content';

export function PricingSelector({ locale }: { locale: Locale }) {
  const copy = getContent(locale).pricing;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = priceOptions[selectedIndex]!;
  const amount = selected.price === 0
    ? copy.free
    : `${locale === 'id' ? 'Rp' : 'IDR'}${new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-US').format(selected.price)}`;
  const cta = selected.photos === 30
    ? copy.freeCta
    : copy.paidCta.replace('{capacity}', selected.label);

  return <div className="w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] sm:p-7">
    <div className="mb-4 flex items-center justify-between gap-3">
      <label htmlFor="h01-photo-capacity" className="text-sm font-semibold">{copy.prompt}</label>
      <span className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-bold text-[var(--color-primary-foreground)]">{selected.label}</span>
    </div>
    <input
      id="h01-photo-capacity"
      type="range"
      min={0}
      max={priceOptions.length - 1}
      step={1}
      value={selectedIndex}
      aria-valuetext={`${selected.displayCount} ${copy.photoUnit}, ${amount}`}
      onChange={(event) => setSelectedIndex(Number(event.target.value))}
      className="h01-range w-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus)]"
    />
    <ol aria-hidden="true" className="mt-2 flex justify-between gap-1 text-[11px] font-semibold text-[var(--color-muted-foreground)] sm:text-xs">
      {priceOptions.map((option) => <li key={option.photos} className="text-center">{option.label}</li>)}
    </ol>
    <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
      <div aria-live="polite" aria-atomic="true" className="sm:row-span-2">
        <p className="text-sm text-[var(--color-muted-foreground)]">{selected.displayCount} {copy.photoUnit}</p>
        <p className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">{amount}</p>
      </div>
      <ul className="space-y-2 text-sm text-[var(--color-muted-foreground)]">
        {copy.proof.map((item) => <li key={item} className="flex items-start gap-2"><span aria-hidden="true" className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)] ring-1 ring-[var(--color-foreground)]" />{item}</li>)}
      </ul>
      <Link href="/masuk" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-primary-foreground)] hover:brightness-95 focus-visible:outline-offset-4 sm:col-start-2">{cta}<span className="ml-2" aria-hidden="true">→</span></Link>
    </div>
  </div>;
}
