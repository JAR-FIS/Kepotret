import type { Metadata } from 'next';

import { ThemeProvider } from '@/providers/theme-provider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Kepotret',
  description: 'Kepotret V1 frontend foundation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
