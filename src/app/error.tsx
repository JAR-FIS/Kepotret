'use client';

import { RouteError } from '@/features/system/components/route-error';

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError retry={retry} />;
}
