'use client';

import { NextIntlClientProvider } from 'next-intl';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import en from '@/messages/en.json';
import id from '@/messages/id.json';

export type Locale = 'id' | 'en';

export function LocaleProvider({
  children,
  initialLocale = 'id',
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const messages = locale === 'id' ? id : en;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    setLocaleState(nextLocale);
    document.cookie = `kepotret-locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  };

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleContext.Provider value={{ locale, setLocale }}>
        {children}
      </LocaleContext.Provider>
    </NextIntlClientProvider>
  );
}

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
} | null>(null);

export function useAppLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useAppLocale must be used inside LocaleProvider');
  return context;
}
