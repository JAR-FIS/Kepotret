const privateKeyPattern = /authorization|cookie|csrf|token|password|secret|photo|image|media|upload|attachment|payment|pin|ticket|request|response|body|blob|buffer|bytes|base64|payload|gen.?ai/i;
const urlPattern = /(?:https?|blob):\/\/[^\s"'<>]+/gi;
const dataUrlPattern = /data:[^,\s]+;base64,[a-z\d+/=]+/gi;
const bearerPattern = /\bBearer\s+[a-z\d._~+/=-]+/gi;
const sensitiveQueryPattern = /([?&](?:token|access_token|refresh_token|ticket|pin|password|secret|signature|authorization)=)[^&#\s]*/gi;
const sensitiveLabelPattern = /\b(?:pin|password|passcode|csrf(?:_token)?|access[_-]?token|refresh[_-]?token|media[_-]?ticket|authorization)\b\s*[:=]\s*[^\s,;]+/gi;
const base64Pattern = /\b[a-z\d+/]{512,}={0,2}\b/gi;

function scrubString(value: string): string {
  return value
    .replace(urlPattern, '[URL REDACTED]')
    .replace(dataUrlPattern, '[BINARY DATA REDACTED]')
    .replace(bearerPattern, 'Bearer [REDACTED]')
    .replace(sensitiveQueryPattern, '$1[REDACTED]')
    .replace(sensitiveLabelPattern, '[SENSITIVE VALUE REDACTED]')
    .replace(base64Pattern, '[BINARY DATA REDACTED]');
}

function scrubValue(value: unknown): unknown {
  if (typeof value === 'string') return scrubString(value);
  if (
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    (typeof Blob !== 'undefined' && value instanceof Blob)
  ) {
    return '[BINARY DATA REDACTED]';
  }
  if (Array.isArray(value)) return value.map(scrubValue);
  if (value && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (!privateKeyPattern.test(key)) cleaned[key] = scrubValue(nested);
    }
    return cleaned;
  }
  return value;
}

export function sanitizeSentryEvent<T>(event: T): T | null {
  if (!event || typeof event !== 'object') return null;
  const cleaned = scrubValue(event) as Record<string, unknown>;
  delete cleaned.request;
  delete cleaned.user;
  return cleaned as T;
}
