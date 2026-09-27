import { ArrowRight, BookOpen, Camera, Images } from 'lucide-react';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';

import { HelpFrame } from '@/features/help/help-frame';
import { helpContent, type HelpLocale } from '@/features/help/content';
import { hostRoutes } from '@/features/host/routes';

export default async function HelpLandingPage() {
  const locale = await getLocale() as HelpLocale;
  const copy = helpContent[locale].landing;
  return <HelpFrame locale={locale}><main>
    <section className="relative overflow-hidden bg-[#0a0a0a] text-white"><div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24"><p className="flex items-center gap-2 text-xs font-bold tracking-[.18em]"><span className="size-2.5 rounded-full bg-[#d8ff3d]" />{copy.eyebrow}</p><h1 className="mt-6 max-w-3xl font-[var(--font-display)] text-4xl font-bold tracking-tight sm:text-6xl">{copy.title}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">{copy.description}</p></div><span aria-hidden="true" className="absolute bottom-5 right-5 size-10 border-b-2 border-r-2 border-[#d8ff3d] sm:bottom-9 sm:right-9" /></section>
    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-9 sm:px-6 sm:py-12 lg:grid-cols-[1.5fr_1fr]">
      <Link href="/help/host" className="group flex min-w-0 flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition-colors hover:border-[var(--color-foreground)] sm:p-8"><span className="inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"><BookOpen size={22} aria-hidden="true" /></span><span className="mt-7 text-xs font-bold tracking-[.16em] text-[var(--color-muted-foreground)]">{copy.guideLabel}</span><h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold">{copy.guideTitle}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.guideDescription}</p><span className="mt-8 inline-flex min-h-11 items-center gap-2 font-semibold underline-offset-4 group-hover:underline">{copy.guideAction}<ArrowRight size={18} aria-hidden="true" /></span></Link>
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-muted)] p-6 sm:p-8"><div className="flex gap-3"><Camera size={22} aria-hidden="true" /><Images size={22} aria-hidden="true" /></div><h2 className="mt-7 font-[var(--font-display)] text-xl font-bold">{copy.quickTitle}</h2><p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.quickDescription}</p><div className="mt-6 flex flex-wrap gap-3"><Link href={hostRoutes.createAlbum} className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)]">{copy.createAction}</Link><Link href={hostRoutes.albums} className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold">{copy.albumsAction}</Link></div></section>
    </div>
  </main></HelpFrame>;
}
