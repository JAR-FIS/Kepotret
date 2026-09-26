import type { AlbumSummary } from '@/lib/api/generated/index.schemas';

export function albumStatusKey(album: AlbumSummary) {
  if (album.readiness === 'READY') return 'ready';
  if (album.readiness === 'PAYMENT_PENDING') return 'paymentPending';
  if (album.capture_state === 'CLOSED') return 'ended';
  return 'draft';
}

export function AlbumStatus({ album, label }: { album: AlbumSummary; label: string }) {
  const ready = album.readiness === 'READY';
  return (
    <span className="inline-flex min-h-7 items-center gap-2 rounded-full border border-[var(--color-border)] px-3 text-xs font-semibold">
      <span aria-hidden="true" className={`size-2 rounded-full ${ready ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-muted-foreground)]'}`} />
      {label}
    </span>
  );
}
