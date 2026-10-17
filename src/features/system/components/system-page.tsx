import Link from 'next/link';
import { Camera, Home, ShieldAlert, Wrench } from 'lucide-react';
import { getContent, type Locale } from '@/features/marketing/content';
import { AuthPageFrame } from '@/features/auth/components/auth-page-frame';

export function SystemPage({ locale, kind }: { locale: Locale; kind: 'denied' | 'maintenance' | 'compatibility' }) {
  const copy = getContent(locale);
  const item = kind === 'denied'
    ? { title: copy.auth.forbiddenTitle, description: copy.auth.forbiddenDescription }
    : kind === 'maintenance'
      ? { title: copy.system.maintenanceTitle, description: copy.system.maintenanceDescription }
      : { title: copy.system.compatibilityTitle, description: copy.system.compatibilityDescription };
  const Icon = kind === 'denied' ? ShieldAlert : kind === 'maintenance' ? Wrench : Camera;

  return <AuthPageFrame>
    <div className="text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-[var(--color-muted)]"><Icon size={23} aria-hidden="true" /></span>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight sm:text-[2rem]">{item.title}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{item.description}</p>
    </div>
    {kind === 'compatibility' && <>
      <ul className="mt-6 space-y-3 text-left text-sm leading-6">
        {copy.system.compatibilityGuidance.map((guidance) => <li key={guidance} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">{guidance}</li>)}
      </ul>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href={locale === 'id' ? '/bantuan' : '/help'} className="inline-flex min-h-11 items-center rounded-full border border-[var(--color-border)] px-4 text-sm font-bold">{copy.system.compatibilityHelp}</Link>
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-primary-foreground)]"><Home size={16} aria-hidden="true" />{copy.system.home}</Link>
      </div>
    </>}
    {kind !== 'compatibility' && <div className="mt-6 flex justify-center"><Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-primary-foreground)]"><Home size={16} aria-hidden="true" />{copy.system.home}</Link></div>}
  </AuthPageFrame>;
}
