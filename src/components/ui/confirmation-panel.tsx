import { useId } from 'react';

import { Button } from './button';
import { Surface } from './surface';

export function ConfirmationPanel({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
  disabled = false,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <Surface role="group" aria-labelledby={titleId} aria-describedby={descriptionId} className="p-5 sm:p-6">
      <h2 id={titleId} className="font-semibold">{title}</h2>
      <p id={descriptionId} className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{description}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={disabled}>{cancelLabel}</Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} disabled={disabled}>{confirmLabel}</Button>
      </div>
    </Surface>
  );
}
