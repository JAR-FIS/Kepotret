'use client';

import { useState } from 'react';

/** Native img deliberately preserves each short-lived Media Gateway URL and its current authorization checks. */
export function DeliveryImage({ src, alt, unavailableLabel, className, loading = 'lazy' }: { src: string; alt: string; unavailableLabel: string; className: string; loading?: 'lazy' | 'eager' }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div role="img" aria-label={unavailableLabel} className={`grid min-h-36 place-items-center bg-[var(--color-muted)] p-4 text-center text-sm text-[var(--color-muted-foreground)] ${className}`}>{unavailableLabel}</div>;
  // eslint-disable-next-line @next/next/no-img-element -- short-lived Media Gateway URLs retain their authorization checks and cannot use a static remote image pattern.
  return <img src={src} alt={alt} loading={loading} decoding="async" className={className} onError={() => setFailed(true)} />;
}
