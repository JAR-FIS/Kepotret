'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Copy, Download, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useConnectivity } from '@/hooks/use-connectivity';
import { getApiV1AlbumsAlbumIdQrPdf, getApiV1AlbumsAlbumIdSharing, getApiV1SecurityCsrf, postApiV1AlbumsAlbumIdAccessLinkRotate } from '@/lib/api/browser';
import { hostRoutes } from '@/features/host/routes';
import type { AlbumSharing } from '@/lib/api/generated/index.schemas';

type State = 'loading' | 'ready' | 'forbidden' | 'error';
function HostSharingPanel({ albumId }: { albumId: string }) {
  const t = useTranslations('host.sharing');
  const isOnline = useConnectivity();
  const [state, setState] = useState<State>('loading');
  const [sharing, setSharing] = useState<AlbumSharing | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [rotationDialogOpen, setRotationDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const result = await getApiV1AlbumsAlbumIdSharing(albumId);
      if (result.status === 403) { setState('forbidden'); return; }
      if (result.status !== 200) { setState('error'); return; }
      setSharing(result.data.data);
      setState('ready');
    } catch { setState('error'); }
  }, [albumId]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const reconnect = () => { void load(); };
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, [load]);

  async function rotate() {
    if (!isOnline || !navigator.onLine) { setMessage(t('offline')); return; }
    if (!sharing?.can_rotate) return;
    setBusy(true);
    setMessage('');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status === 401 || csrf.status === 403) { setMessage(t('forbidden')); return; }
      if (csrf.status !== 200) { setMessage(t('error')); return; }
      const result = await postApiV1AlbumsAlbumIdAccessLinkRotate(albumId, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 401 || result.status === 403) { setState('forbidden'); setMessage(t('rotationUnavailable')); return; }
      if (result.status === 409) { setMessage(t('conflict')); return; }
      if (result.status === 429) { setMessage(t('rateLimited')); return; }
      if (result.status !== 200) { setMessage(t('error')); return; }
      setSharing(result.data.data);
      setState('ready');
      setMessage(t('rotated'));
    } catch { setMessage(!navigator.onLine ? t('offline') : t('error')); }
    finally { setBusy(false); }
  }

  async function copy() {
    if (!sharing) return;
    try { await navigator.clipboard.writeText(sharing.url); setMessage(t('copied')); }
    catch {
      const input = document.getElementById('album-guest-url');
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
        if (document.execCommand('copy')) { setMessage(t('copied')); return; }
      }
      setMessage(t('error'));
    }
  }

  async function downloadPdf() {
    if (!isOnline || !navigator.onLine) { setMessage(t('offline')); return; }
    setBusy(true);
    setMessage('');
    try {
      const result = await getApiV1AlbumsAlbumIdQrPdf(albumId);
      if (result.status === 403) { setState('forbidden'); return; }
      if (result.status !== 200) { setMessage(t('error')); return; }
      const objectUrl = URL.createObjectURL(result.data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'kepotret-qr.pdf';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    } catch { setMessage(t('error')); }
    finally { setBusy(false); }
  }

  if (state === 'loading') return <p role="status">{t('loading')}</p>;
  if (state === 'forbidden') return <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"><p role="alert">{t('forbidden')}</p></section>;
  if (state === 'error' && !sharing) return <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"><p role="alert">{!isOnline ? t('offline') : message || t('error')}</p><Button className="mt-4" disabled={!isOnline} onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" />{t('refresh')}</Button></section>;
  return <section className="space-y-5">
    {!isOnline && <p role="status" className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm">{t('offline')}</p>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t('description')}</p>
        {sharing && <>
          <label htmlFor="album-guest-url" className="mt-5 block text-sm font-medium">{t('url')}</label>
          <div className="relative mt-2"><input id="album-guest-url" readOnly value={sharing.url} className="min-h-11 w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] py-2 pl-3 pr-12 font-mono text-xs" /><button type="button" aria-label={t('copy')} onClick={() => void copy()} className="absolute inset-y-0 right-1 inline-flex w-10 items-center justify-center rounded-full hover:bg-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"><Copy size={16} aria-hidden="true" /></button></div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-full border border-[var(--color-border)] px-4 text-sm font-semibold" href="/help/collaborator">{t('collaboratorGuide')}</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-[var(--color-border)] px-4 text-sm font-semibold" href="/help/guest">{t('guestGuide')}</Link>
          </div>
          <div className="mt-5 border-t border-[var(--color-border)] pt-4">
            {sharing.can_rotate && <p className="text-sm text-[var(--color-muted-foreground)]">{t('rotateWarning')}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {sharing.can_rotate && <Button className="rounded-full font-bold" variant="danger" disabled={!isOnline} loading={busy} onClick={() => setRotationDialogOpen(true)}>{t('rotate')}</Button>}
              <Button variant="ghost" disabled={!isOnline} onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" />{t('refresh')}</Button>
            </div>
          </div>
        </>}
        {message && <p role="status" className="mt-4 text-sm">{message}</p>}
      </div>
      <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">{sharing && <><QRCodeSVG value={sharing.url} size={220} marginSize={4} level="M" title={t('qrAlt')} /><p className="mt-4 text-center text-sm text-[var(--color-muted-foreground)]">{t('qrAlt')}</p><Button type="button" variant="secondary" disabled={!isOnline} loading={busy} onClick={() => void downloadPdf()} className="mt-5 w-full rounded-full font-bold"><Download size={16} aria-hidden="true" />{t('pdf')}</Button></>}</div>
    </div>
    <ConfirmDialog open={rotationDialogOpen} title={t('rotate')} description={t('confirmRotateDescription')} confirmLabel={t('confirmRotate')} cancelLabel={t('cancel')} disabled={busy || !isOnline} onCancel={() => setRotationDialogOpen(false)} onConfirm={() => { setRotationDialogOpen(false); void rotate(); }} />
  </section>;
}

export function GuestAlbumTutorial({ albumId }: { albumId: string }) {
  const t = useTranslations('host.guestTutorial');
  const steps = ['scan', 'name', 'consent', 'camera', 'capture', 'gallery', 'closed'] as const;
  return <section className="max-w-3xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <Link href={hostRoutes.sharing(albumId)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline"><ArrowLeft size={16} aria-hidden="true" />{t('back')}</Link>
    <p className="mt-5 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('intro')}</p>
    <ol className="mt-6 space-y-4">{steps.map((step, index) => <li key={step} className="flex gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"><span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-[var(--color-primary-foreground)]">{index + 1}</span><p className="text-sm leading-6">{t(step)}</p></li>)}</ol>
  </section>;
}

export function AlbumSharingPanel({ albumId, preparation = false }: { albumId: string; preparation?: boolean }) {
  return preparation ? <GuestAlbumTutorial albumId={albumId} /> : <HostSharingPanel albumId={albumId} />;
}
