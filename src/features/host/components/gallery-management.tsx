'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useConnectivity } from '@/hooks/use-connectivity';
import {
  deleteApiV1AlbumsAlbumIdPhotosPhotoId,
  getApiV1AlbumsAlbumIdPhotos,
  getApiV1AlbumsAlbumIdPhotosPhotoId,
  getApiV1AlbumsAlbumIdPhotosTrash,
  getApiV1AlbumsAlbumIdPhotosPhotoIdDownload,
  getApiV1SecurityCsrf,
  postApiV1AlbumsAlbumIdPhotosPhotoIdApprove,
  postApiV1AlbumsAlbumIdPhotosPhotoIdHide,
  postApiV1AlbumsAlbumIdPhotosPhotoIdRestore,
  postApiV1AlbumsAlbumIdPhotosPhotoIdShareLink,
  postApiV1AlbumsAlbumIdPhotosPhotoIdUnhide,
} from '@/lib/api/browser';
import type { GetApiV1AlbumsAlbumIdPhotosSort, ManagementPhoto, ModerationStatus, TrashPhoto } from '@/lib/api/generated/index.schemas';
import { hostRoutes } from '@/features/host/routes';
import { DeliveryImage } from '@/features/gallery/components/delivery-image';

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';
const PAGE_SIZE = 25;
const MAX_LOADED_PHOTOS = 240;

export function AlbumGalleryManagement({ albumId, photoId, trash = false }: { albumId: string; photoId?: string; trash?: boolean }) {
  const t = useTranslations('host.gallery');
  const tShare = useTranslations('host.sharing');
  const locale = useLocale();
  const router = useRouter();
  const isOnline = useConnectivity();
  const [state, setState] = useState<LoadState>('loading');
  const [photos, setPhotos] = useState<ManagementPhoto[]>([]);
  const [deleted, setDeleted] = useState<TrashPhoto[]>([]);
  const [detail, setDetail] = useState<ManagementPhoto | null>(null);
  const [sort, setSort] = useState<GetApiV1AlbumsAlbumIdPhotosSort>('NEWEST');
  const [filter, setFilter] = useState<ModerationStatus | ''>('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ManagementPhoto | null>(null);

  const load = useCallback(async (nextCursor?: string, reset = false) => {
    setBusy(true);
    setMessage('');
    if (reset) {
      setState('loading');
      setCursor(null);
      setHasMore(false);
      setDeleted([]);
      setPhotos([]);
    }
    try {
      if (trash) {
        const result = await getApiV1AlbumsAlbumIdPhotosTrash(albumId, { cursor: nextCursor, limit: PAGE_SIZE });
        if (result.status === 403) { setState('forbidden'); return; }
        if (result.status !== 200) { setState('error'); return; }
        const page = result.data;
        setDeleted((prev) => reset ? page.data : [...new Map([...prev, ...page.data].map((item) => [item.photo_id, item])).values()].slice(-MAX_LOADED_PHOTOS));
        setCursor(page.meta.next_cursor ?? null);
        setHasMore(page.meta.has_more);
      } else {
        const result = await getApiV1AlbumsAlbumIdPhotos(albumId, { sort, moderation_status: filter || undefined, cursor: nextCursor, limit: PAGE_SIZE });
        if (result.status === 403) { setState('forbidden'); return; }
        if (result.status !== 200) { setState('error'); return; }
        const page = result.data;
        setPhotos((prev) => reset ? page.data : [...new Map([...prev, ...page.data].map((item) => [item.photo_id, item])).values()].slice(-MAX_LOADED_PHOTOS));
        setCursor(page.meta.next_cursor ?? null);
        setHasMore(page.meta.has_more);
      }
      setState('ready');
    } catch { setState('error'); }
    finally { setBusy(false); }
  }, [albumId, filter, sort, trash]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(undefined, true); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const reconnect = () => { void load(undefined, true); };
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, [load]);
  useEffect(() => {
    if (!photoId || trash || !isOnline) return;
    let cancelled = false;
    void getApiV1AlbumsAlbumIdPhotosPhotoId(albumId, photoId).then((result) => {
      if (cancelled) return;
      if (result.status === 403) setMessage(t('forbidden'));
      else if (result.status === 200) setDetail(result.data.data);
      else setMessage(t('unavailable'));
    }).catch(() => { if (!cancelled) setMessage(t('error')); });
    return () => { cancelled = true; };
  }, [albumId, isOnline, photoId, t, trash]);

  async function runMutation(photo: ManagementPhoto, action: 'approve' | 'hide' | 'unhide' | 'delete') {
    if (!isOnline || !navigator.onLine) { setMessage(t('offline')); return; }
    setBusy(true);
    setMessage('');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) { setMessage(t('forbidden')); return; }
      const options = { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } };
      const result = action === 'approve' ? await postApiV1AlbumsAlbumIdPhotosPhotoIdApprove(albumId, photo.photo_id, options)
        : action === 'hide' ? await postApiV1AlbumsAlbumIdPhotosPhotoIdHide(albumId, photo.photo_id, options)
          : action === 'unhide' ? await postApiV1AlbumsAlbumIdPhotosPhotoIdUnhide(albumId, photo.photo_id, options)
            : await deleteApiV1AlbumsAlbumIdPhotosPhotoId(albumId, photo.photo_id, options);
      if (result.status === 403) { setMessage(t('forbidden')); await load(undefined, true); return; }
      if (result.status === 409) { setMessage(t('conflict')); await load(undefined, true); return; }
      if (result.status !== 200) { setMessage(t('error')); return; }
      setMessage(action === 'delete' ? t('deleted') : t('saved'));
      if (action === 'delete' && photoId) {
        router.replace(hostRoutes.gallery(albumId));
      } else if (photoId) {
        const updated = await getApiV1AlbumsAlbumIdPhotosPhotoId(albumId, photo.photo_id);
        if (updated.status === 200) setDetail(updated.data.data);
        else setMessage(t('unavailable'));
      } else await load(undefined, true);
    } catch { setMessage(t('error')); }
    finally { setBusy(false); }
  }

  async function restore(photo: TrashPhoto) {
    if (!isOnline || !navigator.onLine) { setMessage(t('offline')); return; }
    if (!photo.can_restore) { setMessage(t('restoreUnavailable')); return; }
    setBusy(true);
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) { setMessage(t('forbidden')); return; }
      const result = await postApiV1AlbumsAlbumIdPhotosPhotoIdRestore(albumId, photo.photo_id, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 403) { setMessage(t('forbidden')); return; }
      if (result.status === 409 || result.status === 410) { setMessage(t('restoreUnavailable')); return; }
      if (result.status !== 200) { setMessage(t('error')); return; }
      setMessage(t('restored'));
      await load(undefined, true);
    } catch { setMessage(t('error')); }
    finally { setBusy(false); }
  }

  async function share(photo: ManagementPhoto, intent: 'copy' | 'whatsapp') {
    if (!isOnline || !navigator.onLine) { setMessage(t('offline')); return; }
    if (!photo.actions.can_share || busy) return;
    const shareWindow = intent === 'whatsapp' ? window.open('about:blank', '_blank') : null;
    if (shareWindow) shareWindow.opener = null;
    setBusy(true);
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) { shareWindow?.close(); setMessage(t('forbidden')); return; }
      const result = await postApiV1AlbumsAlbumIdPhotosPhotoIdShareLink(albumId, photo.photo_id, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 403) { shareWindow?.close(); setMessage(t('forbidden')); return; }
      if (result.status !== 200) { shareWindow?.close(); setMessage(t('error')); return; }
      const url = result.data.data.url;
      if (intent === 'copy') { await navigator.clipboard.writeText(url); setMessage(tShare('copied')); }
      else if (shareWindow) shareWindow.location.href = `https://wa.me/?text=${encodeURIComponent(url)}`;
    } catch { shareWindow?.close(); setMessage(t('error')); }
    finally { setBusy(false); }
  }

  async function download(photo: ManagementPhoto) {
    if (!isOnline || !navigator.onLine) { setMessage(t('offline')); return; }
    if (!photo.actions.can_download || busy) return;
    setBusy(true);
    try {
      const result = await getApiV1AlbumsAlbumIdPhotosPhotoIdDownload(albumId, photo.photo_id);
      if (result.status !== 200) { setMessage(t('forbidden')); return; }
      const url = new URL(result.data.data.url, window.location.origin);
      if (!['https:', 'http:'].includes(url.protocol)) { setMessage(t('error')); return; }
      window.location.assign(url.toString());
    } catch { setMessage(t('error')); }
    finally { setBusy(false); }
  }

  const time = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  if (state === 'loading') return <p role="status">{t('loading')}</p>;
  if (state === 'forbidden') return <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"><p role="alert">{t('forbidden')}</p></section>;
  if (state === 'error') return <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"><p role="alert">{!isOnline ? t('offline') : t('error')}</p><Button className="mt-4" disabled={!isOnline} onClick={() => void load(undefined, true)} loading={busy}><RefreshCw size={16} aria-hidden="true" />{t('refresh')}</Button></section>;

  if (photoId && !trash) return <section className="space-y-4">
    <Link href={hostRoutes.gallery(albumId)} className="inline-flex min-h-11 items-center gap-2 text-sm underline"><ArrowLeft size={16} aria-hidden="true" />{t('title')}</Link>
    {detail?.photo_id === photoId ? <article className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
      <DeliveryImage src={detail.media.url} alt={locale === 'id' ? 'Foto acara' : 'Event photo'} unavailableLabel={t('unavailable')} loading="eager" className="mx-auto max-h-[65vh] w-auto max-w-full rounded" />
      <p className="mt-4 font-medium">{detail.photographer_display_name}</p>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{time(detail.created_at)} · {detail.moderation_status}</p>
      {!isOnline && <p role="status" className="mt-3 text-sm">{t('offline')}</p>}
      <PhotoActions photo={detail} busy={busy} offline={!isOnline} run={(action) => action === 'delete' ? setPendingDelete(detail) : void runMutation(detail, action)} labels={t} onShare={(intent) => void share(detail, intent)} onDownload={() => void download(detail)} shareLabels={tShare} downloadLabel={locale === 'id' ? 'Unduh foto' : 'Download photo'} />
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    </article> : <p role="status">{message || (isOnline ? t('loading') : t('offline'))}</p>}
    <ConfirmDialog open={Boolean(pendingDelete)} title={t('deleteTitle')} description={t('confirmDelete')} confirmLabel={t('delete')} cancelLabel={t('cancel')} destructive disabled={busy || !isOnline} onCancel={() => setPendingDelete(null)} onConfirm={() => { if (pendingDelete) { const target = pendingDelete; setPendingDelete(null); void runMutation(target, 'delete'); } }} />
  </section>;

  const items = trash ? deleted : photos;
  return <div className="space-y-5">
    {!trash && <div className="flex flex-wrap items-center gap-3"><label className="flex min-h-11 items-center gap-2 text-sm">{t('sort')}<select className="min-h-11 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2" value={sort} onChange={(e) => setSort(e.target.value as GetApiV1AlbumsAlbumIdPhotosSort)}><option value="NEWEST">{t('newest')}</option><option value="OLDEST">{t('oldest')}</option></select></label><label className="flex min-h-11 items-center gap-2 text-sm">{t('status')}<select className="min-h-11 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2" value={filter} onChange={(e) => setFilter(e.target.value as ModerationStatus | '')}><option value="">{t('all')}</option><option value="PENDING">{t('pending')}</option><option value="PUBLISHED">{t('published')}</option><option value="HIDDEN">{t('hidden')}</option></select></label><Button variant="ghost" disabled={!isOnline} loading={busy} onClick={() => void load(undefined, true)}><RefreshCw size={16} aria-hidden="true" />{t('refresh')}</Button><Link className="ml-auto inline-flex min-h-11 items-center rounded border border-[var(--color-border)] px-3 text-sm font-semibold" href={hostRoutes.trash(albumId)}>{t('trash')}</Link></div>}
    {trash && <p className="rounded-[var(--radius-md)] bg-[var(--color-muted)] p-3 text-sm">{t('quotaNote')}</p>}
    {!isOnline && <p role="status" className="text-sm">{t('offline')}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {items.length === 0 ? <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 text-center"><p className="font-semibold">{t('empty')}</p></section> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{trash ? deleted.map((photo) => <article key={photo.photo_id} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">{photo.media ? <DeliveryImage src={photo.media.url} alt={locale === 'id' ? 'Foto acara' : 'Event photo'} unavailableLabel={t('unavailable')} loading="lazy" className="aspect-[4/3] w-full object-cover" /> : <div role="img" aria-label={t('unavailable')} className="grid aspect-[4/3] place-items-center bg-[var(--color-muted)] p-4 text-center text-sm">{t('unavailable')}</div>}<div className="space-y-2 p-4"><p className="font-medium">{photo.photographer_display_name}</p><p className="text-xs text-[var(--color-muted-foreground)]">{time(photo.created_at)}</p><Button variant="secondary" disabled={!photo.can_restore || !isOnline} loading={busy} onClick={() => void restore(photo)}>{t('restore')}</Button></div></article>) : photos.map((photo) => <article key={photo.photo_id} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"><Link href={hostRoutes.photo(albumId, photo.photo_id)} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">{photo.media ? <DeliveryImage src={photo.media.url} alt={locale === 'id' ? 'Foto acara' : 'Event photo'} unavailableLabel={t('unavailable')} loading="lazy" className="aspect-[4/3] w-full object-cover" /> : <div role="img" aria-label={t('unavailable')} className="grid aspect-[4/3] place-items-center bg-[var(--color-muted)] p-4 text-center text-sm">{t('unavailable')}</div>}<div className="p-4"><p className="font-medium">{photo.photographer_display_name}</p><p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{time(photo.created_at)} · {photo.moderation_status}</p></div></Link><div className="px-4 pb-4"><PhotoActions photo={photo} busy={busy} offline={!isOnline} run={(action) => action === 'delete' ? setPendingDelete(photo) : void runMutation(photo, action)} labels={t} onShare={(intent) => void share(photo, intent)} onDownload={() => void download(photo)} shareLabels={tShare} downloadLabel={locale === 'id' ? 'Unduh foto' : 'Download photo'} /></div></article>)}</div>}
    {hasMore && <div className="text-center"><Button variant="secondary" disabled={!isOnline} loading={busy} onClick={() => void load(cursor ?? undefined)}>{t('loadMore')}</Button></div>}
    <ConfirmDialog open={Boolean(pendingDelete)} title={t('deleteTitle')} description={t('confirmDelete')} confirmLabel={t('delete')} cancelLabel={t('cancel')} destructive disabled={busy || !isOnline} onCancel={() => setPendingDelete(null)} onConfirm={() => { if (pendingDelete) { const target = pendingDelete; setPendingDelete(null); void runMutation(target, 'delete'); } }} />
  </div>;
}

function PhotoActions({ photo, busy, offline, run, labels, onShare, onDownload, shareLabels, downloadLabel }: { photo: ManagementPhoto; busy: boolean; offline: boolean; run: (action: 'approve' | 'hide' | 'unhide' | 'delete') => void; labels: ReturnType<typeof useTranslations<'host.gallery'>>; onShare: (intent: 'copy' | 'whatsapp') => void; onDownload: () => void; shareLabels: ReturnType<typeof useTranslations<'host.sharing'>>; downloadLabel: string }) {
  return <div className="mt-3 flex flex-wrap gap-2">{photo.actions.can_approve && <Button disabled={offline} loading={busy} onClick={() => run('approve')}>{labels('approve')}</Button>}{photo.actions.can_hide && <Button disabled={offline} variant="secondary" loading={busy} onClick={() => run('hide')}>{labels('hide')}</Button>}{photo.actions.can_unhide && <Button disabled={offline} variant="secondary" loading={busy} onClick={() => run('unhide')}>{labels('unhide')}</Button>}{photo.actions.can_delete && <Button disabled={offline} variant="danger" loading={busy} onClick={() => run('delete')}>{labels('delete')}</Button>}{photo.actions.can_download && <Button disabled={offline} variant="secondary" loading={busy} onClick={onDownload}><Download size={16} aria-hidden="true" />{downloadLabel}</Button>}{photo.actions.can_share && <><Button disabled={offline} variant="secondary" loading={busy} onClick={() => onShare('copy')}>{shareLabels('copy')}</Button><Button disabled={offline} variant="secondary" loading={busy} onClick={() => onShare('whatsapp')}>WhatsApp</Button></>}</div>;
}
