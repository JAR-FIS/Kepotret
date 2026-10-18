'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

export type SelectOption = { value: string; label: string };

export function Select({
  id: providedId,
  label,
  value,
  options,
  onValueChange,
  disabled = false,
  required = false,
  className = '',
  placeholder,
}: {
  id?: string;
  label: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.findIndex((option) => option.value === value)));
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const [horizontalPlacement, setHorizontalPlacement] = useState<'start' | 'end'>('start');
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    if (!open) return;
    listboxRef.current?.focus();
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, id, open]);

  function openAt(index: number) {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const estimatedMenuHeight = Math.min(options.length * 44 + 12, 240);
      setPlacement(window.innerHeight - rect.bottom < estimatedMenuHeight && rect.top > window.innerHeight - rect.bottom ? 'top' : 'bottom');
      setHorizontalPlacement(rect.left + Math.min(Math.max(rect.width, 176), window.innerWidth - 32) > window.innerWidth - 16 ? 'end' : 'start');
    }
    setActiveIndex(index >= 0 ? index : 0);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onValueChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleListboxKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
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
  }

  return <div ref={rootRef} className="relative min-w-0">
    <button
      ref={triggerRef}
      id={id}
      type="button"
      role="combobox"
      aria-label={label}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
      aria-required={required || undefined}
      disabled={disabled}
      onClick={() => open ? setOpen(false) : openAt(selectedIndex)}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          openAt(selectedIndex);
        }
      }}
      className={`inline-flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-left text-sm font-medium text-[var(--color-foreground)] shadow-sm transition-colors enabled:hover:bg-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <span className="min-w-0 truncate">{selected?.label ?? placeholder ?? ''}</span>
      <ChevronDown aria-hidden="true" size={16} className={`shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
    </button>
    <div
      ref={listboxRef}
      id={listboxId}
      role="listbox"
      aria-label={label}
      aria-activedescendant={`${id}-option-${activeIndex}`}
      hidden={!open}
      tabIndex={-1}
      onKeyDown={handleListboxKeyDown}
      className={`absolute ${placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${horizontalPlacement === 'end' ? 'right-0' : 'left-0'} z-50 max-h-[min(15rem,calc(100dvh-2rem))] w-full min-w-[min(11rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-[var(--color-foreground)] shadow-[var(--shadow-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]`}
    >
      {options.map((option, index) => <div
        key={option.value}
        id={`${id}-option-${index}`}
        role="option"
        aria-selected={selectedIndex === index}
        data-active={activeIndex === index || undefined}
        onPointerMove={() => setActiveIndex(index)}
        onClick={() => choose(index)}
        className={`flex min-h-10 cursor-pointer items-center rounded-xl px-3 text-sm outline-none transition-colors hover:bg-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] ${selectedIndex === index ? 'bg-[var(--color-primary)] font-semibold text-[var(--color-primary-foreground)]' : 'text-[var(--color-foreground)]'} ${activeIndex === index ? 'ring-1 ring-inset ring-[var(--color-border)]' : ''}`}
      >{option.label}</div>)}
    </div>
  </div>;
}
