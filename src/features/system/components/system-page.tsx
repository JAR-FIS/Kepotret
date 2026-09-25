import Link from 'next/link';
import { getContent, type Locale } from '@/features/marketing/content';
import { AuthPageFrame } from '@/features/auth/components/auth-page-frame';

export function SystemPage({ locale, kind }: { locale: Locale; kind: 'denied' | 'maintenance' | 'compatibility' }) {
  const copy = getContent(locale);
  const item = kind === 'denied'
    ? { title: copy.auth.forbiddenTitle, description: copy.auth.forbiddenDescription }
    : kind === 'maintenance'
      ? { title: copy.system.maintenanceTitle, description: copy.system.maintenanceDescription }
      : { title: copy.system.compatibilityTitle, description: copy.system.compatibilityDescription };

  return <AuthPageFrame>
    <h1 className="font-[var(--font-display)] text-3xl font-bold">{item.title}</h1>
    <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{item.description}</p>
    <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-[10px] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)]">{copy.system.home}</Link>
  </AuthPageFrame>;
}
