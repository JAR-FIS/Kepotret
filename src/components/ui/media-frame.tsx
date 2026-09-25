import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export function MediaFrame({
  aspectRatio = '4 / 3',
  children,
  className = '',
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  aspectRatio?: CSSProperties['aspectRatio'];
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative min-w-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] ${className}`}
      style={{ aspectRatio, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
