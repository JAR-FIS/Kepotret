import Link from 'next/link';

import type { Locale } from '@/features/marketing/content';
import { legalDrafts } from '@/features/marketing/legal-draft-content';

export function LegalDraftPage({ locale, kind, title }: { locale: Locale; kind: 'privacy' | 'terms'; title: string }) {
  const draft = legalDrafts[locale][kind];
  return <article className="mx-auto max-w-5xl">
    <header className="max-w-3xl"><p className="text-xs font-bold tracking-[0.12em] text-[var(--color-muted-foreground)]">{locale === 'id' ? 'LEGAL · DRAF' : 'LEGAL · DRAFT'}</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h1><p className="mt-4 text-sm text-[var(--color-muted-foreground)]">{draft.version}</p></header>
    <div role="status" className="mt-7 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5"><p className="font-bold">{draft.notice}</p><p className="mt-2 text-sm leading-7">{draft.intro}</p></div>
    <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label={draft.toc} className="self-start rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:sticky lg:top-24"><h2 className="font-[family-name:var(--font-display)] text-lg font-bold">{draft.toc}</h2><ol className="mt-3 space-y-1 text-sm">{draft.sections.map((section, index) => <li key={section.title}><a href={'#bagian-' + (index + 1)} className="inline-flex min-h-10 items-center rounded-lg px-2 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]">{index + 1}. {section.title}</a></li>)}</ol></nav>
      <div className="min-w-0 space-y-8">{draft.sections.map((section, index) => <section id={'bagian-' + (index + 1)} key={section.title} aria-labelledby={'bagian-' + (index + 1) + '-title'} className="scroll-mt-24 border-b border-[var(--color-border)] pb-7 last:border-0"><h2 id={'bagian-' + (index + 1) + '-title'} className="font-[family-name:var(--font-display)] text-xl font-bold leading-snug sm:text-2xl">{index + 1}. {section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 sm:text-base sm:leading-8">{paragraph}</p>)}</section>)}
        <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-[family-name:var(--font-display)] text-lg font-bold">{draft.related}</h2><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold"><Link className="min-h-11 content-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]" href={kind === 'privacy' ? '/syarat-ketentuan' : '/kebijakan-privasi'}>{draft.counterpart}</Link><Link className="min-h-11 content-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]" href="/bantuan">{draft.help}</Link><Link className="min-h-11 content-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]" href="/keamanan">{draft.security}</Link></div></aside>
      </div>
    </div>
  </article>;
}
