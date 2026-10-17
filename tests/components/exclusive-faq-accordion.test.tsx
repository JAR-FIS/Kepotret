import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExclusiveFaqAccordion } from '@/features/marketing/components/exclusive-faq-accordion';

describe('exclusive public FAQ accordion', () => {
  it('keeps only one answer open and provides reduced-motion-safe disclosure controls', () => {
    render(<ExclusiveFaqAccordion items={[
      { question: 'When can participants view photos?', answer: 'LIVE or D+1, D+3, D+5, or D+7.' },
      { question: 'Do guests need an account?', answer: 'No account is needed.' },
    ]} />);

    const first = screen.getByRole('button', { name: 'When can participants view photos?' });
    const second = screen.getByRole('button', { name: 'Do guests need an account?' });
    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/LIVE or D\+1/).parentElement?.parentElement).toHaveAttribute('aria-hidden', 'false');

    fireEvent.click(second);
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('No account is needed.').parentElement?.parentElement).toHaveAttribute('aria-hidden', 'false');
    expect(first.getAttribute('aria-controls')).not.toBe(second.getAttribute('aria-controls'));
  });
});
