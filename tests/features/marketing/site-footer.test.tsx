import { render, screen, within } from '@testing-library/react';
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
    const helpGroup = screen.getByRole('heading', { name: 'Help' }).parentElement;
    expect(within(helpGroup!).queryByText('Contact us')).not.toBeInTheDocument();
  });
});

describe('T2-45 public footer guide link', () => {
  it.each([
    { locale: 'id' as const, group: 'Bantuan', guide: 'Panduan', help: 'Pusat Bantuan', security: 'Keamanan' },
    { locale: 'en' as const, group: 'Help', guide: 'Guides', help: 'Help Center', security: 'Security' },
  ])('keeps one localized guide link and existing help destinations in $locale', ({ locale, group, guide, help, security }) => {
    render(<SiteFooter locale={locale} />);
    const helpGroup = screen.getByRole('heading', { name: group }).parentElement;
    expect(helpGroup).not.toBeNull();
    expect(within(helpGroup!).getByRole('link', { name: guide })).toHaveAttribute('href', '/help');
    expect(screen.getAllByRole('link', { name: guide })).toHaveLength(1);
    expect(within(helpGroup!).getByRole('link', { name: help })).toHaveAttribute('href', '/bantuan');
    expect(within(helpGroup!).getByRole('link', { name: security })).toHaveAttribute('href', '/keamanan');
    expect(within(helpGroup!).queryByText(locale === 'id' ? 'Hubungi Kami' : 'Contact us')).not.toBeInTheDocument();
  });
});
