import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { H01FaqAccordion } from '@/features/marketing/components/h01-faq-accordion';

const items = [
  { question: 'Question one?', answer: 'Answer one.' },
  { question: 'Question two?', answer: 'Answer two.' },
];

describe('H01 FAQ accordion', () => {
  it('allows only one answer open and exposes its expanded state and controlled panel', () => {
    render(<H01FaqAccordion items={items} />);
    const first = screen.getByRole('button', { name: 'Question one?' });
    const second = screen.getByRole('button', { name: 'Question two?' });
    const firstPanelId = first.getAttribute('aria-controls');
    const secondPanelId = second.getAttribute('aria-controls');

    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(firstPanelId!)).toHaveAttribute('aria-hidden', 'false');

    fireEvent.click(second);
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(firstPanelId!)).toHaveAttribute('aria-hidden', 'true');
    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(secondPanelId!)).toHaveAttribute('aria-hidden', 'false');

    fireEvent.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'false');
  });
});
