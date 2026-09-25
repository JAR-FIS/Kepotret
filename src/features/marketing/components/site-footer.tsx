import Image from 'next/image';
import Link from 'next/link';

import { getContent, type Locale } from '@/features/marketing/content';

export function SiteFooter({ locale }: { locale: Locale }) {
  const copy = getContent(locale);
  const footer = copy.footer;
  const products = [
    [copy.nav.how, '/cara-kerja'],
    [copy.nav.pricing, '/harga'],
    [copy.nav.faq, '/faq'],
    [copy.nav.createAlbum, '/masuk'],
    [copy.nav.signIn, '/masuk'],
  ] as const;

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_repeat(4,1fr)]">
        <div className="max-w-xs">
          <Link href="/" aria-label="Kepotret" className="inline-flex rounded-sm">
            <Image src="/brand/logo.svg" alt="Kepotret" width={132} height={42} className="h-9 w-[120px] object-contain object-left dark:invert" />
          </Link>
          <p className="mt-3 font-[var(--font-display)] font-semibold">{footer.brandLine}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">{footer.descriptor}</p>
        </div>
        <FooterGroup title={footer.product} links={products} />
        <FooterGroup title={footer.help} links={[[footer.helpCenter, '/bantuan'], [footer.security, '/keamanan']]} unavailable={[[footer.contact, footer.unavailable]]} />
        <FooterGroup title={footer.legal} links={[[footer.privacy, '/kebijakan-privasi'], [footer.terms, '/syarat-ketentuan']]} />
        <div>
          <h2 className="text-sm font-bold">{footer.social}</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted-foreground)]">
            {footer.socialLabels.map((label) => <li key={label}><span aria-disabled="true" title={footer.unavailable}>{label} <span className="text-xs">({footer.unavailable})</span></span></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--color-border)]">
        <p className="mx-auto max-w-[1240px] px-4 py-4 text-xs text-[var(--color-muted-foreground)] sm:px-6">{footer.copyright}</p>
      </div>
    </footer>
  );
}

function FooterGroup({
  title,
  links,
  unavailable = [],
}: {
  title: string;
  links: ReadonlyArray<readonly [string, string]>;
  unavailable?: ReadonlyArray<readonly [string, string]>;
}) {
  return <div>
    <h2 className="text-sm font-bold">{title}</h2>
    <ul className="mt-3 space-y-2 text-sm">
      {links.map(([label, href]) => <li key={`${label}:${href}`}><Link href={href} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:underline">{label}</Link></li>)}
      {unavailable.map(([label, status]) => <li key={label}><span aria-disabled="true" title={status} className="text-[var(--color-muted-foreground)]">{label} <span className="text-xs">({status})</span></span></li>)}
    </ul>
  </div>;
}
