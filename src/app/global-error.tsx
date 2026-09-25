'use client';

import { RouteError } from '@/features/system/components/route-error';
import '@/styles/globals.css';

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <html lang="id"><body><RouteError retry={retry} /></body></html>;
}
