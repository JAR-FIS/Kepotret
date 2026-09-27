'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Download, Heart, Link2, MessageCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  getApiV1GuestMe,
  getApiV1GuestGalleryPhotos,
  getApiV1GuestGalleryPhotosPhotoId,
  getApiV1GuestGalleryPhotosPhotoIdDownload,
  getApiV1SecurityCsrf,
  postApiV1GuestGalleryPhotosPhotoIdShareLink,
  putApiV1GuestGalleryPhotosPhotoIdLike,
} from '@/lib/api/browser';
import type { GuestGalleryPhoto, GetApiV1GuestGalleryPhotosSort, GuestContext } from '@/lib/api/generated/index.schemas';
import { guestRoutes } from '@/features/guest/routes';
import { DeliveryImage } from '@/features/gallery/components/delivery-image';

type State = 'loading' | 'ready' | 'hidden' | 'ended' | 'post-event-ended' | 'error';
const PAGE_SIZE = 24;
const MAX_LOADED_PHOTOS = 240;

export function GuestGallery({ linkId, photoId }: { linkId: string; photoId?: string }) {
  const t = useTranslations('guest.gallery');
  const locale = useLocale();
  const router = useRouter();
  const [state, setState] = useState<State>('loading');
  const [context, setContext] = useState<GuestContext | null>(null);
  const [photos, setPhotos] = useState<GuestGalleryPhoto[]>([]);
  const [detail, setDetail] = useState<GuestGalleryPhoto | null>(null);
  const [sort, setSort] = useState<GetApiV1GuestGalleryPhotosSort>('NEWEST');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const backRef = useRef<HTMLAnchorElement>(null);

  const loadFirstPage = useCallback(async (selectedSort: GetApiV1GuestGalleryPhotosSort) => {
    setBusy(true);
    setMessage('');
    setState('loading');
    setPhotos([]);
    setCursor(null);
    setHasMore(false);
    setDetail(null);
    try {
      const contextResult = await getApiV1GuestMe();
      {
        if (contextResult.status === 410) { setState('post-event-ended'); return; }
        if (contextResult.status === 401 || contextResult.status === 403) { setState('ended'); return; }
        if (contextResult.status !== 200) { setState('error'); return; }
        const nextContext = contextResult.data.data;
        setContext(nextContext);
        if (nextContext.event.reveal_state !== 'REVEALED') { setState('hidden'); return; }
      }
      const result = await getApiV1GuestGalleryPhotos({ sort: selectedSort, limit: PAGE_SIZE });
      if (result.status === 410) { setState('post-event-ended'); return; }
      if (result.status === 401 || result.status === 403) { setState('ended'); return; }
      if (result.status !== 200) { setState('error'); return; }
      const page = result.data;
      setPhotos(page.data);
      setCursor(page.meta.next_cursor ?? null);
      setHasMore(page.meta.has_more);
      setState('ready');
    } catch {
      setState('error');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadFirstPage(sort); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFirstPage, sort]);

  useEffect(() => {
    const reconnect = () => { void loadFirstPage(sort); };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && photoId) router.push(guestRoutes.gallery(linkId));
    };
    window.addEventListener('online', reconnect);
    window.addEventListener('keydown', keydown);
    return () => { window.removeEventListener('online', reconnect); window.removeEventListener('keydown', keydown); };
  }, [linkId, loadFirstPage, photoId, router, sort]);

  useEffect(() => { if (photoId) backRef.current?.focus(); }, [photoId]);

  useEffect(() => {
    if (!photoId || state !== 'ready') return;
    let cancelled = false;
    void getApiV1GuestGalleryPhotosPhotoId(photoId).then((result) => {
      if (cancelled) return;
      if (result.status === 410) { setState('post-event-ended'); return; }
      if (result.status === 401 || result.status === 403 || result.status === 404) { setMessage(t('unavailable')); return; }
      if (result.status === 200) setDetail(result.data.data);
      else setMessage(t('error'));
    }).catch(() => { if (!cancelled) setMessage(t('error')); });
    return () => { cancelled = true; };
  }, [photoId, state, t]);

  async function loadMore() {
    if (!cursor || busy || !hasMore) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await getApiV1GuestGalleryPhotos({ sort, limit: PAGE_SIZE, cursor });
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
    } catch { setMessage(t('error')); }
    finally { setBusy(false); }
  }

  async function like(photo: GuestGalleryPhoto) {
    if (!photo.actions.can_like || photo.actions.liked_by_me || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) { setMessage(t('actionUnavailable')); return; }
      const result = await putApiV1GuestGalleryPhotosPhotoIdLike(photo.photo_id, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status !== 200) { setMessage(t('actionUnavailable')); return; }
      const updated = result.data.data;
      setPhotos((items) => items.map((item) => item.photo_id === updated.photo_id ? updated : item));
      setDetail(updated);
    } catch { setMessage(t('actionUnavailable')); }
    finally { setBusy(false); }
  }

  async function share(photo: GuestGalleryPhoto, intent: 'copy' | 'whatsapp') {
    if (!photo.actions.can_share || busy) return;
    const shareWindow = intent === 'whatsapp' ? window.open('about:blank', '_blank') : null;
    if (shareWindow) shareWindow.opener = null;
    setBusy(true);
    setMessage('');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) { shareWindow?.close(); setMessage(t('actionUnavailable')); return; }
      const result = await postApiV1GuestGalleryPhotosPhotoIdShareLink(photo.photo_id, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status !== 200) { shareWindow?.close(); setMessage(t('actionUnavailable')); return; }
      const url = result.data.data.url;
      if (intent === 'copy') {
        await navigator.clipboard.writeText(url);
        setMessage(t('copied'));
      } else {
        if (shareWindow) shareWindow.location.href = `https://wa.me/?text=${encodeURIComponent(url)}`;
      }
    } catch { shareWindow?.close(); setMessage(t('actionUnavailable')); }
    finally { setBusy(false); }
  }

  async function download(photo: GuestGalleryPhoto) {
    if (!photo.actions.can_download || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await getApiV1GuestGalleryPhotosPhotoIdDownload(photo.photo_id);
      if (result.status !== 200) { setMessage(t('actionUnavailable')); return; }
      const rawUrl = result.data.data.url;
      const url = new URL(rawUrl, window.location.origin);
      if (!['https:', 'http:'].includes(url.protocol)) { setMessage(t('actionUnavailable')); return; }
      window.location.assign(url.toString());
    } catch { setMessage(t('actionUnavailable')); }
    finally { setBusy(false); }
  }

  const dateTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const activePhoto = photoId && detail?.photo_id === photoId ? detail : null;

  useEffect(() => {
    if (state === 'post-event-ended') router.replace(guestRoutes.postEventEnd(linkId));
    else if (state === 'ended') router.replace(guestRoutes.ended(linkId));
  }, [linkId, router, state]);

  if (state === 'loading') return <main className="mx-auto max-w-5xl px-4 py-8" role="status">{t('loading')}</main>;
  if (state === 'post-event-ended') return <GuestTerminal title={t('postEventTitle')} description={t('postEventDescription')} />;
  if (state === 'ended') return <GuestTerminal title={t('endedTitle')} description={t('endedDescription')} />;
  if (state === 'hidden') return <main className="mx-auto flex min-h-[75vh] max-w-xl flex-col justify-center px-4 py-8"><section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"><h1 className="text-2xl font-bold">{context?.event.event_name}</h1><p className="mt-3 text-[var(--color-muted-foreground)]">{t('waiting')}</p><Button className="mt-5" variant="secondary" onClick={() => void loadFirstPage(sort)} loading={busy}><RefreshCw size={16} aria-hidden="true" />{t('refresh')}</Button></section></main>;
  if (state === 'error') return <main className="mx-auto max-w-xl px-4 py-8"><p role="alert">{t('error')}</p><Button className="mt-4" onClick={() => void loadFirstPage(sort)} loading={busy}>{t('refresh')}</Button></main>;

  return <main className={`mx-auto min-h-screen max-w-7xl px-4 pb-8 pt-5 text-[var(--color-foreground)] sm:px-6 ${photoId ? 'bg-black text-white' : ''}`}>
    {photoId ? <>
      <header className="mb-4 flex items-center justify-between"><Link ref={backRef} href={guestRoutes.gallery(linkId)} aria-label={t('back')} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm hover:bg-white/10"><ArrowLeft size={18} aria-hidden="true" />{t('back')}</Link><span className="text-sm text-white/75">{context?.event.event_name}</span></header>
      {!activePhoto ? <div className="grid min-h-[65vh] place-items-center"><p role={message ? 'alert' : 'status'}>{message || t('loading')}</p></div> : <section aria-label={t('viewer')} className="mx-auto grid min-h-[75vh] max-w-5xl place-items-center">
        <DeliveryImage src={activePhoto.media.url} alt={activePhoto.photographer_display_name ? t('photoAltNamed', { name: activePhoto.photographer_display_name }) : t('photoAlt')} unavailableLabel={t('mediaUnavailable')} loading="eager" className="max-h-[72vh] max-w-full rounded object-contain" />
        <div className="w-full max-w-3xl py-4"><p className="font-medium">{activePhoto.photographer_display_name || t('anonymous')}</p><time className="mt-1 block text-sm text-white/70" dateTime={activePhoto.created_at}>{dateTime(activePhoto.created_at)}</time><div className="mt-4 flex flex-wrap gap-2">
          {activePhoto.actions.can_like && <Button variant="secondary" disabled={activePhoto.actions.liked_by_me} loading={busy} onClick={() => void like(activePhoto)} aria-label={activePhoto.actions.liked_by_me ? t('liked') : t('like')}><Heart size={17} aria-hidden="true" fill={activePhoto.actions.liked_by_me ? 'currentColor' : 'none'} />{activePhoto.like_count}</Button>}
          {activePhoto.actions.can_download && <Button variant="secondary" loading={busy} onClick={() => void download(activePhoto)}><Download size={17} aria-hidden="true" />{t('download')}</Button>}
          {activePhoto.actions.can_share && <><Button variant="secondary" loading={busy} onClick={() => void share(activePhoto, 'copy')}><Link2 size={17} aria-hidden="true" />{t('copy')}</Button><Button variant="secondary" loading={busy} onClick={() => void share(activePhoto, 'whatsapp')}><MessageCircle size={17} aria-hidden="true" />WhatsApp</Button></>}
        </div>{message && <p role="status" className="mt-3 text-sm">{message}</p>}</div>
      </section>}
    </> : <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--color-muted-foreground)]">{t('eyebrow')}</p><h1 className="mt-1 font-[var(--font-display)] text-3xl font-bold">{context?.event.event_name ?? t('title')}</h1><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('description')}</p></div><label className="flex min-h-11 items-center gap-2 text-sm">{t('sort')}<select value={sort} onChange={(event) => setSort(event.target.value as GetApiV1GuestGalleryPhotosSort)} className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-foreground)]"><option value="NEWEST">{t('newest')}</option><option value="OLDEST">{t('oldest')}</option><option value="MOST_LIKED">{t('mostLiked')}</option></select></label></header>
      {message && <p role="status" className="mb-4 text-sm">{message}</p>}
      {photos.length === 0 ? <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center"><h2 className="text-lg font-semibold">{t('empty')}</h2><p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t('emptyDescription')}</p></section> : <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">{photos.map((photo) => <Link key={photo.photo_id} href={guestRoutes.photo(linkId, photo.photo_id)} className="mb-3 block break-inside-avoid overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:mb-4"><DeliveryImage src={photo.media.url} alt={photo.photographer_display_name ? t('photoAltNamed', { name: photo.photographer_display_name }) : t('photoAlt')} unavailableLabel={t('mediaUnavailable')} className="h-auto max-h-[30rem] w-full object-cover" /><span className="block px-3 py-2"><span className="block truncate text-sm font-medium">{photo.photographer_display_name || t('anonymous')}</span><time className="mt-1 block text-xs text-[var(--color-muted-foreground)]" dateTime={photo.created_at}>{dateTime(photo.created_at)}</time>{photo.actions.can_like && <span className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]"><Heart size={13} aria-hidden="true" />{photo.like_count}</span>}</span></Link>)}</div>}
      {hasMore && <div className="mt-6 text-center"><Button variant="secondary" loading={busy} onClick={() => void loadMore()}>{t('loadMore')}</Button></div>}
      <p className="sr-only" aria-live="polite">{busy ? t('loading') : ''}</p>
    </>}
  </main>;
}

export function GuestTerminal({ title, description }: { title: string; description: string }) {
  return <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center px-4 py-8"><section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7"><h1 className="font-[var(--font-display)] text-2xl font-bold">{title}</h1><p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{description}</p></section></main>;
}
