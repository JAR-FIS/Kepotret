'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Copy, Download, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getApiV1AlbumsAlbumIdQrPdf, getApiV1AlbumsAlbumIdSharing, postApiV1AlbumsAlbumIdAccessLinkRotate } from '@/lib/api/browser';
import { hostRoutes } from '@/features/host/routes';
import type { AlbumSharing } from '@/lib/api/generated/index.schemas';

type State = 'loading' | 'ready' | 'forbidden' | 'error';
export function AlbumSharingPanel({ albumId, preparation = false }: { albumId: string; preparation?: boolean }) {
  const t = useTranslations('host.sharing');
  const [state, setState] = useState<State>('loading');
  const [sharing, setSharing] = useState<AlbumSharing | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

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

  async function rotate() {
    if (!sharing?.can_rotate || !window.confirm(`${t('rotateWarning')}\n\n${t('confirmRotate')}`)) return;
    setSharing(null);
    setBusy(true);
    setMessage('');
    try {
      const result = await postApiV1AlbumsAlbumIdAccessLinkRotate(albumId);
      if (result.status === 403) { setState('forbidden'); setMessage(t('rotationUnavailable')); return; }
      if (result.status !== 200) { setState('error'); setMessage(t('error')); return; }
      setSharing(result.data.data);
      setState('ready');
      setMessage(t('rotated'));
    } catch { setState('error'); setMessage(t('error')); }
    finally { setBusy(false); }
  }

  async function copy() {
    if (!sharing) return;
    try { await navigator.clipboard.writeText(sharing.url); setMessage(t('copied')); }
    catch { setMessage(t('error')); }
  }

  async function downloadPdf() {
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
  if (state === 'error' && !sharing) return <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"><p role="alert">{message || t('error')}</p><Button className="mt-4" onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" />{t('loading')}</Button></section>;
  return <section className="space-y-5">
    {preparation && <Link href={hostRoutes.sharing(albumId)} className="inline-flex min-h-11 items-center gap-2 text-sm underline"><ArrowLeft size={16} aria-hidden="true" />{t('title')}</Link>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7"><h2 className="text-lg font-semibold">{preparation ? t('preparation') : t('title')}</h2><p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t('description')}</p>{sharing && <><label className="mt-5 block text-sm font-medium">{t('url')}<input readOnly value={sharing.url} className="mt-2 min-h-11 w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 font-mono text-xs" /></label><div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => void copy()}><Copy size={16} aria-hidden="true" />{t('copy')}</Button><Button variant="secondary" loading={busy} onClick={() => void downloadPdf()}><Download size={16} aria-hidden="true" />{t('pdf')}</Button>{!preparation && <Link className="inline-flex min-h-11 items-center rounded border border-[var(--color-border)] px-4 text-sm font-semibold" href={hostRoutes.preparation(albumId)}>{t('preparation')}</Link>}</div>{sharing.can_rotate && !preparation && <div className="mt-5 border-t border-[var(--color-border)] pt-4"><p className="text-sm text-[var(--color-muted-foreground)]">{t('rotateWarning')}</p><Button className="mt-3" variant="danger" loading={busy} onClick={() => void rotate()}>{t('rotate')}</Button></div>}</>}{message && <p role="status" className="mt-4 text-sm">{message}</p>}</div>
      <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">{sharing && <><QRCodeSVG value={sharing.url} size={220} marginSize={4} level="M" title={t('qrAlt')} /><p className="mt-4 text-center text-sm text-[var(--color-muted-foreground)]">{t('qrAlt')}</p></>}</div>
    </div>
  </section>;
}
