'use client';

import { useEffect, useId, useRef } from 'react';

import { Button } from './button';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  disabled = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      dialog.querySelector<HTMLButtonElement>('[data-dialog-cancel]')?.focus();
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onCancel(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-foreground)] shadow-2xl backdrop:bg-black/60"
    >
      <div className="p-5 sm:p-6">
        <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        <p id={descriptionId} className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--color-muted-foreground)]">{description}</p>
        <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button data-dialog-cancel="true" variant="ghost" onClick={onCancel} disabled={disabled}>{cancelLabel}</Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} disabled={disabled}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
}
