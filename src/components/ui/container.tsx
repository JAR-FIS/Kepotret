import type { HTMLAttributes } from 'react';

export function Container({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mx-auto w-full min-w-0 max-w-6xl px-5 sm:px-8 ${className}`} {...props} />;
}
