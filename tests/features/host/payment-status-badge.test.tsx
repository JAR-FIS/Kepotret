import { NextIntlClientProvider } from 'next-intl';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaymentStatusBadge } from '@/features/host/components/payment-status-badge';
import idMessages from '@/messages/id.json';
import enMessages from '@/messages/en.json';
import type { PaymentTransaction } from '@/lib/api/generated/index.schemas';

describe('server payment status badge', () => {
  it.each([
    ['PENDING', 'Menunggu pembayaran', 'amber'],
    ['SUCCESS', 'Pembayaran berhasil', 'green'],
    ['FAILURE', 'Pembayaran gagal', 'red'],
    ['EXPIRED', 'Pembayaran kedaluwarsa', 'red'],
  ] as const)('maps %s to an icon, localized label and %s tone', (status, label, tone) => {
    render(<NextIntlClientProvider locale="id" messages={idMessages}><PaymentStatusBadge status={status} /></NextIntlClientProvider>);
    const badge = screen.getByText(label);
    expect(badge).toHaveClass(`bg-${tone}-100`);
    expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses the English label without inferring success', () => {
    render(<NextIntlClientProvider locale="en" messages={enMessages}><PaymentStatusBadge status="PENDING" /></NextIntlClientProvider>);
    expect(screen.getByText('Payment pending')).toBeInTheDocument();
    expect(screen.queryByText('Payment successful')).not.toBeInTheDocument();
  });

  it('shows an unexpected server code neutrally instead of treating it as success', () => {
    render(<NextIntlClientProvider locale="id" messages={idMessages}><PaymentStatusBadge status={'PROCESSING' as PaymentTransaction['status']} /></NextIntlClientProvider>);
    expect(screen.getByText('PROCESSING')).toHaveClass('bg-[var(--color-muted)]');
    expect(screen.queryByText('Pembayaran berhasil')).not.toBeInTheDocument();
  });
});
