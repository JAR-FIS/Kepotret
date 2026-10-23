'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { hostRoutes } from '@/features/host/routes';
import { intentKey } from '@/features/host/lib/intent-key';
import { useConnectivity } from '@/hooks/use-connectivity';
import {
  getApiV1AlbumsAlbumIdExportCapabilities,
  getApiV1AlbumsAlbumIdExportSelectionPhotos,
  getApiV1SecurityCsrf,
  postApiV1AlbumsAlbumIdExports,
} from '@/lib/api/browser';
import type { ExportCapabilities, ExportSelectionPhoto } from '@/lib/api/generated/index.schemas';

type SelectionState = 'idle' | 'loading' | 'ready' | 'blocked' | 'error';

export function GalleryExportSelection({ albumId, allowed, onModeChange }: { albumId: string; allowed: boolean; onModeChange: (active: boolean) => void }) {
  const t = useTranslations('host.gallerySelection');
  const locale = useLocale();
  const router = useRouter();
  const online = useConnectivity();
  const requestVersion = useRef(0);
  const [active, setActive] = useState(false);
  const [state, setState] = useState<SelectionState>('idle');
  const [caps, setCaps] = useState<ExportCapabilities | null>(null);
  const [candidates, setCandidates] = useState<ExportSelectionPhoto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState('');

  function close() {
    requestVersion.current += 1;
    setActive(false);
    onModeChange(false);
    setConfirm(false);
    setSelected([]);
    setCaps(null);
    setCandidates([]);
    setNextCursor(null);
    setNotice('');
    setState('idle');
  }

  async function refresh() {
    if (!allowed || !online || !navigator.onLine) return;
    const version = ++requestVersion.current;
    setState('loading');
    setNotice('');
    setSelected([]);
    setCandidates([]);
    setNextCursor(null);
    try {
      const capability = await getApiV1AlbumsAlbumIdExportCapabilities(albumId);
      if (version !== requestVersion.current) return;
      if (capability.status !== 200) { setState(capability.status === 403 ? 'blocked' : 'error'); setNotice(capability.status === 401 ? t('reauth') : capability.status === 429 ? t('rateLimited') : capability.status === 403 ? t('forbidden') : t('loadError')); return; }
      const current = capability.data.data;
      setCaps(current);
      if (!current.allow_selected || current.max_photos_per_job < 1) { setState('blocked'); return; }
      const result = await getApiV1AlbumsAlbumIdExportSelectionPhotos(albumId, { limit: 100 });
      if (version !== requestVersion.current) return;
      if (result.status !== 200) { setState(result.status === 403 ? 'blocked' : 'error'); setNotice(result.status === 429 ? t('rateLimited') : result.status === 401 ? t('reauth') : result.status === 403 ? t('forbidden') : t('loadError')); return; }
      setCandidates([...new Map(result.data.data.map((photo) => [photo.photo_id, photo])).values()]);
      setNextCursor(result.data.meta.next_cursor ?? null);
      setState('ready');
    } catch { if (version === requestVersion.current) { setState('error'); setNotice(t('loadError')); } }
  }

  async function loadMore() {
    if (!nextCursor || busy || !online) return;
    const version = requestVersion.current;
    setBusy(true);
    try {
      const result = await getApiV1AlbumsAlbumIdExportSelectionPhotos(albumId, { limit: 100, cursor: nextCursor });
      if (version !== requestVersion.current) return;
      if (result.status !== 200) {
        if (result.status === 403 || result.status === 401) { setState(result.status === 403 ? 'blocked' : 'error'); setSelected([]); }
        setNotice(result.status === 429 ? t('rateLimited') : result.status === 403 ? t('forbidden') : result.status === 401 ? t('reauth') : t('loadError'));
        return;
      }
      setCandidates((previous) => [...new Map([...previous, ...result.data.data].map((photo) => [photo.photo_id, photo])).values()]);
      setNextCursor(result.data.meta.next_cursor ?? null);
    } catch { if (version === requestVersion.current) setNotice(t('loadError')); }
    finally { if (version === requestVersion.current) setBusy(false); }
  }

  // Recheck server authority and the current cap. The export POST validates photo eligibility.
  async function validateSelection(ids: string[]) {
    const capability = await getApiV1AlbumsAlbumIdExportCapabilities(albumId);
    if (capability.status !== 200) return { status: capability.status, valid: false };
    const current = capability.data.data;
    setCaps(current);
    if (!current.allow_selected || ids.length === 0 || ids.length > current.max_photos_per_job) return { status: 409, valid: false };
    return { status: 200, valid: true };
  }

  function validationError(status: number) {
    if (status === 401) return t('reauth');
    if (status === 403) return t('forbidden');
    if (status === 409 || status === 422) return t('stale');
    if (status === 429) return t('rateLimited');
    return t('createError');
  }

  async function startExport() {
    if (!allowed || busy || !online || !navigator.onLine || state !== 'ready' || selected.length === 0) return;
    setBusy(true);
    setNotice('');
    try {
      const ids = [...new Set(selected)].sort();
      const check = await validateSelection(ids);
      if (!check.valid) {
        setNotice(validationError(check.status));
        if (check.status === 403) setState('blocked');
        if (check.status === 401) setState('error');
        if (check.status === 409 || check.status === 422) { await refresh(); setNotice(t('stale')); }
        return;
      }
      const slot = `export:${albumId}`;
      const key = intentKey(slot, `SELECTED:${ids.join(',')}`);
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) { setNotice(validationError(csrf.status)); return; }
      const result = await postApiV1AlbumsAlbumIdExports(albumId, { mode: 'SELECTED', photo_ids: ids }, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token, 'Idempotency-Key': key } });
      if (result.status === 201) { sessionStorage.removeItem(`kepotret:${slot}`); router.push(hostRoutes.export(albumId, result.data.data.export_job_id)); return; }
      setNotice(validationError(result.status));
      if (result.status === 403) setState('blocked');
      if (result.status === 401) setState('error');
      if (result.status === 409 || result.status === 422) { await refresh(); setNotice(t('stale')); }
    } catch { setNotice(t('createError')); }
    finally { setBusy(false); setConfirm(false); }
  }

  return <div className="space-y-3">
    <Button variant="secondary" aria-pressed={active} disabled={!allowed || !online} onClick={() => { if (active) close(); else { setActive(true); onModeChange(true); void refresh(); } }}>{active ? t('done') : t('select')}</Button>
    {!allowed && <p className="text-sm text-[var(--color-muted-foreground)]">{t('noPermission')} <Link className="underline underline-offset-4" href={hostRoutes.exports(albumId)}>{t('exportCenter')}</Link></p>}
    {active && <section aria-label={t('summary')} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <p role="status" className="font-semibold">{caps ? t('selectedCount', { count: selected.length, maximum: caps.max_photos_per_job }) : t('selectedUnknown', { count: selected.length })}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3"><Button variant="ghost" disabled={selected.length === 0 || busy} onClick={() => { setSelected([]); setNotice(''); }}>{t('clear')}</Button><Button disabled={!allowed || state !== 'ready' || selected.length === 0 || !online || busy} loading={busy} onClick={() => setConfirm(true)}><Download size={17} aria-hidden="true" />{t('downloadZip')}</Button></div>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{state === 'loading' ? t('loading') : state === 'blocked' ? t('unavailable') : state === 'error' ? t('loadError') : t('jobExplanation')}</p>
      {state === 'error' && <Button className="mt-3" variant="secondary" disabled={!online} onClick={() => void refresh()}>{t('retry')}</Button>}
      {notice && <p role="alert" className="mt-2 text-sm">{notice}</p>}
      {state === 'ready' && <div className="mt-4 space-y-2"><p className="text-sm font-semibold">{t('eligibleList')}</p>{candidates.length === 0 && <p className="text-sm">{t('empty')}</p>}
        <ul className="max-h-72 space-y-1 overflow-y-auto">{candidates.map((photo) => <li key={photo.photo_id}><label className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-[var(--color-muted)] focus-within:outline focus-within:outline-2 focus-within:outline-[var(--color-focus)]"><input type="checkbox" className="size-5 accent-[var(--color-primary)]" aria-label={t('selectNamed', { name: photo.photographer_display_name })} checked={selected.includes(photo.photo_id)} disabled={!online || busy || (!selected.includes(photo.photo_id) && selected.length >= (caps?.max_photos_per_job ?? 0))} onChange={(event) => { setNotice(''); setSelected((current) => event.target.checked ? current.includes(photo.photo_id) || current.length >= (caps?.max_photos_per_job ?? 0) ? current : [...current, photo.photo_id] : current.filter((id) => id !== photo.photo_id)); }} /><span className="min-w-0 truncate text-sm">{photo.photographer_display_name} · {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(photo.created_at))}</span></label></li>)}</ul>
        {nextCursor && <Button variant="secondary" disabled={!online || busy} loading={busy} onClick={() => void loadMore()}>{t('loadMore')}</Button>}
      </div>}
    </section>}
    <ConfirmDialog open={confirm} title={t('confirmTitle')} description={t('confirmDescription', { count: selected.length })} confirmLabel={t('confirm')} cancelLabel={t('cancel')} disabled={busy || !online} onCancel={() => setConfirm(false)} onConfirm={() => void startExport()} />
  </div>;
}
