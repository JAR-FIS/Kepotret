import type { Instrumentation } from 'next';

import { isSentryEnabled } from '@/lib/observability/sentry-options';

export async function register() {
  if (!isSentryEnabled()) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/lib/observability/sentry-node');
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    await import('@/lib/observability/sentry-edge');
  }
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!isSentryEnabled()) return;
  const { captureRequestError } = await import('@sentry/nextjs');
  captureRequestError(...args);
};
