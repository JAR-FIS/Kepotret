import Link from 'next/link';
import { ArrowRight, Clock3, Eye, Mail, MessageCircle, ShieldCheck } from 'lucide-react';

import { ExclusiveFaqAccordion } from '@/features/marketing/components/exclusive-faq-accordion';
import { PublicPageFrame } from '@/features/marketing/components/public-page-frame';
import { PricingSelector } from '@/features/marketing/components/pricing-selector';
import { getContent, type Locale } from '@/features/marketing/content';
import { HowGuideVisual } from '@/features/marketing/components/how-guide-visual';
import { LegalDraftPage } from '@/features/marketing/components/legal-draft-page';

type PublicPageKind = 'how' | 'pricing' | 'faq' | 'help' | 'privacy' | 'terms' | 'security';


export function PublicInfoPage({ locale, kind }: { locale: Locale; kind: PublicPageKind }) {
  const copy = getContent(locale);
  const page = copy.publicPages;
  let content;

  if (kind === 'how') {
    content = <>
      <PageHeading centered eyebrow={copy.how.eyebrow} title={page.howTitle} description={page.howDescription} />
      <section className="mx-auto mt-14 max-w-6xl" aria-labelledby="host-guide-title">
        <div className="mx-auto mb-7 max-w-4xl text-center"><h2 id="host-guide-title" className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">{page.hostGuideTitle}</h2></div>
        <ol className="grid gap-5 md:grid-cols-3">
          {page.hostSteps.map((step, index) => <li key={step.title} className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <HowGuideVisual audience="host" index={index} description={step.description} />
            <div className="p-5"><span className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold">0{index + 1}</span><h3 className="mt-4 font-[family-name:var(--font-display)] text-lg font-bold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{step.description}</p></div>
          </li>)}
        </ol>
        <div className="mt-6 flex justify-center"><Link href="/masuk" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-primary-foreground)]">{copy.nav.createAlbum}<ArrowRight size={16} aria-hidden="true" /></Link></div>
      </section>
      <section className="mx-auto mt-16 max-w-6xl" aria-labelledby="guest-guide-title">
        <header className="mx-auto mb-7 max-w-4xl text-center"><h2 id="guest-guide-title" className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">{page.guestGuideTitle}</h2><p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.guest.description}</p></header>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {copy.guest.steps.map((step, index) => <li key={step.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-4"><HowGuideVisual audience="guest" index={index} description={step.description} /></div>
            <span className="text-xs font-bold tracking-widest text-[var(--color-muted-foreground)]">0{index + 1}</span><h3 className="mt-2 font-[family-name:var(--font-display)] font-bold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{step.description}</p>
          </li>)}
        </ol>
      </section>
      <section className="mx-auto mt-16 max-w-4xl" aria-labelledby="how-faq-title"><h2 id="how-faq-title" className="mb-5 text-center font-[family-name:var(--font-display)] text-2xl font-bold">{page.howFaqTitle}</h2><ExclusiveFaqAccordion items={page.howFaq} /></section>
    </>;
  } else if (kind === 'pricing') {
    content = <><PageHeading centered eyebrow={copy.pricing.eyebrow} title={page.priceTitle} description={copy.pricing.description} /><div className="mx-auto mt-8 w-full max-w-3xl"><PricingSelector locale={locale} /></div></>;
  } else if (kind === 'faq') {
    content = <><PageHeading centered eyebrow={copy.faq.eyebrow} title={page.faqTitle} description={copy.faq.description} /><div className="mx-auto mt-8 max-w-4xl"><ExclusiveFaqAccordion items={copy.faq.items} /></div></>;
  } else if (kind === 'help') {
    content = <><PageHeading centered eyebrow={copy.footer.help} title={page.helpTitle} description={page.helpDescription} /><div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"><h2 className="font-[family-name:var(--font-display)] text-xl font-bold">{page.contactTitle}</h2><ul className="mt-5 space-y-4 text-sm">
        <ContactLink icon={<Mail size={18} aria-hidden="true" />} label={page.contactEmail} href="mailto:kepotret123@gmail.com" value="kepotret123@gmail.com" />
        <ContactLink icon={<MessageCircle size={18} aria-hidden="true" />} label={page.contactTiktok} href="https://www.tiktok.com/@kepotret.official" value="kepotret.official" />
        <ContactLink icon={<MessageCircle size={18} aria-hidden="true" />} label={page.contactInstagram} href="https://www.instagram.com/kepotret.official/" value="kepotret.official" />
        <ContactLink icon={<MessageCircle size={18} aria-hidden="true" />} label={page.contactWhatsapp} href="https://wa.me/6281377888111" value="+62 8138 7788 811" />
      </ul><p className="mt-6 border-t border-[var(--color-border)] pt-4 text-sm leading-6 text-[var(--color-muted-foreground)]">{page.assistantContact}</p></section>
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"><h2 className="font-[family-name:var(--font-display)] text-xl font-bold">{copy.footer.security}</h2><p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.trust.description}</p><Link href="/keamanan" className="mt-5 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">{copy.trust.cta}</Link></section>
    </div></>;
  } else if (kind === 'privacy' || kind === 'terms') {
    const title = kind === 'privacy' ? page.privacyTitle : page.termsTitle;
    content = <LegalDraftPage locale={locale} kind={kind} title={title} />;
  } else {
    const icons = [ShieldCheck, Eye, Clock3];
    content = <><PageHeading centered eyebrow={copy.trust.eyebrow} title={page.securityTitle} description={page.securityDescription} /><ul className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">{copy.trust.items.map((item, index) => { const Icon = icons[index]; return <li key={item.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center"><span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-[var(--color-primary)]"><Icon size={22} aria-hidden="true" /></span><h2 className="mt-4 font-[family-name:var(--font-display)] font-bold">{item.title}</h2><p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{item.description}</p></li>; })}</ul></>;
  }

  return <PublicPageFrame locale={locale}><main className="public-page-enter mx-auto min-h-[60vh] max-w-[1240px] px-4 py-14 sm:px-6 sm:py-20">{content}</main></PublicPageFrame>;
}

function ContactLink({ icon, label, href, value }: { icon: React.ReactNode; label: string; href: string; value: string }) {
  return <li className="flex min-w-0 items-start gap-3"><span className="mt-0.5 text-[var(--color-muted-foreground)]">{icon}</span><span className="min-w-0"><span className="block text-xs text-[var(--color-muted-foreground)]">{label}</span><a href={href} className="break-all font-semibold underline underline-offset-4">{value}</a></span></li>;
}

function PageHeading({ centered = false, eyebrow, title, description }: { centered?: boolean; eyebrow: string; title: string; description?: string }) {
  return <header className={`mx-auto max-w-4xl ${centered ? 'text-center' : ''}`}><p className="mb-3 text-xs font-bold tracking-[0.12em] text-[var(--color-muted-foreground)]">{eyebrow}</p><h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h1>{description && <p className="mx-auto mt-4 max-w-4xl text-base leading-7 text-[var(--color-muted-foreground)]">{description}</p>}</header>;
}
