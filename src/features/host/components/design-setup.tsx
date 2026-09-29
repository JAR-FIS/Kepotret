'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import {
  getApiV1AlbumsAlbumIdDesign,
  getApiV1SecurityCsrf,
  patchApiV1AlbumsAlbumIdDesign,
  postApiV1AlbumsAlbumIdDesignAssetsAssetIdCommit,
  postApiV1AlbumsAlbumIdDesignAssetsUploadAuthorizations,
} from '@/lib/api/browser';
import type { AlbumDesign, DesignAssetAuthorizeRequest } from '@/lib/api/generated/index.schemas';

const MAX_COVER_BYTES = 5_000_000;
const COVER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type CoverMimeType = (typeof COVER_MIME_TYPES)[number];
type Operation = 'authorizing' | 'uploading' | 'committing' | 'selecting' | null;
type Message = 'saved' | 'conflict' | 'invalid' | 'rateLimited' | 'uploadFailed' | 'offline' | 'error' | null;

function isCoverMimeType(value: string): value is CoverMimeType {
  return COVER_MIME_TYPES.includes(value as CoverMimeType);
}

export function DesignSetup({ albumId }: { albumId: string }) {
  const t = useTranslations('host.design');
  const shared = useTranslations('host');
  const fileRef = useRef<HTMLInputElement>(null);
  const [design, setDesign] = useState<AlbumDesign | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [operation, setOperation] = useState<Operation>(null);
  const [message, setMessage] = useState<Message>(null);
  const [attempt, setAttempt] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  useEffect(() => {
    let active = true;
    void getApiV1AlbumsAlbumIdDesign(albumId).then((result) => {
      if (!active) return;
      if (result.status === 200) { setDesign(result.data.data); setState('ready'); }
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  function handleProtectedStatus(status: number) {
    if (status === 401) setState('unauthenticated');
    else if (status === 403) setState('forbidden');
    else if (status === 409) setMessage('conflict');
    else if (status === 422) setMessage('invalid');
    else if (status === 429) setMessage('rateLimited');
    else setMessage('error');
  }

  async function loadCurrentDesign() {
    const result = await getApiV1AlbumsAlbumIdDesign(albumId);
    if (result.status === 200) {
      setDesign(result.data.data);
      setState('ready');
      return result.data.data;
    }
    if (result.status === 401 || result.status === 403) handleProtectedStatus(result.status);
    return null;
  }

  async function getCsrfHeaders() {
    const csrf = await getApiV1SecurityCsrf();
    if (csrf.status !== 200) {
      handleProtectedStatus(csrf.status);
      return null;
    }
    return { 'X-CSRF-Token': csrf.data.data.csrf_token };
  }

  async function saveSelection(coverAssetId: string | null) {
    const current = await loadCurrentDesign();
    if (!current) {
      setMessage('error');
      return false;
    }
    const headers = await getCsrfHeaders();
    if (!headers) return false;
    setOperation('selecting');
    const result = await patchApiV1AlbumsAlbumIdDesign(albumId, {
      expected_revision: current.setup_revision,
      cover_asset_id: coverAssetId,
    }, { headers });
    if (result.status !== 200) {
      handleProtectedStatus(result.status);
      return false;
    }
    const refreshed = await loadCurrentDesign();
    if (!refreshed) {
      setMessage('error');
      return false;
    }
    setMessage('saved');
    return true;
  }

  async function selectCover(file: File) {
    setMessage(null);
    if (!online || !navigator.onLine) { setMessage('offline'); return; }
    if (!isCoverMimeType(file.type) || file.size < 1 || file.size > MAX_COVER_BYTES) {
      setMessage('invalid');
      return;
    }

    setOperation('authorizing');
    try {
      const headers = await getCsrfHeaders();
      if (!headers) return;
      const request: DesignAssetAuthorizeRequest = {
        asset_type: 'COVER',
        content_type: file.type,
        size_bytes: file.size,
      };
      const authorization = await postApiV1AlbumsAlbumIdDesignAssetsUploadAuthorizations(albumId, request, { headers });
      if (authorization.status !== 201) {
        handleProtectedStatus(authorization.status);
        return;
      }

      setOperation('uploading');
      const upload = await fetch(authorization.data.data.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!upload.ok) {
        setMessage('uploadFailed');
        return;
      }

      setOperation('committing');
      const commitHeaders = await getCsrfHeaders();
      if (!commitHeaders) return;
      const committed = await postApiV1AlbumsAlbumIdDesignAssetsAssetIdCommit(
        albumId,
        authorization.data.data.asset_id,
        {},
        { headers: commitHeaders },
      );
      if (committed.status !== 200) {
        handleProtectedStatus(committed.status);
        return;
      }

      const selected = await saveSelection(authorization.data.data.asset_id);
      if (!selected) return;
    } catch {
      setMessage(navigator.onLine ? 'error' : 'offline');
    } finally {
      setOperation(null);
    }
  }

  async function clearCover() {
    if (operation || !design?.cover_asset_id) return;
    setMessage(null);
    if (!online || !navigator.onLine) { setMessage('offline'); return; }
    setOperation('selecting');
    try {
      const saved = await saveSelection(null);
      if (!saved) return;
    } catch {
      setMessage(navigator.onLine ? 'error' : 'offline');
    } finally {
      setOperation(null);
    }
  }

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error' || !design) return <ErrorState title={shared('errorTitle')} description={shared('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  const busy = operation !== null;
  return <section className="max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <h2 className="font-semibold">{t('title')}</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description')}</p>
    {design.cover_asset_id ? <>
      <p className="mt-5 text-sm font-semibold">{t('coverSet')}</p>
      {design.cover_preview && <Image src={design.cover_preview.url} unoptimized width={960} height={540} alt={t('coverPreview')} className="mt-3 max-h-72 w-full rounded-xl object-cover" />}
      <Button type="button" variant="secondary" disabled={busy || !online} loading={operation === 'selecting'} onClick={() => void clearCover()} className="mt-5">{t('clear')}</Button>
    </> : <p className="mt-5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-muted-foreground)]">{t('empty')}</p>}
    <div className="mt-5 space-y-2">
      <label htmlFor="design-cover-file" className="block text-sm font-semibold">{t('chooseCover')}</label>
      <input
        ref={fileRef}
        id="design-cover-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy || !online}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void selectCover(file);
          event.currentTarget.value = '';
        }}
        className="block min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-sm disabled:opacity-60"
      />
      <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">{t('coverPolicy')}</p>
      {operation && <p role="status" className="text-sm text-[var(--color-muted-foreground)]">{t(operation)}</p>}
      {message && <p role={message === 'invalid' ? 'alert' : 'status'} className="text-sm text-[var(--color-muted-foreground)]">{t(message)}{message === 'conflict' && <> <button type="button" onClick={() => { setMessage(null); setState('loading'); setAttempt((value) => value + 1); }} className="font-semibold underline">{shared('retry')}</button></>}</p>}
      {!online && <p role="status" className="text-sm text-[var(--color-muted-foreground)]">{t('offline')}</p>}
    </div>
  </section>;
}
