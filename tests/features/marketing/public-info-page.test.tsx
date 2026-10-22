/* eslint-disable @next/next/no-img-element -- the test replaces next/image with a minimal DOM image. */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock('next/image', () => ({ default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => <img src={src} alt={alt} className={className} /> }));
vi.mock('@/features/marketing/components/public-page-frame', () => ({ PublicPageFrame: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { PublicInfoPage } from '@/features/marketing/components/public-info-page';

describe('FE-UAT-03 public marketing pages', () => {
  it('renders separate Host and no-account participant guides with accessible product illustrations and guide FAQs', () => {
    render(<PublicInfoPage locale="id" kind="how" />);

    expect(screen.getByRole('heading', { name: /Untuk Host/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Untuk peserta/ })).toBeInTheDocument();
    expect(screen.getByText(/Peserta cukup membuka QR/)).toBeInTheDocument();
    expect(screen.getByText(/Tidak\. Peserta mengambil foto secara langsung menggunakan kamera browser/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pertanyaan sebelum acara dimulai' })).toBeInTheDocument();
    const illustrations = screen.getAllByRole('img');
    expect(illustrations).toHaveLength(7);
    expect(illustrations.every((image) => image.getAttribute('aria-label'))).toBe(true);
  });

  it('keeps the exact Indonesian price guidance and all seven existing slider stops', () => {
    render(<PublicInfoPage locale="id" kind="pricing" />);

    expect(screen.getByText('Mulai gratis dengan 30 foto. Geser kapasitas dan pilih jumlah foto yang paling cocok untuk acaramu. Jumlah peserta tetap tidak dibatasi paket!')).toBeInTheDocument();
    const slider = screen.getByRole('slider', { name: /Berapa banyak momen/ });
    expect(slider).toHaveAttribute('max', '6');
    expect(slider).toHaveAttribute('step', '1');
    fireEvent.change(slider, { target: { value: '6' } });
    expect(slider).toHaveAttribute('aria-valuetext', '10.000 foto, Rp1.100.000');
    expect(screen.getByRole('link', { name: /Pilih 10K Foto/ })).toHaveAttribute('href', '/masuk');
  });

  it('localizes pricing and approved delayed-reveal FAQ guidance into English without changing the selected package', () => {
    const { unmount } = render(<PublicInfoPage locale="en" kind="pricing" />);

    expect(screen.getByText('Start free with 30 photos. Choose the photo capacity that best fits your event. Participant count is not limited by the package!')).toBeInTheDocument();
    const slider = screen.getByRole('slider', { name: /How many moments/ });
    expect(slider).toHaveAttribute('aria-valuetext', '30 photos, Free');
    fireEvent.change(slider, { target: { value: '6' } });
    expect(slider).toHaveAttribute('aria-valuetext', '10,000 photos, IDR1,100,000');
    unmount();

    render(<PublicInfoPage locale="en" kind="faq" />);
    fireEvent.click(screen.getByRole('button', { name: 'When can participants view photos?' }));
    expect(screen.getByText(/D\+1, D\+3, D\+5, or D\+7 after the event ends/i)).toBeInTheDocument();
    expect(screen.getByText(/server-authorized reveal time/i)).toBeInTheDocument();
  });

  it('exposes only the Owner-provided public help contacts as actionable links', () => {
    render(<PublicInfoPage locale="id" kind="help" />);

    expect(screen.getByRole('link', { name: 'kepotret123@gmail.com' })).toHaveAttribute('href', 'mailto:kepotret123@gmail.com');
    const socials = screen.getAllByRole('link', { name: 'kepotret.official' });
    expect(socials[0]).toHaveAttribute('href', 'https://www.tiktok.com/@kepotret.official');
    expect(socials[1]).toHaveAttribute('href', 'https://www.instagram.com/kepotret.official/');
    expect(screen.getByRole('link', { name: '+62 8138 7788 811' })).toHaveAttribute('href', 'https://wa.me/6281377888111');
    expect(screen.getByText(/asisten AI Kepotret/)).toBeInTheDocument();
  });
});
