'use client';

import { FormEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bot, Send, X } from 'lucide-react';
import { postApiV1AiAssistant } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { getGuestCameraActiveSnapshot, subscribeGuestCameraActive } from '@/features/guest/lib/camera-visibility';

type Turn = { role: 'user' | 'assistant'; content: string };

export function Assistant() {
  const t = useTranslations('aiAssistant');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [text, setText] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'unauthenticated' | 'forbidden' | 'unavailable' | 'rateLimited' | 'error'>('idle');
  const guestCameraActive = useSyncExternalStore(subscribeGuestCameraActive, getGuestCameraActiveSnapshot, () => false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);

  const context = getAssistantContext(pathname);

  function openPanel() {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    setPanelMounted(true);
    setOpen(true);
  }

  const closePanel = useCallback(() => {
    setOpen(false);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reducedMotion) {
      setPanelMounted(false);
      return;
    }
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setPanelMounted(false);
      closeTimerRef.current = null;
    }, 200);
  }, []);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      inputRef.current?.focus();
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      launcherRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closePanel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closePanel, open]);

  useEffect(() => {
    const list = listRef.current;
    if (list && typeof list.scrollTo === 'function') list.scrollTo({ top: list.scrollHeight });
  }, [turns, state, open]);

  if (shouldHideAssistant(pathname, guestCameraActive)) return null;

  async function sendMessage(event?: FormEvent<HTMLFormElement>, prompt?: string) {
    event?.preventDefault();
    const message = (prompt ?? text).trim();
    if (!message || state === 'loading') return;
    setText('');
    setState('loading');
    const recent = turns.slice(-6);
    setTurns((current) => [...current, { role: 'user' as const, content: message }].slice(-6));
    try {
      const result = await postApiV1AiAssistant({ context, message, recent_turns: recent });
      if (result.status === 200) {
        setTurns((current) => [...current, { role: 'assistant' as const, content: result.data.data.answer }].slice(-6));
        setState('idle');
      } else if (result.status === 429) setState('rateLimited');
      else if (result.status === 503) setState('unavailable');
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    } catch { setState('unavailable'); }
  }

  return <div className="fixed bottom-4 right-4 z-[60] sm:bottom-5 sm:right-5">
    {panelMounted && <>
      <section id="assistant-dialog" role="dialog" aria-labelledby="assistant-title" aria-hidden={!open} inert={!open} className={`fixed inset-x-2 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex h-[min(42rem,calc(100dvh-7rem-env(safe-area-inset-bottom)))] max-h-none flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-foreground)] shadow-2xl transition-[opacity,transform] duration-200 ease-out motion-reduce:duration-0 sm:inset-auto sm:bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:right-5 sm:h-[min(42rem,calc(100dvh-6rem))] sm:w-[min(28rem,calc(100vw-2rem))] ${open ? 'translate-y-0 scale-100 opacity-100 motion-safe:animate-[assistant-enter_200ms_ease-out]' : 'pointer-events-none translate-y-3 scale-[.98] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100'}`}>
        <header className="flex shrink-0 items-center justify-between gap-3 bg-[var(--color-primary)] px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] text-[var(--color-primary-foreground)] sm:pt-4">
          <div><h2 id="assistant-title" className="font-[family-name:var(--font-display)] font-bold">{t('title')}</h2><p className="mt-1 text-xs opacity-80">{t('contextNotice')}</p></div>
          <button type="button" aria-label={t('close')} onClick={closePanel} className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/10 hover:bg-black/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"><X size={19} aria-hidden="true" /></button>
        </header>
        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" aria-live="polite">
          {!turns.length && <div className="space-y-4"><p className="max-w-[90%] rounded-2xl rounded-bl-md bg-[var(--color-surface)] px-4 py-3 text-sm leading-6 shadow-sm">{t('intro')}</p><div className="flex flex-wrap gap-2">{(['promptOne', 'promptTwo', 'promptThree'] as const).map((key) => <button key={key} type="button" disabled={state === 'loading'} onClick={() => void sendMessage(undefined, t(key))} className="min-h-11 cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left text-sm shadow-sm transition-colors hover:bg-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed">{t(key)}</button>)}</div></div>}
          {turns.map((turn, index) => <p key={`${index}-${turn.role}`} className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${turn.role === 'user' ? 'ml-auto rounded-br-md bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'rounded-bl-md bg-[var(--color-surface)]'}`}>{turn.content}</p>)}
          {state === 'loading' && <p role="status" className="text-sm text-[var(--color-muted-foreground)]">{t('loading')}</p>}
          {state === 'unavailable' && <p role="status" className="rounded-xl bg-[var(--color-muted)] p-3 text-sm">{t('unavailable')}</p>}
          {state === 'rateLimited' && <p role="status" className="rounded-xl bg-[var(--color-muted)] p-3 text-sm">{t('rateLimited')}</p>}
          {state === 'unauthenticated' && <p role="status" className="rounded-xl bg-[var(--color-muted)] p-3 text-sm">{t('unauthenticated')}</p>}
          {state === 'forbidden' && <p role="status" className="rounded-xl bg-[var(--color-muted)] p-3 text-sm">{t('forbidden')}</p>}
          {state === 'error' && <p role="alert" className="rounded-xl bg-[var(--color-muted)] p-3 text-sm">{t('error')}</p>}
        </div>
        <form onSubmit={(event) => void sendMessage(event)} className="flex w-full min-w-0 shrink-0 items-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:p-4">
          <label className="sr-only" htmlFor="assistant-message">{t('messageLabel')}</label>
          <textarea ref={inputRef} id="assistant-message" value={text} onChange={(event) => setText(event.target.value.slice(0, 2000))} maxLength={2000} rows={2} placeholder={t('placeholder')} disabled={state === 'loading'} className="min-h-12 min-w-0 flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed" />
          <Button type="submit" aria-label={t('send')} disabled={!text.trim() || state === 'loading'} className="min-h-12 min-w-12 shrink-0 px-3"><Send size={17} aria-hidden="true" /></Button>
        </form>
      </section>
      <div className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 motion-reduce:duration-0 sm:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} aria-hidden="true" onClick={closePanel} />
    </>}
    <button ref={launcherRef} type="button" aria-expanded={open} aria-controls="assistant-dialog" aria-label={open ? t('close') : t('open')} onClick={() => open ? closePanel() : openPanel()} className="relative inline-flex size-14 cursor-pointer items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[0_8px_26px_rgb(10_10_10_/_22%)] ring-4 ring-[var(--color-primary)]/20 transition-[transform,filter] duration-200 hover:scale-105 hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus)] motion-reduce:transition-none">
      <Bot size={25} strokeWidth={2.2} aria-hidden="true" />
      <span aria-hidden="true" className="absolute right-0.5 top-0.5 size-3 rounded-full border-2 border-[var(--color-surface)] bg-[#0a0a0a]" />
    </button>
  </div>;
}

export function getAssistantContext(pathname: string) {
  if (/^\/j\/[^/]+(?:\/.*)?$/.test(pathname)) return { surface: 'GUEST' as const };
  if (/^\/admin(?:\/|$)/.test(pathname)) {
    const albumId = pathname.match(/^\/admin\/albums\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i)?.[1];
    return albumId ? { surface: 'ADMIN' as const, album_id: albumId } : { surface: 'ADMIN' as const };
  }
  const albumId = pathname.match(/^\/album\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i)?.[1];
  if (albumId) return { surface: 'USER' as const, album_id: albumId };
  if (/^\/(?:album|dashboard|kolaborasi|akun)(?:\/|$)/.test(pathname)) return { surface: 'USER' as const };
  return { surface: 'PUBLIC' as const };
}

export function shouldHideAssistant(pathname: string, guestCameraActive: boolean) {
  const isGuestEntry = /^\/j\/[^/]+\/?$/.test(pathname);
  const isAdminPreSessionOrDenied = /^\/admin\/(?:masuk|mfa|akses-ditolak)\/?$/.test(pathname);
  const isAdminPrivilegedFlow = /^\/admin\/albums\/[^/]+\/(?:sensitive-access|hold)\/?$/.test(pathname);
  const isCritical = pathname.includes('/sensitive-access') || pathname.includes('/checkout/') || pathname.includes('/pembayaran/');

  return isAdminPreSessionOrDenied || isAdminPrivilegedFlow || (isGuestEntry && guestCameraActive) || isCritical;
}
