const INDONESIAN_ZONES: Record<string, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Pontianak': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

/** Formats an event timestamp in its persisted IANA zone and appends a truthful zone label. */
export function formatEventDateTime(value: string, locale: string, timeZone?: string | null, dateStyle: Intl.DateTimeFormatOptions['dateStyle'] = 'medium') {
  const date = new Date(value);
  let zone = timeZone || 'UTC';
  try { new Intl.DateTimeFormat(locale, { timeZone: zone }).format(date); }
  catch { zone = 'UTC'; }
  const formatted = new Intl.DateTimeFormat(locale, { dateStyle, timeStyle: 'short', timeZone: zone }).format(date);
  const label = INDONESIAN_ZONES[zone] ?? new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: 'short' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value ?? zone;
  return `${formatted} ${label}`;
}
