'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

import { getContent, priceOptions, type Locale } from '@/features/marketing/content';

export function PricingSelector({ locale }: { locale: Locale }) {
  const copy = getContent(locale).pricing;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = priceOptions[selectedIndex]!;
  const amount = selected.price === 0
    ? copy.free
    : `${locale === 'id' ? 'Rp' : 'IDR'}${new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-US').format(selected.price)}`;
  const cta = selected.photos === 30
    ? copy.freeCta
    : copy.paidCta.replace('{capacity}', selected.label);

  const selectByKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = Math.min(index + 1, priceOptions.length - 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = Math.max(index - 1, 0);
    else return;
    event.preventDefault();
    setSelectedIndex(nextIndex);
    refs.current[nextIndex]?.focus();
  };

  return <div className="w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)] sm:p-6">
    <p className="mb-3 text-sm font-semibold">{copy.prompt}</p>
    <div role="radiogroup" aria-label={copy.prompt} className="grid grid-cols-4 gap-2 sm:grid-cols-7">
      {priceOptions.map((option, index) => <button
        key={option.photos}
        ref={(element) => { refs.current[index] = element; }}
        id={`photo-capacity-${option.photos}`}
        type="button"
        role="radio"
        aria-checked={selectedIndex === index}
        tabIndex={selectedIndex === index ? 0 : -1}
        onClick={() => setSelectedIndex(index)}
        onKeyDown={(event) => selectByKeyboard(event, index)}
        className={`min-h-11 rounded-full border px-3 text-sm font-semibold focus-visible:outline-offset-2 ${selectedIndex === index ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-foreground)]'}`}
      >{option.label}</button>)}
    </div>
    <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
      <div aria-live="polite" aria-atomic="true">
        <p className="text-sm text-[var(--color-muted-foreground)]">{selected.displayCount} {copy.photoUnit}</p>
        <p className="font-[var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">{amount}</p>
      </div>
      <ul className="space-y-2 text-sm text-[var(--color-muted-foreground)]">
        {copy.proof.map((item) => <li key={item} className="flex items-start gap-2"><span aria-hidden="true" className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)] ring-1 ring-[var(--color-foreground)]" />{item}</li>)}
      </ul>
      <Link href="/masuk" className="inline-flex min-h-12 items-center justify-center rounded-[10px] bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-primary-foreground)] hover:brightness-95 focus-visible:outline-offset-4 sm:col-start-2">{cta}<span className="ml-2" aria-hidden="true">→</span></Link>
    </div>
  </div>;
}
