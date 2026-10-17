'use client';

import { useMemo, useState } from 'react';

const supportedTimeZones = typeof Intl.supportedValuesOf === 'function'
  ? Intl.supportedValuesOf('timeZone')
  : ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC'];

export function TimezonePicker({ id, label, value, onChange, disabled = false, help, placeholder = 'Asia/Jakarta', describedBy, invalid = false }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  help?: string;
  placeholder?: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const options = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();
    return (query ? supportedTimeZones.filter((zone) => zone.toLocaleLowerCase().includes(query)) : supportedTimeZones).slice(0, 8);
  }, [value]);
  const listId = `${id}-options`;

  function choose(zone: string) {
    onChange(zone);
    setOpen(false);
    setActiveIndex(0);
  }

  return <div className="relative">
    <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
    <input id={id} role="combobox" aria-autocomplete="list" aria-controls={listId} aria-expanded={open && !disabled}
      aria-activedescendant={open && options[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
      aria-describedby={describedBy} aria-invalid={invalid || undefined}
      autoComplete="off" required disabled={disabled} value={value} placeholder={placeholder}
      onFocus={() => { if (!disabled) setOpen(true); }}
      onChange={(event) => { onChange(event.target.value); setOpen(true); setActiveIndex(0); }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, options.length - 1)); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.max(index - 1, 0)); }
        else if (event.key === 'Enter' && open && options[activeIndex]) { event.preventDefault(); choose(options[activeIndex]); }
        else if (event.key === 'Escape') setOpen(false);
      }}
      onBlur={() => window.setTimeout(() => setOpen(false), 0)}
      className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-base disabled:opacity-70" />
    {open && !disabled && options.length > 0 && <ul id={listId} role="listbox" aria-label={label} className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-lg">
      {options.map((zone, index) => <li key={zone} id={`${id}-option-${index}`} role="option" aria-selected={zone === value}
        onMouseDown={(event) => event.preventDefault()} onClick={() => choose(zone)}
        className={`cursor-pointer rounded px-3 py-2 text-sm ${index === activeIndex ? 'bg-[var(--color-muted)]' : ''}`}>{zone}</li>)}
    </ul>}
    {help && <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{help}</p>}
  </div>;
}
