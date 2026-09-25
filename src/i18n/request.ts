import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

import en from '@/messages/en.json';
import id from '@/messages/id.json';

export default getRequestConfig(async () => {
  const requestedLocale = (await cookies()).get('kepotret-locale')?.value;
  const locale = requestedLocale === 'en' ? 'en' : 'id';

  return {
    locale,
    messages: locale === 'en' ? en : id,
  };
});
