import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getContent, priceOptions } from '@/features/marketing/content';
import { H01HeroHeadline } from '@/features/marketing/components/h01-hero-headline';

describe('H01 locked headline and content', () => {
  it.each([
    ['id', 'Satu momen. Banyak sudut.'],
    ['en', 'One moment. Many perspectives.'],
  ] as const)('renders the locked visible punctuation and one decorative lime terminal dot for %s', (locale, title) => {
    const copy = getContent(locale).hero;
    const { container } = render(<H01HeroHeadline title={copy.title} firstLine={copy.titleFirstLine} secondLine={copy.titleSecondLine} />);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeVisible();
    expect(container.querySelector('[data-hero-first-line]')?.textContent).toBe(locale === 'id' ? 'Satu momen.' : 'One moment.');
    expect(container.querySelector('[data-hero-second-line]')?.textContent).toBe(locale === 'id' ? 'Banyak sudut' : 'Many perspectives');
    expect(container.querySelectorAll('[data-hero-lime-dot]')).toHaveLength(1);
    expect(container.querySelector('[data-hero-lime-dot]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the approved seven per-album capacities and prices', () => {
    expect(priceOptions.map(({ photos, price }) => [photos, price])).toEqual([
      [30, 0], [100, 100_000], [250, 230_000], [500, 450_000], [700, 620_000], [1_000, 840_000], [10_000, 1_100_000],
    ]);
  });

  it.each(['id', 'en'] as const)('states only the four approved reveal delays in %s', (locale) => {
    const galleryFaq = getContent(locale).faq.items.find(({ question }) => /kapan foto|when can participants view photos/i.test(question));
    expect(galleryFaq).toBeDefined();
    expect(galleryFaq!.answer).not.toContain('LIVE');
    expect(galleryFaq!.answer).toContain('D+1');
    expect(galleryFaq!.answer).toContain('D+3');
    expect(galleryFaq!.answer).toContain('D+5');
    expect(galleryFaq!.answer).toContain('D+7');
    expect(galleryFaq!.answer).toMatch(/tersembunyi|hidden/i);
    expect(galleryFaq!.answer).toMatch(/moderasi|moderation/i);
  });
});
