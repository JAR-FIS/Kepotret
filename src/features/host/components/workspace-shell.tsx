'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Album, ArrowLeft, BookOpen, ChevronUp, Home, Images, MoreHorizontal, Plus, Settings2, UserRound } from 'lucide-react';

import { LocaleControl } from '@/components/ui/locale-control';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { hostRoutes, setupSteps } from '@/features/host/routes';

export function HostShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('host');
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<'manage' | 'more' | null>(null);
  const inAlbum = pathname.startsWith('/album/') && pathname !== '/album/baru';
  const albumId = inAlbum ? pathname.split('/')[2] : undefined;
  const links = [
    { href: hostRoutes.dashboard, label: t('nav.home'), icon: Home },
    { href: hostRoutes.albums, label: t('nav.albums'), icon: Album },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-6 lg:flex">
        <Link href={hostRoutes.dashboard} aria-label="Kepotret" className="mb-10 inline-flex"><span className="rounded bg-white px-2 py-1"><Image src="/brand/logo.svg" alt="" width={116} height={39} priority /></span></Link>
        <nav aria-label={t('nav.label')} className="space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === hostRoutes.albums ? pathname.startsWith('/album') : pathname === href;
            return <Link key={href} aria-current={active ? 'page' : undefined} href={href} className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-medium ${active ? 'bg-[var(--color-muted)]' : 'hover:bg-[var(--color-muted)]'}`}><Icon aria-hidden="true" size={18} />{label}</Link>;
          })}
        </nav>
        <Link href="/help/host" className="mt-auto inline-flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]"><BookOpen aria-hidden="true" size={18} />{t('nav.help')}</Link>
        <Link href={hostRoutes.createAlbum} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)]"><Plus aria-hidden="true" size={18} />{t('create')}</Link>
      </aside>
      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 px-4 backdrop-blur sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
        {inAlbum && <Link aria-label={t('nav.albums')} href={hostRoutes.albums} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-[var(--color-muted)] lg:hidden"><ArrowLeft aria-hidden="true" size={19} /></Link>}
            {!inAlbum && <Link href={hostRoutes.dashboard} aria-label="Kepotret" className="inline-flex lg:hidden"><span className="rounded bg-white px-1.5 py-1"><Image src="/brand/logo.svg" alt="" width={91} height={30} priority /></span></Link>}
            {inAlbum && <span className="hidden text-sm text-[var(--color-muted-foreground)] lg:block">{t('albumWorkspace')}</span>}
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link href="/help/host" aria-label={t('nav.help')} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-[var(--color-muted)] lg:hidden"><BookOpen aria-hidden="true" size={18} /></Link>
            <LocaleControl label={t('nav.language')} indonesianLabel={t('nav.indonesian')} englishLabel={t('nav.english')} indonesianShort={t('nav.indonesianShort')} englishShort={t('nav.englishShort')} />
            <ThemeToggle lightLabel={t('nav.switchToLight')} darkLabel={t('nav.switchToDark')} />
            <Link href="/akun" aria-label={t('nav.account')} className="hidden size-11 items-center justify-center rounded-full border border-[var(--color-border)] hover:bg-[var(--color-muted)] sm:inline-flex"><UserRound aria-hidden="true" size={18} /></Link>
          </div>
        </header>
        {inAlbum && albumId && <WorkspaceNavigation
          albumId={albumId}
          pathname={pathname}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          label={t('nav.albumLabel')}
          t={(key) => t(key)}
        />}
        {!inAlbum && <nav aria-label={t('nav.label')} className="fixed inset-x-0 bottom-0 z-20 grid min-h-16 grid-cols-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 pb-[env(safe-area-inset-bottom)] lg:hidden">
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

function WorkspaceNavigation({
  albumId,
  pathname,
  openMenu,
  setOpenMenu,
  label,
  t,
}: {
  albumId: string;
  pathname: string;
  openMenu: 'manage' | 'more' | null;
  setOpenMenu: (menu: 'manage' | 'more' | null) => void;
  label: string;
  t: (key: string) => string;
}) {
  const manageItems = [
    { href: hostRoutes.gallery(albumId), label: t('navItems.gallerySettings') },
    { href: hostRoutes.reschedule(albumId), label: t('navItems.reschedule') },
    { href: hostRoutes.lifecycle(albumId), label: t('navItems.lifecycle') },
    { href: hostRoutes.recovery(albumId), label: t('navItems.recovery') },
    { href: hostRoutes.recoveryMedia(albumId), label: t('navItems.recoveryMedia') },
  ];
  const moreItems = [
    { href: '/help/host', label: t('nav.help') },
    { href: hostRoutes.sharing(albumId), label: t('navItems.sharing') },
    { href: hostRoutes.payments(albumId), label: t('navItems.payments') },
    { href: hostRoutes.upgrade(albumId), label: t('navItems.upgrade') },
    { href: hostRoutes.exports(albumId), label: t('navItems.exports') },
    ...setupSteps.map((step) => ({ href: hostRoutes.setup(albumId, step), label: t(`steps.${step}`) })),
  ];
  const manageActive = pathname.includes('/galeri') || pathname.includes('/jadwal-ulang') || pathname.includes('/retensi') || pathname.includes('/pemulihan');
  const moreActive = pathname.includes('/berbagi') || pathname.includes('/pembayaran') || pathname.includes('/checkout') || pathname.includes('/upgrade') || pathname.includes('/ekspor') || pathname.includes('/setup/');
  const itemClass = 'flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-sm hover:bg-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]';
  const toggle = (menu: 'manage' | 'more') => setOpenMenu(openMenu === menu ? null : menu);
  const group = (menu: 'manage' | 'more', items: typeof manageItems) => openMenu === menu ? <div role="menu" className="absolute inset-x-3 bottom-[calc(100%+0.75rem)] max-h-[min(65dvh,28rem)] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl sm:inset-x-auto sm:right-3 sm:w-80">{items.map((item) => <Link key={item.href} role="menuitem" href={item.href} onClick={() => setOpenMenu(null)} className={itemClass}>{item.label}</Link>)}</div> : null;
  return <>
    <nav aria-label={label} onKeyDown={(event) => { if (event.key === 'Escape') setOpenMenu(null); }} className="fixed inset-x-0 bottom-0 z-20 grid min-h-16 grid-cols-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <Link href={hostRoutes.album(albumId)} aria-current={pathname === hostRoutes.album(albumId) ? 'page' : undefined} className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium"><Home size={18} aria-hidden="true" /><span>{t('navItems.overview')}</span></Link>
      <Link href={hostRoutes.gallery(albumId)} aria-current={pathname.startsWith(hostRoutes.gallery(albumId)) ? 'page' : undefined} className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium"><Images size={18} aria-hidden="true" /><span>{t('navItems.gallery')}</span></Link>
      <button type="button" aria-haspopup="menu" aria-expanded={openMenu === 'manage'} onClick={() => toggle('manage')} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium ${manageActive ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}><Settings2 size={18} aria-hidden="true" /><span>{t('navItems.manage')}</span></button>
      <button type="button" aria-haspopup="menu" aria-expanded={openMenu === 'more'} onClick={() => toggle('more')} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium ${moreActive ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}><MoreHorizontal size={18} aria-hidden="true" /><span>{t('navItems.more')}</span></button>
      {group('manage', manageItems)}{group('more', moreItems)}
    </nav>
    <nav aria-label={label} onKeyDown={(event) => { if (event.key === 'Escape') setOpenMenu(null); }} className="hidden border-b border-[var(--color-border)] px-6 lg:block"><div className="relative mx-auto flex max-w-7xl items-center gap-2 py-1">
      <Link href={hostRoutes.album(albumId)} aria-current={pathname === hostRoutes.album(albumId) ? 'page' : undefined} className={itemClass}>{t('navItems.overview')}</Link>
      <Link href={hostRoutes.gallery(albumId)} aria-current={pathname.startsWith(hostRoutes.gallery(albumId)) ? 'page' : undefined} className={itemClass}>{t('navItems.gallery')}</Link>
      <button type="button" aria-haspopup="menu" aria-expanded={openMenu === 'manage'} onClick={() => toggle('manage')} className={itemClass}>{t('navItems.manage')}<ChevronUp aria-hidden="true" size={14} className="ml-2" /></button>
      <button type="button" aria-haspopup="menu" aria-expanded={openMenu === 'more'} onClick={() => toggle('more')} className={itemClass}>{t('navItems.more')}<ChevronUp aria-hidden="true" size={14} className="ml-2" /></button>
      {group('manage', manageItems)}{group('more', moreItems)}
    </div></nav>
  </>;
}

export function HostPageTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  const t = useTranslations('host');
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">{t('workspaceLabel')}</p><h1 className="font-[var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">{description}</p>}</div>{action}</div>;
}
