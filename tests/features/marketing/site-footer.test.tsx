import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from '@/features/marketing/components/site-footer';

describe('H01 official social links', () => {
  it('links Instagram and TikTok to official HTTPS profiles and leaves WhatsApp unavailable', () => {
    render(<SiteFooter locale="en" />);
    const instagram = screen.getByRole('link', { name: /Instagram/ });
    const tiktok = screen.getByRole('link', { name: /TikTok/ });
    expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/kepotret.official/');
    expect(tiktok).toHaveAttribute('href', 'https://www.tiktok.com/@kepotret.official');
    for (const link of [instagram, tiktok]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    expect(screen.getByText(/WhatsApp/)).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Contact/)).toHaveAttribute('aria-disabled', 'true');
  });
});
