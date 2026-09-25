'use client';

import { NextIntlClientProvider } from 'next-intl';
import { createContext, useContext, useState } from 'react';

import en from '@/messages/en.json';
import id from '@/messages/id.json';

export type Locale = 'id' | 'en';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('id');
  const messages = locale === 'id' ? id : en;

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
