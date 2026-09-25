import * as Sentry from '@sentry/nextjs';

import { isSentryEnabled, sentryPrivacyOptions } from '@/lib/observability/sentry-options';

if (isSentryEnabled()) {
  Sentry.init({
    ...sentryPrivacyOptions,
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
  });
}
