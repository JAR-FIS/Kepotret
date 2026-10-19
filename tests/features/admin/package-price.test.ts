import { describe, expect, it } from 'vitest';
import { formatIdrPriceInput, normalizeIdrPriceEdit, parseIdrPrice } from '@/features/admin/package-price';

describe('Admin IDR package price entry', () => {
  it('formats typing and accepts pasted IDR grouping without changing the integer', () => {
    expect(formatIdrPriceInput('75000', 'id')).toBe('75.000');
    expect(formatIdrPriceInput('75000', 'en')).toBe('75,000');
    expect(formatIdrPriceInput('Rp 75.000', 'id')).toBe('75.000');
    expect(parseIdrPrice('75.000')).toBe(75000);
    expect(parseIdrPrice('75,000')).toBe(75000);
    expect(parseIdrPrice('0')).toBe(0);
  });

  it('rejects invalid, fractional, negative, and unsafe amounts', () => {
    for (const input of ['', '12.5', '12,5', '-1', 'abc75000', '1.2345', '1.000,000', '9007199254740992']) {
      expect(parseIdrPrice(input)).toBeNull();
      expect(formatIdrPriceInput(input, 'id')).toBe(input);
    }
  });

  it('keeps digit edits inside grouped values while flagging malformed paste', () => {
    expect(normalizeIdrPriceEdit('75.0000', 'insertText', '0')).toBe('750000');
    expect(normalizeIdrPriceEdit('75.00', 'deleteContentBackward')).toBe('7500');
    expect(normalizeIdrPriceEdit('75.0000', 'insertFromPaste')).toBe('75.0000');
    expect(normalizeIdrPriceEdit('Rp 450.000', 'insertFromPaste')).toBe('450000');
  });
});
