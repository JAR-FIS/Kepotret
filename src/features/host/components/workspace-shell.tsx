'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Album, ArrowLeft, Home, Plus, UserRound } from 'lucide-react';

import { LocaleControl } from '@/components/ui/locale-control';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { hostRoutes, setupSteps } from '@/features/host/routes';

export function HostShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('host');
  const pathname = usePathname();
  const inAlbum = pathname.startsWith('/album/') && pathname !== '/album/baru';
  const albumId = inAlbum ? pathname.split('/')[2] : undefined;
  const links = [
    { href: hostRoutes.dashboard, label: t('nav.home'), icon: Home },
    { href: hostRoutes.albums, label: t('nav.albums'), icon: Album },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-6 lg:flex">
        <Link href={hostRoutes.dashboard} className="mb-10 font-[var(--font-display)] text-2xl font-black tracking-tight">Kepotret</Link>
        <nav aria-label={t('nav.label')} className="space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === hostRoutes.albums ? pathname.startsWith('/album') : pathname === href;
            return <Link key={href} aria-current={active ? 'page' : undefined} href={href} className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-medium ${active ? 'bg-[var(--color-muted)]' : 'hover:bg-[var(--color-muted)]'}`}><Icon aria-hidden="true" size={18} />{label}</Link>;
          })}
        </nav>
        <Link href={hostRoutes.createAlbum} className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)]"><Plus aria-hidden="true" size={18} />{t('create')}</Link>
      </aside>
      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 px-4 backdrop-blur sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
        {inAlbum && <Link aria-label={t('nav.albums')} href={hostRoutes.albums} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-[var(--color-muted)] lg:hidden"><ArrowLeft aria-hidden="true" size={19} /></Link>}
            {!inAlbum && <Link href={hostRoutes.dashboard} className="font-[var(--font-display)] text-lg font-black lg:hidden">Kepotret</Link>}
            {inAlbum && <span className="hidden text-sm text-[var(--color-muted-foreground)] lg:block">{t('albumWorkspace')}</span>}
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <LocaleControl label={t('nav.language')} indonesianLabel={t('nav.indonesian')} englishLabel={t('nav.english')} indonesianShort={t('nav.indonesianShort')} englishShort={t('nav.englishShort')} />
            <ThemeToggle lightLabel={t('nav.switchToLight')} darkLabel={t('nav.switchToDark')} />
            <Link href="/akun" aria-label={t('nav.account')} className="hidden size-11 items-center justify-center rounded-full border border-[var(--color-border)] hover:bg-[var(--color-muted)] sm:inline-flex"><UserRound aria-hidden="true" size={18} /></Link>
          </div>
        </header>
        {inAlbum && albumId && <nav aria-label={t('nav.albumLabel')} className="hidden border-b border-[var(--color-border)] px-10 lg:block"><div className="mx-auto flex max-w-7xl gap-1">{setupSteps.slice(0, 4).map((step) => <Link key={step} href={hostRoutes.setup(albumId, step)} aria-current={pathname.endsWith(`/setup/${step}`) ? 'page' : undefined} className="inline-flex min-h-12 items-center px-4 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">{t(`steps.${step}`)}</Link>)}</div></nav>}
        {inAlbum && albumId ? <nav aria-label={t('nav.albumLabel')} className="fixed inset-x-0 bottom-0 z-20 grid min-h-16 grid-cols-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">{setupSteps.slice(0, 4).map((step) => <Link key={step} href={hostRoutes.setup(albumId, step)} aria-current={pathname.endsWith(`/setup/${step}`) ? 'page' : undefined} className="flex min-h-14 items-center justify-center px-1 text-center text-xs font-medium text-[var(--color-muted-foreground)]">{t(`steps.${step}`)}</Link>)}</nav> : <nav aria-label={t('nav.label')} className="fixed inset-x-0 bottom-0 z-20 grid min-h-16 grid-cols-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 pb-[env(safe-area-inset-bottom)] lg:hidden">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === hostRoutes.albums ? pathname.startsWith('/album') : pathname === href;
            return <Link key={href} aria-current={active ? 'page' : undefined} href={href} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium ${active ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}><Icon aria-hidden="true" size={19} />{label}</Link>;
          })}
        </nav>}
        <main className="mx-auto min-w-0 max-w-7xl px-4 pb-24 pt-7 sm:px-6 lg:px-10 lg:pb-12">{children}</main>
      </div>
    </div>
  );
}

export function HostPageTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  const t = useTranslations('host');
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">{t('workspaceLabel')}</p><h1 className="font-[var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">{description}</p>}</div>{action}</div>;
}
