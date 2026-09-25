import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthPageFrame({ children }: { children: ReactNode }) {
  return <main className="grid min-h-[calc(100vh-0px)] place-items-center bg-[var(--color-surface-muted)] px-4 py-10">
    <div className="w-full max-w-lg">
      <Link href="/" aria-label="Kepotret" className="mx-auto mb-6 flex w-fit rounded-sm"><Image src="/brand/logo.svg" alt="Kepotret" width={146} height={48} className="h-10 w-[132px] object-contain dark:invert" /></Link>
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] sm:p-9">{children}</section>
      <Link href="/" className="mx-auto mt-5 inline-flex min-h-11 w-fit items-center text-sm font-semibold text-[var(--color-muted-foreground)] hover:underline">← {`Kepotret`}</Link>
    </div>
  </main>;
}
