'use client';

import type { HelpLocale } from './content';
import { helpContent } from './content';

const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();

export function matchesGuideText(query: string, ...content: Array<string | undefined>) {
  const term = normalized(query);
  return !term || content.some((part) => part && normalized(part).includes(term));
}

export function GuideSearch({ locale, query, onQueryChange, count }: { locale: HelpLocale; query: string; onQueryChange: (value: string) => void; count: number }) {
  const copy = helpContent[locale].search;
  return <div className="my-6 max-w-2xl">
    <label className="block text-sm font-semibold" htmlFor="guide-search">{copy.label}</label>
    <div className="mt-2 flex flex-wrap gap-2">
      <input id="guide-search" type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={copy.placeholder} className="min-h-11 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" />
      {query && <button type="button" onClick={() => onQueryChange('')} className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">{copy.clear}</button>}
    </div>
    {query.trim() && <p role="status" className="mt-2 text-sm text-[var(--color-muted-foreground)]">{count ? copy.results.replace('{count}', String(count)) : copy.empty}</p>}
  </div>;
}
