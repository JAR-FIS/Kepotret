import type { ReactNode } from 'react';

type StatusMessageProps = {
  children: ReactNode;
};

export function StatusMessage({ children }: StatusMessageProps) {
  return (
    <p role="status" aria-live="polite">
      {children}
    </p>
  );
}
