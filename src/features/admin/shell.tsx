'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Album, BookOpen, Boxes, ChevronDown, ClipboardList, CreditCard, LayoutDashboard, LogOut, Menu, Settings2, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LocaleControl } from '@/components/ui/locale-control';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import type { AdminSessionState } from '@/lib/api/generated/index.schemas';
import { AdminOfflineNote, formatAdminDate, type AdminLocale, useAdminOnline } from './common';

const primaryItems = [
  { href: '/admin', key: 'overview', icon: LayoutDashboard },
  { href: '/admin/users', key: 'users', icon: Users },
  { href: '/admin/albums', key: 'albums', icon: Album },
  { href: '/admin/payments', key: 'payments', icon: CreditCard },
  { href: '/admin/catalog', key: 'catalog', icon: Boxes },
  { href: '/admin/config', key: 'operations', icon: Settings2 },
  { href: '/admin/audit', key: 'audit', icon: ClipboardList },
] as const;

export function AdminShell({ session, locale, onLogout, children }: { session: AdminSessionState; locale: AdminLocale; onLogout: () => void; children: React.ReactNode }) {
  const t = useTranslations('admin.shell');
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const online = useAdminOnline();
  const [operationsOpen, setOperationsOpen] = useState(pathname.startsWith('/admin/config') || pathname.startsWith('/admin/issues') || pathname.startsWith('/admin/admins'));
  const labels = {
    overview: t('overview'), users: t('users'), albums: t('albums'), payments: t('payments'), catalog: t('catalog'), operations: t('operations'), audit: t('audit'), issues: t('issues'), config: t('config'), roster: t('roster'), help: t('help'), signedIn: t('signedIn'), expires: t('expires'), mfa: t('mfa'), logout: t('logout'), menu: t('menu'), close: t('close'), language: t('language'), light: t('light'), dark: t('dark'),
  };

  const navigation = <nav aria-label={t('navLabel')} className="space-y-1">
    {primaryItems.map(({ href, key, icon: Icon }) => {
      const active = key === 'operations' ? pathname.startsWith('/admin/config') || pathname.startsWith('/admin/issues') || pathname.startsWith('/admin/admins') : key === 'overview' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
      if (key === 'operations') return <div key={key}>
        <button type="button" aria-expanded={operationsOpen} onClick={() => setOperationsOpen((open) => !open)} className={`flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-md)] px-3 text-left text-sm font-semibold ${active ? 'bg-[var(--color-muted)]' : 'hover:bg-[var(--color-muted)]'}`}><Icon aria-hidden="true" size={18} />{labels[key]}<ChevronDown size={15} className={`ml-auto transition-transform motion-reduce:transition-none ${operationsOpen ? 'rotate-180' : ''}`} aria-hidden="true" /></button>
        {operationsOpen && <div className="ml-7 mt-1 space-y-1 border-l border-[var(--color-border)] pl-2">{[
          ['/admin/config', labels.config], ['/admin/issues', labels.issues], ['/admin/admins', labels.roster],
        ].map(([path, label]) => <Link key={path} href={path} onClick={() => setMenuOpen(false)} aria-current={pathname === path || pathname.startsWith(`${path}/`) ? 'page' : undefined} className="flex min-h-10 items-center rounded-[var(--radius-md)] px-3 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]">{label}</Link>)}</div>}
      </div>;
      return <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={active ? 'page' : undefined} className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-semibold ${active ? 'bg-[var(--color-muted)]' : 'hover:bg-[var(--color-muted)]'}`}><Icon aria-hidden="true" size={18} />{labels[key]}</Link>;
    })}
  </nav>;

  return <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 lg:flex">
      <Link href="/admin" aria-label="Kepotret" className="mb-8 inline-flex min-h-11 items-center self-start rounded bg-white px-2 py-1"><Image src="/brand/logo.svg" alt="Kepotret" width={112} height={37} priority /></Link>
      {navigation}
      <div className="mt-auto space-y-2 border-t border-[var(--color-border)] pt-4">
        <Link href="/help/admin" className="flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]"><BookOpen size={18} aria-hidden="true" />{labels.help}</Link>
        <p className="px-3 text-xs text-[var(--color-muted-foreground)]">{labels.mfa}</p>
      </div>
    </aside>
    <div className="min-w-0 lg:pl-64">
      <header className="sticky top-0 z-10 flex min-h-16 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 px-3 backdrop-blur sm:px-5 lg:px-8">
        <Button variant="ghost" className="size-11 px-0 lg:hidden" aria-label={menuOpen ? labels.close : labels.menu} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}</Button>
        <div className="flex min-w-0 flex-col leading-tight"><span className="truncate text-sm font-semibold">{labels.signedIn}: {session.display_name ?? session.email}</span><span className="text-xs text-[var(--color-muted-foreground)]">{labels.expires} {formatAdminDate(session.session_expires_at, locale)}</span></div>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link href="/help/admin" className="hidden min-h-11 items-center gap-2 rounded px-2 text-sm font-semibold hover:bg-[var(--color-muted)] md:inline-flex"><BookOpen size={16} aria-hidden="true" />{labels.help}</Link>
          <LocaleControl label={labels.language} indonesianLabel="Bahasa Indonesia" englishLabel="English" indonesianShort="ID" englishShort="EN" />
          <ThemeToggle lightLabel={labels.light} darkLabel={labels.dark} />
          <Button variant="ghost" className="size-11 px-0" aria-label={labels.logout} onClick={onLogout}><LogOut size={18} aria-hidden="true" /></Button>
        </div>
      </header>
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)}>
        <aside className="h-full w-[min(21rem,88vw)] overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between"><Link href="/admin" aria-label="Kepotret" className="inline-flex rounded bg-white px-2 py-1"><Image src="/brand/logo.svg" alt="Kepotret" width={105} height={35} /></Link><Button variant="ghost" className="size-11 px-0" aria-label={labels.close} onClick={() => setMenuOpen(false)}><X size={18} aria-hidden="true" /></Button></div>
          {navigation}
          <Link href="/help/admin" onClick={() => setMenuOpen(false)} className="mt-5 flex min-h-11 items-center gap-3 rounded px-3 text-sm font-semibold hover:bg-[var(--color-muted)]"><BookOpen size={18} aria-hidden="true" />{labels.help}</Link>
        </aside>
      </div>}
      <div className="sticky top-16 z-[5] px-3 pt-2 sm:px-5 lg:px-8"><AdminOfflineNote online={online} locale={locale} /></div>
      {children}
    </div>
  </div>;
}
