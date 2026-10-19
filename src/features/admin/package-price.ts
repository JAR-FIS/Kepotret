/** Keep the UI's grouping separators separate from the API's integer amount. */
export function parseIdrPrice(value: string): number | null {
  const trimmed = value.trim().replace(/^Rp\s*/i, '');
  if (!/^\d+$/.test(trimmed) && !/^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/.test(trimmed)) return null;
  const amount = Number(trimmed.replace(/[.,]/g, ''));
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function formatIdrPriceInput(value: string, locale: 'id' | 'en'): string {
  const amount = parseIdrPrice(value);
  return amount === null ? value : new Intl.NumberFormat(locale).format(amount);
}

/** Typing and deleting inside an already grouped value can temporarily break its grouping. */
export function normalizeIdrPriceEdit(value: string, inputType = '', inserted = ''): string {
  if (/^[\d.,\s]*$/.test(value) && ((inputType === 'insertText' && /^\d+$/.test(inserted)) || inputType.startsWith('deleteContent'))) {
    return value.replace(/[.,\s]/g, '');
  }
  const amount = parseIdrPrice(value);
  return amount === null ? value : String(amount);
}
