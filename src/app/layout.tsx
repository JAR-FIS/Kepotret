import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

import { ThemeProvider } from '@/providers/theme-provider';
import { LocaleProvider } from '@/providers/locale-provider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Kepotret — Satu momen. Banyak sudut.',
  description: 'Dokumentasi partisipatif untuk berbagai acara.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    title: 'Kepotret — Satu momen. Banyak sudut.',
    description: 'Dokumentasi partisipatif untuk berbagai acara.',
    siteName: 'Kepotret',
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary',
    title: 'Kepotret — Satu momen. Banyak sudut.',
    description: 'Dokumentasi partisipatif untuk berbagai acara.',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LocaleProvider initialLocale={locale as 'id' | 'en'}>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
