'use client';

import { Temporal } from '@js-temporal/polyfill';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, useState } from 'react';

type Position = { top: number; left: number; width: number };

function popupPosition(anchor: HTMLElement, width: number, height: number): Position {
  const rect = anchor.getBoundingClientRect();
  const bottomClearance = window.innerWidth < 640 ? 80 : 8;
  return {
    top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - height - bottomClearance)),
    left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
    width: Math.min(width, window.innerWidth - 16),
  };
}

const fieldClass = 'min-h-11 w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] py-2 pl-3 pr-11 text-base text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] disabled:opacity-60';
const panelClass = 'z-[100] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[var(--color-foreground)] shadow-[var(--shadow-soft)]';
const iconClass = 'absolute inset-y-0 right-1 my-auto inline-flex size-9 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] disabled:opacity-60';

function useOutsideClose(open: boolean, root: React.RefObject<HTMLDivElement | null>, popup: React.RefObject<HTMLDivElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !popup.current?.contains(target)) close();
    };
    document.addEventListener('pointerdown', pointer);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', pointer);
      window.removeEventListener('resize', close);
    };
  }, [open, root, popup, close]);
}

type CommonProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  description?: string;
};

export function DatePicker({ label, value, onChange, min, max, today, disabled, required, description }: CommonProps & { min?: string; max?: string; today?: string }) {
  const t = useTranslations('host.picker');
  const locale = useLocale();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, width: 320 });
  const [month, setMonth] = useState(() => Temporal.Now.plainDateISO().with({ day: 1 }));
  const [focusDate, setFocusDate] = useState('');
  useOutsideClose(open, root, popup, () => setOpen(false));

  function isDisabled(date: string) { return Boolean((min && date < min) || (max && date > max)); }
  function show() {
    if (disabled || !root.current) return;
    let selected: Temporal.PlainDate;
    try { selected = Temporal.PlainDate.from(value || min || today || Temporal.Now.plainDateISO().toString()); }
    catch { selected = Temporal.Now.plainDateISO(); }
    const focused = min && selected.toString() < min ? Temporal.PlainDate.from(min) : max && selected.toString() > max ? Temporal.PlainDate.from(max) : selected;
    setMonth(focused.with({ day: 1 }));
    setFocusDate(focused.toString());
    setPosition(popupPosition(root.current, 320, 390));
    setOpen(true);
  }
  useEffect(() => {
    if (open && focusDate) popup.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
  }, [open, focusDate, month]);

  function moveDay(event: React.KeyboardEvent<HTMLButtonElement>, date: string) {
    const increments: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); input.current?.focus(); return; }
    const delta = increments[event.key];
    if (delta === undefined && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    let next = Temporal.PlainDate.from(date).add({ days: delta ?? (event.key === 'Home' ? -(Temporal.PlainDate.from(date).dayOfWeek - 1) : 7 - Temporal.PlainDate.from(date).dayOfWeek) });
    for (let count = 0; count < 371 && isDisabled(next.toString()); count++) next = next.add({ days: delta < 0 || event.key === 'Home' ? -1 : 1 });
    if (isDisabled(next.toString())) return;
    setMonth(next.with({ day: 1 }));
    setFocusDate(next.toString());
  }

  const firstWeekday = month.dayOfWeek - 1;
  const days = Array.from({ length: month.daysInMonth }, (_, index) => month.with({ day: index + 1 }));
  const weekdayNames = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(Date.UTC(2024, 0, 1 + index))));
  const previous = month.subtract({ months: 1 });
  const next = month.add({ months: 1 });
  const canPrevious = !min || previous.add({ months: 1 }).subtract({ days: 1 }).toString() >= min;
  const canNext = !max || next.toString() <= max;

  return <div ref={root} className="min-w-0">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <div className="relative mt-2">
      <input ref={input} id={id} type="text" inputMode="numeric" autoComplete="off" placeholder="YYYY-MM-DD" maxLength={10} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'ArrowDown' && event.altKey) { event.preventDefault(); show(); } }} aria-describedby={description ? `${id}-description` : undefined} required={required} disabled={disabled} className={fieldClass} />
      <button type="button" aria-label={t('openCalendar', { label })} aria-expanded={open} aria-haspopup="dialog" aria-controls={`${id}-calendar`} disabled={disabled} onClick={() => open ? setOpen(false) : show()} className={iconClass}><CalendarDays size={18} aria-hidden="true" /></button>
    </div>
    {description && <p id={`${id}-description`} className="mt-1 text-xs text-[var(--color-muted-foreground)]">{description}</p>}
    {open && createPortal(<div ref={popup} id={`${id}-calendar`} role="dialog" aria-label={t('calendarFor', { label })} style={{ position: 'fixed', ...position }} className={panelClass} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); input.current?.focus(); } }}>
      <div className="mb-3 flex items-center justify-between gap-2"><strong className="font-[family-name:var(--font-display)] text-base">{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(Date.UTC(month.year, month.month - 1, 1)))}</strong><div className="flex gap-1"><button type="button" aria-label={t('previousMonth')} disabled={!canPrevious} onClick={() => setMonth(previous)} className="rounded-lg p-2 hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] disabled:opacity-35"><ChevronLeft size={18} /></button><button type="button" aria-label={t('nextMonth')} disabled={!canNext} onClick={() => setMonth(next)} className="rounded-lg p-2 hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] disabled:opacity-35"><ChevronRight size={18} /></button></div></div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--color-muted-foreground)]">{weekdayNames.map((day, index) => <span key={index} aria-hidden="true" className="py-2">{day}</span>)}</div>
      <div role="grid" aria-label={t('calendarFor', { label })}>{Array.from({ length: Math.ceil((firstWeekday + days.length) / 7) }, (_, week) => <div role="row" key={week} className="grid grid-cols-7 gap-1">{Array.from({ length: 7 }, (_, weekday) => { const day = days[week * 7 + weekday - firstWeekday]; if (!day) return <span key={weekday} role="gridcell" aria-hidden="true" className="size-9" />; const date = day.toString(); const selected = date === value; return <button key={date} type="button" role="gridcell" data-date={date} aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date(Date.UTC(day.year, day.month - 1, day.day)))} aria-selected={selected} aria-current={date === today ? 'date' : undefined} disabled={isDisabled(date)} onKeyDown={(event) => moveDay(event, date)} onClick={() => { onChange(date); setOpen(false); input.current?.focus(); }} className={`size-9 rounded-full text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-30 ${selected ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'hover:bg-[var(--color-muted)]'} ${date === today ? 'ring-1 ring-[var(--color-primary)]' : ''}`}>{day.day}</button>; })}</div>)}</div>
    </div>, document.body)}
  </div>;
}

export function TimePicker({ label, value, onChange, isTimeDisabled, isHourDisabled, disabled, required, description }: CommonProps & { isTimeDisabled: (time: string) => boolean; isHourDisabled: (hour: string) => boolean }) {
  const t = useTranslations('host.picker');
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, width: 280 });
  const [hour, setHour] = useState('00');
  useOutsideClose(open, root, popup, () => setOpen(false));
  function show() {
    if (disabled || !root.current) return;
    const preferred = /^([01]\d|2[0-3]):/.test(value) ? value.slice(0, 2) : '00';
    setHour(isHourDisabled(preferred) ? Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')).find((candidate) => !isHourDisabled(candidate)) ?? preferred : preferred);
    setPosition(popupPosition(root.current, 280, 330));
    setOpen(true);
  }
  useEffect(() => {
    if (open) popup.current?.querySelector<HTMLButtonElement>(`[data-hour="${hour}"]`)?.focus();
  }, [open, hour]);
  function arrow(event: React.KeyboardEvent<HTMLButtonElement>, selector: string) {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); input.current?.focus(); return; }
    if (event.key === 'ArrowRight' && selector === '[data-hour]') {
      event.preventDefault();
      popup.current?.querySelector<HTMLButtonElement>('[data-minute]:not(:disabled)')?.focus();
      return;
    }
    if (event.key === 'ArrowLeft' && selector === '[data-minute]') {
      event.preventDefault();
      popup.current?.querySelector<HTMLButtonElement>(`[data-hour="${hour}"]`)?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(popup.current?.querySelectorAll<HTMLButtonElement>(selector) ?? []).filter((button) => !button.disabled);
    const index = buttons.indexOf(event.currentTarget);
    const target = event.key === 'Home' ? buttons[0] : event.key === 'End' ? buttons.at(-1) : buttons[index + (event.key === 'ArrowDown' ? 1 : -1)];
    target?.focus();
  }
  return <div ref={root} className="min-w-0">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <div className="relative mt-2"><input ref={input} id={id} type="text" inputMode="numeric" autoComplete="off" placeholder="HH:mm" maxLength={5} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'ArrowDown' && event.altKey) { event.preventDefault(); show(); } }} aria-describedby={description ? `${id}-description` : undefined} required={required} disabled={disabled} className={fieldClass} /><button type="button" aria-label={t('openTime', { label })} aria-expanded={open} aria-haspopup="dialog" aria-controls={`${id}-time`} disabled={disabled} onClick={() => open ? setOpen(false) : show()} className={iconClass}><Clock3 size={18} aria-hidden="true" /></button></div>
    {description && <p id={`${id}-description`} className="mt-1 text-xs text-[var(--color-muted-foreground)]">{description}</p>}
    {open && createPortal(<div ref={popup} id={`${id}-time`} role="dialog" aria-label={t('timeFor', { label })} style={{ position: 'fixed', ...position }} className={panelClass} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); input.current?.focus(); } }}>
      <p className="mb-3 text-sm font-semibold">{t('timeFor', { label })}</p><div className="grid grid-cols-2 gap-3"><div role="group" aria-label={t('hour')}><p className="mb-1 text-xs font-bold text-[var(--color-muted-foreground)]">{t('hour')}</p><div className="max-h-52 overflow-y-auto rounded-xl border border-[var(--color-border)] p-1">{Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')).map((choice) => <button key={choice} type="button" data-hour={choice} aria-pressed={hour === choice} disabled={isHourDisabled(choice)} onKeyDown={(event) => arrow(event, '[data-hour]')} onClick={() => setHour(choice)} className={`block min-h-9 w-full rounded-lg text-center text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] disabled:opacity-30 ${hour === choice ? 'bg-[var(--color-primary)] font-bold text-[var(--color-primary-foreground)]' : 'hover:bg-[var(--color-muted)]'}`}>{choice}</button>)}</div></div><div role="group" aria-label={t('minute')}><p className="mb-1 text-xs font-bold text-[var(--color-muted-foreground)]">{t('minute')}</p><div className="max-h-52 overflow-y-auto rounded-xl border border-[var(--color-border)] p-1">{Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0')).map((choice) => <button key={choice} type="button" data-minute={choice} aria-pressed={value === `${hour}:${choice}`} disabled={isTimeDisabled(`${hour}:${choice}`)} onKeyDown={(event) => arrow(event, '[data-minute]')} onClick={() => { onChange(`${hour}:${choice}`); setOpen(false); input.current?.focus(); }} className={`block min-h-9 w-full rounded-lg text-center text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] disabled:opacity-30 ${value === `${hour}:${choice}` ? 'bg-[var(--color-primary)] font-bold text-[var(--color-primary-foreground)]' : 'hover:bg-[var(--color-muted)]'}`}>{choice}</button>)}</div></div></div>
    </div>, document.body)}
  </div>;
}
