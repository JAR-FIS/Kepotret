'use client';

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MessageCircle, Send, X } from 'lucide-react';
import { postApiV1AiAssistant } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { getGuestCameraActiveSnapshot, subscribeGuestCameraActive } from '@/features/guest/lib/camera-visibility';

type Turn = { role: 'user' | 'assistant'; content: string };

export function Assistant() {
  const t = useTranslations('aiAssistant');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'unauthenticated' | 'forbidden' | 'unavailable' | 'rateLimited' | 'error'>('idle');
  const guestCameraActive = useSyncExternalStore(subscribeGuestCameraActive, getGuestCameraActiveSnapshot, () => false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list && typeof list.scrollTo === 'function') list.scrollTo({ top: list.scrollHeight });
  }, [turns, state, open]);

  const isGuestEntry = /^\/j\/[^/]+\/?$/.test(pathname);
  const isCritical = pathname.includes('/sensitive-access') || pathname.includes('/checkout/') || pathname.includes('/pembayaran/');

  if ((isGuestEntry && guestCameraActive) || isCritical) return null;

  async function sendMessage(event?: FormEvent<HTMLFormElement>, prompt?: string) {
    event?.preventDefault();
    const message = (prompt ?? text).trim();
    if (!message || state === 'loading') return;
    setText('');
    setState('loading');
    const recent = turns.slice(-6);
    setTurns((current) => [...current, { role: 'user' as const, content: message }].slice(-6));
    try {
      const result = await postApiV1AiAssistant({ message, recent_turns: recent });
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

  return <div className="fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5">
    {open && <>
      <section id="assistant-dialog" role="dialog" aria-modal="true" aria-labelledby="assistant-title" className="fixed inset-0 z-50 flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)] sm:inset-y-4 sm:left-auto sm:right-4 sm:w-[min(26rem,calc(100vw-2rem))] sm:rounded-2xl sm:border sm:border-[var(--color-border)] sm:bg-[var(--color-surface)] sm:shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 pt-[max(.75rem,env(safe-area-inset-top))] sm:rounded-t-2xl">
          <div><h2 id="assistant-title" className="font-semibold">{t('title')}</h2><p className="text-xs text-[var(--color-muted-foreground)]">{t('contextNotice')}</p></div>
          <button type="button" aria-label={t('close')} onClick={() => setOpen(false)} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-muted)]"><X size={19} aria-hidden="true" /></button>
        </header>
        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {!turns.length && <div className="space-y-3"><p className="text-sm leading-6">{t('intro')}</p><div className="flex flex-wrap gap-2">{(['promptOne', 'promptTwo', 'promptThree'] as const).map((key) => <button key={key} type="button" disabled={state === 'loading'} onClick={() => void sendMessage(undefined, t(key))} className="rounded-full border border-[var(--color-border)] px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)]">{t(key)}</button>)}</div></div>}
          {turns.map((turn, index) => <p key={`${index}-${turn.role}`} className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${turn.role === 'user' ? 'ml-auto bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'bg-[var(--color-muted)]'}`}>{turn.content}</p>)}
          {state === 'loading' && <p role="status" className="text-sm text-[var(--color-muted-foreground)]">{t('loading')}</p>}
          {state === 'unavailable' && <p role="status" className="rounded-xl bg-[var(--color-muted)] p-3 text-sm">{t('unavailable')}</p>}
          {state === 'rateLimited' && <p role="status" className="rounded-xl bg-[var(--color-muted)] p-3 text-sm">{t('rateLimited')}</p>}
          {state === 'unauthenticated' && <p role="status" className="rounded-xl bg-[var(--color-muted)] p-3 text-sm">{t('unauthenticated')}</p>}
          {state === 'forbidden' && <p role="status" className="rounded-xl bg-[var(--color-muted)] p-3 text-sm">{t('forbidden')}</p>}
          {state === 'error' && <p role="alert" className="rounded-xl bg-[var(--color-muted)] p-3 text-sm">{t('error')}</p>}
        </div>
        <form onSubmit={(event) => void sendMessage(event)} className="flex shrink-0 items-end gap-2 border-t border-[var(--color-border)] p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:rounded-b-2xl">
          <label className="sr-only" htmlFor="assistant-message">{t('messageLabel')}</label>
          <textarea id="assistant-message" value={text} onChange={(event) => setText(event.target.value.slice(0, 2000))} maxLength={2000} rows={2} placeholder={t('placeholder')} disabled={state === 'loading'} className="min-h-12 flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm" />
          <Button type="submit" aria-label={t('send')} disabled={!text.trim() || state === 'loading'} className="min-h-12 min-w-12 px-3"><Send size={17} aria-hidden="true" /></Button>
        </form>
      </section>
      <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" aria-hidden="true" onClick={() => setOpen(false)} />
    </>}
    <button type="button" aria-expanded={open} aria-controls={open ? 'assistant-dialog' : undefined} onClick={() => setOpen((value) => !value)} aria-label={open ? t('close') : t('open')} className="relative z-[60] inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] shadow-[var(--shadow-soft)] hover:brightness-95"><MessageCircle size={19} aria-hidden="true" /><span>{open ? t('close') : t('open')}</span></button>
  </div>;
}
