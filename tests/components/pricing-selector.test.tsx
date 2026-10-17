import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PricingSelector } from '@/features/marketing/components/pricing-selector';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a>,
}));

describe('H01 pricing slider', () => {
  it('offers seven discrete locked capacities and updates accessible value, price, and CTA together', () => {
    render(<PricingSelector locale="id" />);
    const slider = screen.getByRole('slider', { name: 'Berapa banyak momen yang ingin kamu tampung?' });
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '6');
    expect(slider).toHaveAttribute('step', '1');
    expect(screen.getByText('Gratis')).toBeVisible();

    fireEvent.change(slider, { target: { value: '2' } });
    expect(slider).toHaveValue('2');
    expect(slider).toHaveAttribute('aria-valuetext', '250 foto, Rp230.000');
    expect(screen.getByText('Rp230.000')).toBeVisible();
    expect(screen.getByRole('link', { name: /Pilih 250 Foto/ })).toHaveAttribute('href', '/masuk');

    fireEvent.change(slider, { target: { value: '6' } });
    expect(screen.getByText('10.000 foto')).toBeVisible();
    expect(screen.getByText('Rp1.100.000')).toBeVisible();
    expect(slider).toHaveAttribute('aria-valuetext', '10.000 foto, Rp1.100.000');
    expect(screen.getByRole('link', { name: /Pilih 10K Foto/ })).toHaveAttribute('href', '/masuk');
  });
});
