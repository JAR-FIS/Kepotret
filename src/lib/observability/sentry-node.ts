import * as Sentry from '@sentry/nextjs';

import { sentryPrivacyOptions } from './sentry-options';

Sentry.init({
  ...sentryPrivacyOptions,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
