import { describe, expect, it } from 'vitest';
import { matchesGuideText } from '@/features/help/guide-search';

describe('local guide search', () => {
  it('trims and normalizes case while searching headings, bodies, and notes', () => {
    expect(matchesGuideText('  MFA  ', 'Admin sign-in', 'MFA step-up protects access')).toBe(true);
    expect(matchesGuideText('  capture WINDOW ', 'Schedule', 'Capture window opens later')).toBe(true);
    expect(matchesGuideText('QR OR LINK', 'Capture', 'Details', 'The QR or link remains useful')).toBe(true);
    expect(matchesGuideText('refund', 'Guide', 'No matching content')).toBe(false);
    expect(matchesGuideText('   ', 'Any section')).toBe(true);
  });
});
