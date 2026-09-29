import type { ReactNode } from 'react';

import { SiteFooter } from '@/features/marketing/components/site-footer';
import { SiteHeader } from '@/features/marketing/components/site-header';
import { type Locale } from '@/features/marketing/content';

export function PublicPageFrame({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
    <SiteHeader />
    {children}
    <SiteFooter locale={locale} />
  </div>;
}
