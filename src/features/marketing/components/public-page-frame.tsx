import type { ReactNode } from 'react';

import { Assistant } from '@/features/marketing/components/assistant-launcher';
import { SiteFooter } from '@/features/marketing/components/site-footer';
import { SiteHeader } from '@/features/marketing/components/site-header';
import { type Locale } from '@/features/marketing/content';

export function PublicPageFrame({
  locale,
  children,
  assistant = false,
}: {
  locale: Locale;
  children: ReactNode;
  assistant?: boolean;
}) {
  return <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
    <SiteHeader />
    {children}
    <SiteFooter locale={locale} />
    {assistant && <Assistant locale={locale} />}
  </div>;
}
