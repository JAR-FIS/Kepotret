import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PricingSelector } from '@/features/marketing/components/pricing-selector';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a>,
}));

describe('FE-2 pricing selector', () => {
  it('offers only the locked capacities and updates price with accessible radio keyboard controls', () => {
    render(<PricingSelector locale="id" />);
    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.textContent)).toEqual(['30', '100', '250', '500', '700', '1K', '10K']);
    expect(screen.getByText('Gratis')).toBeVisible();

    const hundred = screen.getByRole('radio', { name: '100' });
    fireEvent.keyDown(hundred, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: '250' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Rp230.000')).toBeVisible();
    expect(screen.getByRole('radio', { name: '250' })).toHaveFocus();

    fireEvent.click(screen.getByRole('radio', { name: '10K' }));
    expect(screen.getByText('10.000 foto')).toBeVisible();
    expect(screen.getByText('Rp1.100.000')).toBeVisible();
    expect(screen.getByRole('link', { name: /10K/ })).toHaveAttribute('href', '/masuk');
  });
});
