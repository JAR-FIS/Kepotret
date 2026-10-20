'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BookOpen, Camera, Download, Grid2X2, Heart, Images, Link2, List, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, RefreshCw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LocaleControl } from '@/components/ui/locale-control';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useConnectivity } from '@/hooks/use-connectivity';
import {
  getApiV1AlbumsAlbumIdCaptureReadiness,
  getApiV1GuestMe,
  getApiV1GuestGalleryPhotos,
  getApiV1GuestGalleryPhotosPhotoId,
  getApiV1GuestGalleryPhotosPhotoIdDownload,
  getApiV1SecurityCsrf,
  postApiV1GuestGalleryPhotosPhotoIdShareLink,
  putApiV1GuestGalleryPhotosPhotoIdLike,
} from '@/lib/api/browser';
import type { CaptureReadiness, GuestGalleryPhoto, GetApiV1GuestGalleryPhotosSort, GuestContext } from '@/lib/api/generated/index.schemas';
import { guestRoutes } from '@/features/guest/routes';
import { DeliveryImage } from '@/features/gallery/components/delivery-image';
import { GuestTerminal } from './guest-terminal';

type State = 'loading' | 'ready' | 'hidden' | 'ended' | 'post-event-ended' | 'error';
type DetailState = 'loading' | 'ready' | 'unavailable' | 'error';
type ViewMode = 'grid' | 'list';
const PAGE_SIZE = 24;
const MAX_LOADED_PHOTOS = 240;

function trapTab(event: KeyboardEvent, container: HTMLElement) {
  if (event.key !== 'Tab') return;
  const items = Array.from(container.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'));
  if (items.length === 0) { event.preventDefault(); container.focus(); return; }
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) {
    event.preventDefault(); first.focus();
  }
}

export function GuestGallery({ linkId, photoId }: { linkId: string; photoId?: string }) {
  const t = useTranslations('guest.gallery');
  const preferences = useTranslations('guest.preferences');
  const locale = useLocale();
  const router = useRouter();
  const isOnline = useConnectivity();
  const [state, setState] = useState<State>('loading');
  const [context, setContext] = useState<GuestContext | null>(null);
  const [photos, setPhotos] = useState<GuestGalleryPhoto[]>([]);
  const [detail, setDetail] = useState<GuestGalleryPhoto | null>(null);
  const [detailState, setDetailState] = useState<DetailState>('loading');
  const [readiness, setReadiness] = useState<CaptureReadiness | null>(null);
  const [sort, setSort] = useState<GetApiV1GuestGalleryPhotosSort>('NEWEST');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const loadVersion = useRef(0);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const sidebarCloseRef = useRef<HTMLButtonElement>(null);
  const sidebarOpenRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const photoOpenerRef = useRef<{ photoId: string; element: HTMLAnchorElement } | null>(null);
  const closeDetail = useCallback(() => router.replace(guestRoutes.gallery(linkId), { scroll: false }), [router, linkId]);

  const loadFirstPage = useCallback(async (selectedSort: GetApiV1GuestGalleryPhotosSort, version: number) => {
    const current = () => loadVersion.current === version;
    setBusy(true);
    setMessage('');
    setState('loading');
    setContext(null);
    setReadiness(null);
    setPhotos([]);
    setCursor(null);
    setHasMore(false);
    setDetail(null);
    try {
      const contextResult = await getApiV1GuestMe();
      if (!current()) return;
      if (contextResult.status === 410) { setState('post-event-ended'); return; }
      if (contextResult.status === 401 || contextResult.status === 403) { setState('ended'); return; }
      if (contextResult.status !== 200) { setState('error'); return; }
      const nextContext = contextResult.data.data;
      setContext(nextContext);
      if (nextContext.event.reveal_state !== 'REVEALED') { setState('hidden'); return; }

      const result = await getApiV1GuestGalleryPhotos({ sort: selectedSort, limit: PAGE_SIZE });
      if (!current()) return;
      if (result.status === 410) { setState('post-event-ended'); return; }
      if (result.status === 401 || result.status === 403) { setState('ended'); return; }
      if (result.status !== 200) { setState('error'); return; }
      setPhotos(result.data.data);
      setCursor(result.data.meta.next_cursor ?? null);
      setHasMore(result.data.meta.has_more);
      setState('ready');
    } catch {
      if (current()) setState('error');
    } finally {
      if (current()) setBusy(false);
    }
  }, []);

  useEffect(() => {
    const version = ++loadVersion.current;
    const timer = window.setTimeout(() => { void loadFirstPage(sort, version); }, 0);
    return () => { window.clearTimeout(timer); loadVersion.current += 1; };
  }, [loadFirstPage, sort]);

  useEffect(() => {
    const reconnect = () => { const version = ++loadVersion.current; void loadFirstPage(sort, version); };
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, [loadFirstPage, sort]);

  useEffect(() => {
    if (!context || state !== 'ready' || !isOnline) return;
    let cancelled = false;
    const check = async () => {
      try {
        const result = await getApiV1AlbumsAlbumIdCaptureReadiness(context.guest_session.album_id);
        if (!cancelled) setReadiness(result.status === 200 && result.data.data.album_id === context.guest_session.album_id ? result.data.data : null);
      } catch { if (!cancelled) setReadiness(null); }
    };
    void check();
    const timer = window.setInterval(() => void check(), 30_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [context, state, isOnline]);

  useEffect(() => {
    if (!photoId || state !== 'ready') return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setDetail(null);
      setDetailState('loading');
      setActionMessage('');
      void getApiV1GuestGalleryPhotosPhotoId(photoId).then((result) => {
        if (cancelled) return;
        if (result.status === 410) { setState('post-event-ended'); return; }
        if (result.status === 401) { setState('ended'); return; }
        if (result.status === 403 || result.status === 404) { setDetailState('unavailable'); return; }
        if (result.status !== 200) { setDetailState('error'); return; }
        setDetail(result.data.data);
        setDetailState('ready');
      }).catch(() => { if (!cancelled) setDetailState('error'); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [photoId, state]);

  useEffect(() => {
    if (!photoId || state !== 'ready') return;
    const opener = photoOpenerRef.current?.photoId === photoId ? photoOpenerRef.current.element : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const galleryHeading = headingRef.current;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeDetail(); }
      else if (dialogRef.current) trapTab(event, dialogRef.current);
    };
    document.addEventListener('keydown', onKeydown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeydown);
      document.body.style.overflow = oldOverflow;
      window.requestAnimationFrame(() => {
        if (opener?.isConnected && opener !== document.body) opener.focus();
        else galleryHeading?.focus();
      });
    };
  }, [photoId, state, closeDetail]);

  useEffect(() => {
    if (!mobileNavOpen || photoId) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => mobileCloseRef.current?.focus());
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMobileNavOpen(false); }
      else if (mobileNavRef.current) trapTab(event, mobileNavRef.current);
    };
    document.addEventListener('keydown', onKeydown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeydown);
      document.body.style.overflow = oldOverflow;
      window.requestAnimationFrame(() => { if (opener?.isConnected) opener.focus(); });
    };
  }, [mobileNavOpen, photoId]);

  useEffect(() => {
    if (state === 'post-event-ended') router.replace(guestRoutes.postEventEnd(linkId));
    else if (state === 'ended') router.replace(guestRoutes.ended(linkId));
  }, [linkId, router, state]);

  async function loadMore() {
    if (!cursor || busy || !hasMore) return;
    const version = loadVersion.current;
    setBusy(true);
    setMessage('');
    try {
      const result = await getApiV1GuestGalleryPhotos({ sort, limit: PAGE_SIZE, cursor });
      if (version !== loadVersion.current) return;
      if (result.status === 410) { setState('post-event-ended'); return; }
      if (result.status === 401 || result.status === 403) { setState('ended'); return; }
      if (result.status !== 200) { setMessage(t('error')); return; }
      const page = result.data;
      setPhotos((previous) => {
        const byId = new Map(previous.map((photo) => [photo.photo_id, photo]));
        for (const photo of page.data) byId.set(photo.photo_id, photo);
        return [...byId.values()].slice(-MAX_LOADED_PHOTOS);
      });
      setCursor(page.meta.next_cursor ?? null);
      setHasMore(page.meta.has_more);
    } catch { if (version === loadVersion.current) setMessage(t('error')); }
    finally { if (version === loadVersion.current) setBusy(false); }
  }

  function reportAction(text: string) {
    if (photoId) setActionMessage(text);
    else setMessage(text);
  }

  async function like(photo: GuestGalleryPhoto) {
    if (!isOnline || !navigator.onLine) { reportAction(t('offline')); return; }
    if (!photo.actions.can_like || photo.actions.liked_by_me || busy) return;
    setBusy(true);
    reportAction('');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) { reportAction(t('actionUnavailable')); return; }
      const result = await putApiV1GuestGalleryPhotosPhotoIdLike(photo.photo_id, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status !== 200) { reportAction(t('actionUnavailable')); return; }
      const updated = result.data.data;
      setPhotos((items) => items.map((item) => item.photo_id === updated.photo_id ? updated : item));
      setDetail((current) => current?.photo_id === updated.photo_id ? updated : current);
    } catch { reportAction(t('actionUnavailable')); }
    finally { setBusy(false); }
  }

  async function share(photo: GuestGalleryPhoto, intent: 'copy' | 'whatsapp') {
    if (!isOnline || !navigator.onLine) { reportAction(t('offline')); return; }
    if (!photo.actions.can_share || busy) return;
    const shareWindow = intent === 'whatsapp' ? window.open('about:blank', '_blank') : null;
    if (shareWindow) shareWindow.opener = null;
    setBusy(true);
    reportAction('');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) { shareWindow?.close(); reportAction(t('actionUnavailable')); return; }
      const result = await postApiV1GuestGalleryPhotosPhotoIdShareLink(photo.photo_id, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status !== 200) { shareWindow?.close(); reportAction(t('actionUnavailable')); return; }
      const url = result.data.data.url;
      if (intent === 'copy') { await navigator.clipboard.writeText(url); reportAction(t('copied')); }
      else if (shareWindow) shareWindow.location.href = `https://wa.me/?text=${encodeURIComponent(url)}`;
    } catch { shareWindow?.close(); reportAction(t('actionUnavailable')); }
    finally { setBusy(false); }
  }

  async function download(photo: GuestGalleryPhoto) {
    if (!isOnline || !navigator.onLine) { reportAction(t('offline')); return; }
    if (!photo.actions.can_download || busy) return;
    setBusy(true);
    reportAction('');
    try {
      const result = await getApiV1GuestGalleryPhotosPhotoIdDownload(photo.photo_id);
      if (result.status !== 200) { reportAction(t('actionUnavailable')); return; }
      const url = new URL(result.data.data.url, window.location.origin);
      if (!['https:', 'http:'].includes(url.protocol)) { reportAction(t('actionUnavailable')); return; }
      window.location.assign(url.toString());
    } catch { reportAction(t('actionUnavailable')); }
    finally { setBusy(false); }
  }

  async function openCapture() {
    if (!context || !readiness?.can_capture || readiness.state !== 'READY' || !isOnline || captureBusy) return;
    setCaptureBusy(true);
    try {
      const result = await getApiV1AlbumsAlbumIdCaptureReadiness(context.guest_session.album_id);
      const fresh = result.status === 200 && result.data.data.album_id === context.guest_session.album_id ? result.data.data : null;
      setReadiness(fresh);
      if (fresh?.state === 'READY' && fresh.can_capture && navigator.onLine) router.push(guestRoutes.entry(linkId));
      else setMessage(t('captureUnavailable'));
    } catch { setReadiness(null); setMessage(t('captureUnavailable')); }
    finally { setCaptureBusy(false); }
  }

  const dateTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const activePhoto = photoId && detail?.photo_id === photoId && detailState === 'ready' ? detail : null;
  const showCapture = state === 'ready' && isOnline && readiness?.state === 'READY' && readiness.can_capture;
  const navItem = 'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]';
  const navigation = (mobile: boolean) => <nav aria-label={t('navigation')} className="space-y-1">
    <Link href={guestRoutes.gallery(linkId)} aria-current="page" onClick={() => { if (mobile) setMobileNavOpen(false); setGuideOpen(false); }} className={`${navItem} bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:brightness-95`}><Images size={19} aria-hidden="true" />{t('navGallery')}</Link>
    <button type="button" aria-expanded={guideOpen} onClick={() => { setGuideOpen(true); if (mobile) setMobileNavOpen(false); }} className={navItem}><BookOpen size={19} aria-hidden="true" />{t('navGuide')}</button>
  </nav>;

  if (state === 'loading') return <main className="mx-auto max-w-5xl px-4 py-8" role="status">{t('loading')}</main>;
  if (state === 'post-event-ended') return <GuestTerminal kind="post-event-ended" />;
  if (state === 'ended') return <GuestTerminal kind="ended" />;
  if (state === 'hidden') return <main className="mx-auto flex min-h-[75vh] max-w-xl flex-col justify-center px-4 py-8"><section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"><h1 className="text-2xl font-bold">{context?.event.event_name}</h1><p className="mt-3 text-[var(--color-muted-foreground)]">{t('waiting')}</p><Button className="mt-5" variant="secondary" disabled={!isOnline} onClick={() => void loadFirstPage(sort, ++loadVersion.current)} loading={busy}><RefreshCw size={16} aria-hidden="true" />{t('refresh')}</Button></section></main>;
  if (state === 'error') return <main className="mx-auto max-w-xl px-4 py-8"><p role="alert">{!isOnline ? t('offline') : t('error')}</p><Button className="mt-4" disabled={!isOnline} onClick={() => void loadFirstPage(sort, ++loadVersion.current)} loading={busy}>{t('refresh')}</Button></main>;

  return <>
    <div aria-hidden={Boolean(photoId)} inert={Boolean(photoId)} className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="mx-auto flex min-h-screen max-w-[1680px]">
        {sidebarOpen && <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 md:flex">
          <div className="mb-10 flex items-center justify-between gap-2"><span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">Kepotret<span className="text-[#83a300]">.</span></span><button ref={sidebarCloseRef} type="button" onClick={() => { setSidebarOpen(false); window.requestAnimationFrame(() => sidebarOpenRef.current?.focus()); }} aria-label={t('closeSidebar')} className="grid size-11 place-items-center rounded-xl hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"><PanelLeftClose size={19} aria-hidden="true" /></button></div>
          {navigation(false)}
          <p className="mt-auto border-t border-[var(--color-border)] pt-5 text-xs leading-5 text-[var(--color-muted-foreground)]">{t('sidebarHint')}</p>
        </aside>}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-7">
            <div className="flex min-w-0 items-center gap-2">
              <button type="button" onClick={() => setMobileNavOpen(true)} aria-label={t('openSidebar')} className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] md:hidden"><Menu size={20} aria-hidden="true" /></button>
              {!sidebarOpen && <button ref={sidebarOpenRef} type="button" onClick={() => { setSidebarOpen(true); window.requestAnimationFrame(() => sidebarCloseRef.current?.focus()); }} aria-label={t('openSidebar')} className="hidden size-11 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] md:grid"><PanelLeftOpen size={20} aria-hidden="true" /></button>}
              <span className="truncate text-sm font-semibold text-[var(--color-muted-foreground)]">{context?.event.event_name}</span>
            </div>
            {!photoId && <div className="flex items-center gap-1.5"><LocaleControl label={preferences('language')} indonesianLabel={preferences('indonesian')} englishLabel={preferences('english')} /><ThemeToggle lightLabel={preferences('light')} darkLabel={preferences('dark')} /></div>}
          </header>

          <main id="guest-gallery-main" className="w-full min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-9">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0"><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[var(--color-muted-foreground)]">{t('eyebrow')} · {t('title')}</p><h1 ref={headingRef} tabIndex={-1} className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">{context?.event.event_name}</h1><p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t('description')}</p></div>
              {showCapture && <Button onClick={() => void openCapture()} loading={captureBusy} disabled={busy}><Camera size={17} aria-hidden="true" />{t('capture')}</Button>}
            </div>

            {guideOpen && <section aria-labelledby="guest-guide-title" className="mb-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">{t('navGuide')}</p><h2 id="guest-guide-title" className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold">{t('guideTitle')}</h2></div><button type="button" onClick={() => setGuideOpen(false)} aria-label={t('closeGuide')} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"><X size={18} aria-hidden="true" /></button></div><ol className="mt-4 grid gap-3 text-sm leading-6 text-[var(--color-muted-foreground)] sm:grid-cols-3"><li>{t('guideReveal')}</li><li>{t('guideBrowse')}</li><li>{t('guideActions')}</li></ol></section>}

            {!isOnline && <p role="status" className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm">{t('offline')}</p>}
            {message && <p role="status" className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm">{message}</p>}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">{t('photosHeading')}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium">{t('sort')}<select value={sort} onChange={(event) => { loadVersion.current += 1; setSort(event.target.value as GetApiV1GuestGalleryPhotosSort); }} className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"><option value="NEWEST">{t('newest')}</option><option value="OLDEST">{t('oldest')}</option><option value="MOST_LIKED">{t('mostLiked')}</option></select></label>
                <div role="group" aria-label={t('viewMode')} className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"><button type="button" aria-label={t('gridView')} aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} className={`grid size-10 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] ${viewMode === 'grid' ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : ''}`}><Grid2X2 size={18} aria-hidden="true" /></button><button type="button" aria-label={t('listView')} aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')} className={`grid size-10 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] ${viewMode === 'list' ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : ''}`}><List size={19} aria-hidden="true" /></button></div>
              </div>
            </div>

            {photos.length === 0 ? <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center"><h2 className="text-lg font-semibold">{t('empty')}</h2><p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t('emptyDescription')}</p></section> : <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5' : 'space-y-3'}>
              {photos.map((photo) => <article key={photo.photo_id} className={`min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm ${viewMode === 'list' ? 'flex items-center gap-3 p-2 sm:gap-4' : ''}`}>
                <Link href={guestRoutes.photo(linkId, photo.photo_id)} prefetch={false} onClick={(event) => { photoOpenerRef.current = { photoId: photo.photo_id, element: event.currentTarget }; }} aria-label={t('openPhotoNamed', { name: photo.photographer_display_name })} className={`block shrink-0 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${viewMode === 'list' ? 'w-24 rounded-lg sm:w-36' : ''}`}><DeliveryImage src={photo.media.url} alt={t('photoAltNamed', { name: photo.photographer_display_name })} unavailableLabel={t('mediaUnavailable')} className={`w-full object-cover ${viewMode === 'list' ? 'aspect-square sm:aspect-[4/3]' : 'aspect-[4/3]'}`} /></Link>
                <div className={`flex min-w-0 flex-1 items-center justify-between gap-2 ${viewMode === 'list' ? 'pr-2' : 'px-3 py-3'}`}><div className="min-w-0"><p className="truncate text-sm font-semibold">{photo.photographer_display_name}</p><time className="mt-1 block text-xs text-[var(--color-muted-foreground)]" dateTime={photo.created_at}>{dateTime(photo.created_at)}</time></div>{photo.actions.can_like && <button type="button" aria-label={photo.actions.liked_by_me ? t('liked') : t('like')} disabled={!isOnline || photo.actions.liked_by_me || busy} onClick={() => void like(photo)} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-default"><Heart size={17} fill={photo.actions.liked_by_me ? 'currentColor' : 'none'} aria-hidden="true" />{photo.like_count}</button>}</div>
              </article>)}
            </div>}
            {hasMore && <div className="mt-7 text-center"><Button variant="secondary" disabled={!isOnline} loading={busy} onClick={() => void loadMore()}>{t('loadMore')}</Button></div>}
            <p className="sr-only" aria-live="polite">{busy ? t('loading') : ''}</p>
          </main>
          <footer className="border-t border-[var(--color-border)] px-4 py-5 text-center text-xs text-[var(--color-muted-foreground)] sm:px-7">{t('footer')}</footer>
        </div>
      </div>
      {mobileNavOpen && !photoId && <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] md:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileNavOpen(false); }}><aside ref={mobileNavRef} role="dialog" aria-modal="true" aria-label={t('navigation')} tabIndex={-1} className="flex h-full w-[min(18rem,85vw)] flex-col bg-[var(--color-surface)] p-5 shadow-2xl"><div className="mb-8 flex items-center justify-between"><span className="font-[family-name:var(--font-display)] text-2xl font-bold">Kepotret.</span><button ref={mobileCloseRef} type="button" onClick={() => setMobileNavOpen(false)} aria-label={t('closeSidebar')} className="grid size-11 place-items-center rounded-full hover:bg-[var(--color-muted)]"><X size={20} aria-hidden="true" /></button></div>{navigation(true)}</aside></div>}
    </div>

    {photoId && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgb(8_12_20_/_78%)] px-3 py-4 backdrop-blur-sm sm:px-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="guest-photo-title" tabIndex={-1} className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-2xl">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-6"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">{context?.event.event_name}</p><h2 id="guest-photo-title" className="font-[family-name:var(--font-display)] text-lg font-bold">{t('viewer')}</h2></div><button ref={closeRef} type="button" onClick={closeDetail} aria-label={t('back')} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--color-border)] px-3 text-sm font-semibold hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"><X size={18} aria-hidden="true" /><span className="hidden sm:inline">{t('closeViewer')}</span></button></header>
      {!isOnline && <p role="status" className="mx-4 mt-3 rounded-xl border border-[var(--color-border)] p-3 text-sm sm:mx-6">{t('offline')}</p>}
      {!activePhoto ? <div className="grid min-h-64 place-items-center p-8 text-center"><p role={detailState === 'loading' ? 'status' : 'alert'}>{detailState === 'loading' ? t('loading') : detailState === 'unavailable' ? t('unavailable') : t('error')}</p></div> : <div className="min-h-0 p-3 sm:p-6"><div className="grid min-h-48 place-items-center rounded-xl bg-[var(--color-surface-muted)] p-2 sm:p-4"><DeliveryImage key={activePhoto.photo_id} src={activePhoto.media.url} alt={t('photoAltNamed', { name: activePhoto.photographer_display_name })} unavailableLabel={t('mediaUnavailable')} loading="eager" className="max-h-[48dvh] max-w-full rounded-lg object-contain sm:max-h-[60dvh]" /></div><div className="mt-4 flex flex-wrap items-start justify-between gap-4 px-1"><div><p className="text-base font-bold">{activePhoto.photographer_display_name}</p><time className="mt-1 block text-sm text-[var(--color-muted-foreground)]" dateTime={activePhoto.created_at}>{dateTime(activePhoto.created_at)}</time></div><div className="flex flex-wrap gap-2">
        {activePhoto.actions.can_like && <Button variant="secondary" disabled={!isOnline || activePhoto.actions.liked_by_me} loading={busy} onClick={() => void like(activePhoto)} aria-label={activePhoto.actions.liked_by_me ? t('liked') : t('like')}><Heart size={17} aria-hidden="true" fill={activePhoto.actions.liked_by_me ? 'currentColor' : 'none'} />{activePhoto.like_count}</Button>}
        {activePhoto.actions.can_download && <Button variant="secondary" disabled={!isOnline} loading={busy} onClick={() => void download(activePhoto)}><Download size={17} aria-hidden="true" />{t('download')}</Button>}
        {activePhoto.actions.can_share && <><Button variant="secondary" disabled={!isOnline} loading={busy} onClick={() => void share(activePhoto, 'copy')}><Link2 size={17} aria-hidden="true" />{t('copy')}</Button><Button variant="secondary" disabled={!isOnline} loading={busy} onClick={() => void share(activePhoto, 'whatsapp')}><MessageCircle size={17} aria-hidden="true" />WhatsApp</Button></>}
      </div></div>{actionMessage && <p role="status" className="mt-3 px-1 text-sm">{actionMessage}</p>}</div>}
    </section></div>}
  </>;
}
