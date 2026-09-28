import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getLocale } from 'next-intl/server';

import { HelpFrame } from '@/features/help/help-frame';
import { helpContent, type HelpLocale } from '@/features/help/content';

export default async function CollaboratorHelpPage() {
  const locale = await getLocale() as HelpLocale;
  const copy = helpContent[locale].collaborator;
  return <HelpFrame locale={locale}><main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
    <Link href="/help" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline"><ArrowLeft size={16} aria-hidden="true" />{copy.back}</Link>
    <p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">{copy.eyebrow}</p>
    <h1 className="mt-3 font-[var(--font-display)] text-3xl font-bold tracking-tight sm:text-5xl">{copy.title}</h1>
    <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--color-muted-foreground)]">{copy.description}</p>
    <ol className="mt-8 space-y-4">{copy.sections.map((section, index) => <li key={section.title} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7"><p className="text-xs font-bold tracking-[.14em] text-[var(--color-muted-foreground)]">{String(index + 1).padStart(2, '0')}</p><h2 className="mt-2 text-lg font-semibold">{section.title}</h2><p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{section.body}</p></li>)}</ol>
  </main></HelpFrame>;
}
