'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { LocaleControl } from '@/components/ui/locale-control';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAppLocale } from '@/providers/locale-provider';
import { getContent } from '@/features/marketing/content';

export function SiteHeader() {
  const pathname = usePathname();
  const { locale } = useAppLocale();
  const copy = getContent(locale).nav;
  const [menuOpen, setMenuOpen] = useState(false);
  const onHome = pathname === '/';
  const navLinks = [
    { label: copy.how, href: onHome ? '#cara-kerja' : '/cara-kerja' },
    { label: copy.pricing, href: onHome ? '#harga' : '/harga' },
    { label: copy.faq, href: onHome ? '#faq' : '/faq' },
  ];

  return (
    <header className="site-header sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Kepotret" className="shrink-0 rounded-sm">
          <Image src="/brand/logo.svg" alt="Kepotret" width={138} height={44} priority className="h-9 w-[112px] object-contain object-left dark:invert sm:h-10 sm:w-[130px]" />
        </Link>

        <nav aria-label={copy.how} className="hidden items-center gap-7 lg:flex">
          {navLinks.map((item) => <Link key={item.href} href={item.href} className="text-sm font-semibold text-[var(--color-foreground)] hover:underline">{item.label}</Link>)}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/masuk" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold hover:underline">{copy.signIn}</Link>
          <LocaleControl label={copy.language} indonesianLabel={copy.indonesian} englishLabel={copy.english} />
          <ThemeToggle lightLabel={copy.switchToLight} darkLabel={copy.switchToDark} />
          <Link href="/masuk" className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--color-primary)] px-4 text-sm font-bold text-[var(--color-primary-foreground)] hover:brightness-95">{copy.createAlbum}</Link>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <button type="button" aria-label={menuOpen ? copy.closeMenu : copy.openMenu} aria-expanded={menuOpen} aria-controls={menuOpen ? 'mobile-site-menu' : undefined} onClick={() => setMenuOpen((open) => !open)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--color-muted)]">
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && <nav id="mobile-site-menu" aria-label={copy.how} className="border-t border-[var(--color-border)] px-4 py-4 lg:hidden">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-1">
          <Link href="/masuk" onClick={() => setMenuOpen(false)} className="mb-2 inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[var(--color-primary)] px-4 text-sm font-bold text-[var(--color-primary-foreground)]">{copy.createAlbum}</Link>
          {navLinks.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold">{item.label}</Link>)}
          <Link href="/masuk" onClick={() => setMenuOpen(false)} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold">{copy.signIn}</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
            <LocaleControl label={copy.language} indonesianLabel={copy.indonesian} englishLabel={copy.english} />
            <ThemeToggle lightLabel={copy.switchToLight} darkLabel={copy.switchToDark} />
          </div>
        </div>
      </nav>}
    </header>
  );
}
