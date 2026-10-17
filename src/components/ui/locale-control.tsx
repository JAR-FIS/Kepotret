'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { useAppLocale } from '@/providers/locale-provider';

export function LocaleControl({
  label,
  indonesianLabel,
  englishLabel,
}: {
  label: string;
  indonesianLabel: string;
  englishLabel: string;
}) {
  const { locale, setLocale } = useAppLocale();
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(locale === 'id' ? 0 : 1);
  const selectedIndex = locale === 'id' ? 0 : 1;
  const options = [
    { value: 'id' as const, short: 'ID', label: indonesianLabel },
    { value: 'en' as const, short: 'ENG', label: englishLabel },
  ];

  useEffect(() => {
    if (!open) return;
    listboxRef.current?.focus();
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  const choose = (index: number) => {
    setLocale(options[index]!.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleListboxKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label}: ${options[selectedIndex]!.short}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        title={options[selectedIndex]!.label}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex(selectedIndex);
            setOpen(true);
          }
        }}
        className="inline-flex min-h-11 min-w-[5rem] items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
      >
        {options[selectedIndex]!.short}
        <ChevronDown aria-hidden="true" size={14} className={`transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        ref={listboxRef}
        id={`${id}-listbox`}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`${id}-option-${activeIndex}`}
        tabIndex={-1}
        hidden={!open}
        onKeyDown={handleListboxKeyDown}
        className="absolute right-0 top-full z-50 mt-2 min-w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-[var(--color-foreground)] shadow-[var(--shadow-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            id={`${id}-option-${index}`}
            role="option"
            aria-label={option.label}
            aria-selected={selectedIndex === index}
            onPointerMove={() => setActiveIndex(index)}
            onClick={() => choose(index)}
            className={`flex min-h-10 cursor-pointer items-center rounded-full px-3 text-sm font-semibold outline-none ${activeIndex === index ? 'bg-[var(--color-muted)]' : ''} ${selectedIndex === index ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}
          >
            {option.short}
          </div>
        ))}
      </div>
    </div>
  );
}
