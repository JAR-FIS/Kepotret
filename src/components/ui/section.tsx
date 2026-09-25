import type { HTMLAttributes } from 'react';

export function Section({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`py-12 sm:py-20 ${className}`} {...props} />;
}
