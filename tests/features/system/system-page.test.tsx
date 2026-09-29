import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SystemPage } from '@/features/system/components/system-page';

describe('compatibility help page', () => {
  it.each([
    ['id', '/bantuan', 'Kepotret adalah aplikasi web berbasis browser'],
    ['en', '/help', 'Kepotret is a browser-based web app'],
  ] as const)('renders locked camera guidance and a localized Help link for %s', (locale, helpHref, firstGuidance) => {
    render(<SystemPage locale={locale} kind="compatibility" />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(firstGuidance))).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getByText(/gallery|galeri/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: locale === 'id' ? 'Buka Pusat Bantuan' : 'Visit Help' })).toHaveAttribute('href', helpHref);
  });
});
