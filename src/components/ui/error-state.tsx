import { Button } from './button';
import { StatusIndicator } from './status-indicator';

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
}: {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <StatusIndicator status="error">
      <h2 className="font-semibold text-[var(--color-foreground)]">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">{description}</p>
      <Button variant="secondary" className="mt-4" onClick={onRetry}>{retryLabel}</Button>
    </StatusIndicator>
  );
}
