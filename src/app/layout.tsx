import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import { getLocale } from 'next-intl/server';

import { ThemeProvider } from '@/providers/theme-provider';
import { LocaleProvider } from '@/providers/locale-provider';
import { Assistant } from '@/features/assistant/components/assistant';
import '@/styles/globals.css';

const displayFont = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap' });
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta-sans', display: 'swap' });

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
    <html lang={locale} className={`${displayFont.variable} ${bodyFont.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LocaleProvider initialLocale={locale as 'id' | 'en'}>{children}<Assistant /></LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
