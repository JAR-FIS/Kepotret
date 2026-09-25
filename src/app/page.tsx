import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

import { H01Page } from '@/features/marketing/components/h01-page';
import type { Locale } from '@/features/marketing/content';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/' },
};

export default async function HomePage() {
  const locale = await getLocale();
  return <H01Page locale={locale as Locale} />;
}
