import Link from 'next/link';

import { Disclosure } from '@/components/ui/disclosure';
import { PublicPageFrame } from '@/features/marketing/components/public-page-frame';
import { PricingSelector } from '@/features/marketing/components/pricing-selector';
import { getContent, type Locale } from '@/features/marketing/content';

type PublicPageKind = 'how' | 'pricing' | 'faq' | 'help' | 'privacy' | 'terms' | 'security';

export function PublicInfoPage({ locale, kind }: { locale: Locale; kind: PublicPageKind }) {
  const copy = getContent(locale);
  const page = copy.publicPages;
  let content;

  if (kind === 'how') {
    content = <>
      <PageHeading eyebrow={copy.how.eyebrow} title={page.howTitle} description={copy.how.description} />
      <ol className="mt-10 grid gap-5 md:grid-cols-3">{copy.how.steps.map((step, index) => <li key={step.title} className="border-t border-[var(--color-border)] pt-5"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] font-bold">0{index + 1}</span><h2 className="mt-4 font-[var(--font-display)] text-xl font-bold">{step.title}</h2><p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{step.description}</p></li>)}</ol>
      <p className="mt-8 text-sm"><Link href="/masuk" className="font-semibold underline underline-offset-4">{copy.nav.createAlbum}</Link></p>
    </>;
  } else if (kind === 'pricing') {
    content = <><PageHeading eyebrow={copy.pricing.eyebrow} title={page.priceTitle} description={copy.pricing.description} /><div className="mt-8"><PricingSelector locale={locale} /></div></>;
  } else if (kind === 'faq') {
    content = <><PageHeading eyebrow={copy.faq.eyebrow} title={page.faqTitle} description={copy.faq.description} /><div className="mt-8">{copy.faq.items.map((item, index) => <Disclosure key={item.question} id={`public-faq-answer-${index + 1}`} title={item.question}>{item.answer}</Disclosure>)}</div></>;
  } else if (kind === 'help') {
    content = <><PageHeading eyebrow={copy.footer.help} title={page.helpTitle} description={page.helpDescription} /><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-[var(--color-border)] p-5"><h2 className="font-[var(--font-display)] text-xl font-bold">{page.contactTitle}</h2><p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{page.unavailable}</p></div><div className="rounded-2xl border border-[var(--color-border)] p-5"><h2 className="font-[var(--font-display)] text-xl font-bold">{copy.footer.security}</h2><Link href="/keamanan" className="mt-2 inline-block text-sm font-semibold underline underline-offset-4">{copy.trust.cta}</Link></div></div></>;
  } else if (kind === 'privacy' || kind === 'terms') {
    const title = kind === 'privacy' ? page.privacyTitle : page.termsTitle;
    content = <><PageHeading eyebrow={copy.footer.legal} title={title} /><div className="mt-8 max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5"><p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{page.legalUnavailable}</p></div></>;
  } else {
    content = <><PageHeading eyebrow={copy.trust.eyebrow} title={page.securityTitle} description={page.securityDescription} /><ul className="mt-8 grid gap-4 md:grid-cols-3">{copy.trust.items.map((item) => <li key={item.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-[var(--font-display)] font-bold">{item.title}</h2><p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{item.description}</p></li>)}</ul></>;
  }

  return <PublicPageFrame locale={locale}>
    <main className="mx-auto min-h-[60vh] max-w-[1240px] px-4 py-14 sm:px-6 sm:py-20">
      {content}
    </main>
  </PublicPageFrame>;
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <header className="max-w-3xl"><p className="mb-3 text-xs font-bold tracking-[0.12em] text-[var(--color-muted-foreground)]">{eyebrow}</p><h1 className="font-[var(--font-display)] text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h1>{description && <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-muted-foreground)]">{description}</p>}</header>;
}
