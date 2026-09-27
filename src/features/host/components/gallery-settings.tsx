'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useConnectivity } from '@/hooks/use-connectivity';
import { getApiV1AlbumsAlbumIdSettings, getApiV1SecurityCsrf, patchApiV1AlbumsAlbumIdSettings } from '@/lib/api/browser';
import type { AlbumSettingsPatchRequest } from '@/lib/api/generated/index.schemas';

type State = 'loading' | 'ready' | 'forbidden' | 'error';
export function GallerySettings({ albumId }: { albumId: string }) {
  const t = useTranslations('host.gallery');
  const isOnline = useConnectivity();
  const [state, setState] = useState<State>('loading');
  const [draft, setDraft] = useState<AlbumSettingsPatchRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const result = await getApiV1AlbumsAlbumIdSettings(albumId);
      if (result.status === 403) { setState('forbidden'); return; }
      if (result.status !== 200) { setState('error'); return; }
      const current = result.data.data;
      const currentDraft: AlbumSettingsPatchRequest = { expected_revision: current.revision, visibility: current.visibility, moderation_mode: current.moderation_mode, likes_enabled: current.likes_enabled, downloads_enabled: current.downloads_enabled, share_enabled: current.share_enabled };
      setDraft(currentDraft);
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

  async function save() {
    if (!draft || !isOnline || !navigator.onLine) { if (!isOnline || !navigator.onLine) setMessage(t('offline')); return; }
    setBusy(true);
    setMessage('');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) { setMessage(t('forbidden')); return; }
      const result = await patchApiV1AlbumsAlbumIdSettings(albumId, draft, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 403) { setMessage(t('forbidden')); return; }
      if (result.status === 409) { setMessage(t('conflict')); await load(); return; }
      if (result.status !== 200) { setMessage(t('error')); return; }
      setMessage(t('saved'));
      await load();
    } catch { setMessage(t('error')); }
    finally { setBusy(false); }
  }

  if (state === 'loading') return <p role="status">{t('loading')}</p>;
  if (state !== 'ready' || !draft) return <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><p role="alert">{state === 'forbidden' ? t('forbidden') : !isOnline ? t('offline') : t('error')}</p><Button className="mt-4" variant="secondary" disabled={!isOnline} onClick={() => void load()}>{t('refresh')}</Button></section>;
  return <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"><h2 className="text-lg font-semibold">{t('visibility')} · {t('moderation')}</h2>{!isOnline && <p role="status" className="mt-3 text-sm text-[var(--color-muted-foreground)]">{t('offline')}</p>}<div className="mt-4 grid gap-4 sm:grid-cols-2">
    <Choice label={t('visibility')} value={draft.visibility ?? 'GUEST'} onChange={(value) => setDraft({ ...draft, visibility: value as AlbumSettingsPatchRequest['visibility'] })} options={[["GUEST", t('guestVisible')], ["HOST_ONLY", t('hostOnly')]]} />
    <Choice label={t('moderation')} value={draft.moderation_mode ?? 'APPROVAL'} onChange={(value) => setDraft({ ...draft, moderation_mode: value as AlbumSettingsPatchRequest['moderation_mode'] })} options={[["INSTANT", t('instant')], ["APPROVAL", t('approval')]]} />
    <Toggle label={t('likes')} checked={Boolean(draft.likes_enabled)} onChange={(value) => setDraft({ ...draft, likes_enabled: value })} />
    <Toggle label={t('downloads')} checked={Boolean(draft.downloads_enabled)} onChange={(value) => setDraft({ ...draft, downloads_enabled: value })} />
    <Toggle label={t('sharing')} checked={Boolean(draft.share_enabled)} onChange={(value) => setDraft({ ...draft, share_enabled: value })} />
  </div><div className="mt-5 flex flex-wrap items-center gap-3"><Button disabled={!isOnline} loading={busy} onClick={() => void save()}>{t('save')}</Button><Button variant="ghost" disabled={!isOnline} onClick={() => void load()}>{t('refresh')}</Button>{message && <p role="status" className="text-sm">{message}</p>}</div></section>;
}

function Choice({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="grid gap-2 text-sm font-medium">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-5 accent-[var(--color-primary)]" />{label}</label>;
}
