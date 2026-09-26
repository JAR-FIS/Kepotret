'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumId, getApiV1EventCategories, getApiV1SecurityCsrf, patchApiV1AlbumsAlbumId } from '@/lib/api/browser';
import type { EventCategory } from '@/lib/api/generated/index.schemas';

export function EventBasics({ albumId }: { albumId: string }) {
  const t = useTranslations('host.eventBasics');
  const shared = useTranslations('host');
  const locale = useLocale();
  const [revision, setRevision] = useState<number | null>(null);
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [timezone, setTimezone] = useState('');
  const [timezoneLocked, setTimezoneLocked] = useState(false);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [message, setMessage] = useState<'saved' | 'conflict' | 'error' | 'invalid' | 'serverValidation' | null>(null);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([getApiV1AlbumsAlbumId(albumId), getApiV1EventCategories()]).then(([albumResult, categoryResult]) => {
      if (!active) return;
      if (albumResult.status === 401) { setState('unauthenticated'); return; }
      if (albumResult.status === 403) { setState('forbidden'); return; }
      if (albumResult.status !== 200 || categoryResult.status !== 200) { setState('error'); return; }
      const album = albumResult.data.data;
      setRevision(album.setup_revision);
      setEventName(album.event_name ?? '');
      setEventLocation(album.event_location ?? '');
      setCategoryId(album.event_category_id ?? '');
      setTimezone(album.timezone);
      setTimezoneLocked(album.confirmed_setup_revision !== null);
      setCategories(categoryResult.data.data);
      setState('ready');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || revision === null || !eventName.trim() || !eventLocation.trim() || !categoryId || !timezone.trim()) return;
    try { new Intl.DateTimeFormat(locale, { timeZone: timezone }).format(); }
    catch { setMessage('invalid'); return; }
    setPending(true);
    setMessage(null);
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) {
        if (csrf.status === 401) setState('unauthenticated');
        else if (csrf.status === 403) setState('forbidden');
        else setMessage('error');
        return;
      }
      const result = await patchApiV1AlbumsAlbumId(albumId, {
        expected_revision: revision,
        event_name: eventName,
        event_location: eventLocation,
        event_category_id: categoryId,
        timezone,
      }, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 200) { setRevision(result.data.data.setup_revision); setMessage('saved'); }
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else if (result.status === 409) setMessage('conflict');
      else if (result.status === 422) setMessage('serverValidation');
      else setMessage('error');
    } catch { setMessage('error'); }
    finally { setPending(false); }
  }

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={shared('errorTitle')} description={shared('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  return <form onSubmit={submit} className="max-w-3xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <h2 className="font-semibold">{t('title')}</h2>
    <label htmlFor="event-name" className="mt-5 block text-sm font-semibold">{t('name')}</label>
    <input id="event-name" required value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder={t('namePlaceholder')} className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-base" />
    <label htmlFor="event-location" className="mt-4 block text-sm font-semibold">{t('location')}</label>
    <input id="event-location" required value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} placeholder={t('locationPlaceholder')} className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-base" />
    <fieldset className="mt-5">
      <legend className="text-sm font-semibold">{t('category')}</legend>
      <div role="radiogroup" aria-label={t('category')} className="mt-2 flex flex-wrap gap-2">
        {categories.map((category) => <label key={category.category_id} className={`inline-flex min-h-10 cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${categoryId === category.category_id ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]'}`}>
          <input className="sr-only" type="radio" name="event-category" required checked={categoryId === category.category_id} value={category.category_id} onChange={() => setCategoryId(category.category_id)} />
          {locale === 'en' ? category.label_en : category.label_id}
        </label>)}
      </div>
      {!categories.length && <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t('categoriesEmpty')}</p>}
    </fieldset>
    <label htmlFor="event-timezone" className="mt-5 block text-sm font-semibold">{t('timezone')}</label>
    <input id="event-timezone" required value={timezone} onChange={(event) => setTimezone(event.target.value)} disabled={timezoneLocked} placeholder="Asia/Jakarta" className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-base disabled:opacity-70" />
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{timezoneLocked ? t('timezoneLocked') : t('timezoneHelp')}</p>
    {message && <p role="status" className="mt-3 text-sm text-[var(--color-muted-foreground)]">{t(message)}{message === 'conflict' && <> <button type="button" onClick={() => { setMessage(null); setState('loading'); setAttempt((value) => value + 1); }} className="font-semibold underline">{t('reload')}</button></>}</p>}
    <Button type="submit" loading={pending} disabled={!eventName.trim() || !eventLocation.trim() || !categoryId || !timezone.trim() || revision === null || categories.length === 0} className="mt-6">{t('save')}</Button>
  </form>;
}
