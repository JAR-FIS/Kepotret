import { sanitizeSentryEvent } from './sanitize-event';

export const sentryPrivacyOptions = {
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
    frameContextLines: 0,
  },
  tracesSampleRate: 0,
  sendClientReports: false,
  beforeSend: sanitizeSentryEvent,
};

export function isSentryEnabled() {
  return (
    process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true' &&
    Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim())
  );
}
