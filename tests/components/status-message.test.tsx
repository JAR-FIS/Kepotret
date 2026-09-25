import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusMessage } from '@/components/ui/status-message';

describe('StatusMessage', () => {
  it('exposes its message as a polite status to assistive technology', () => {
    render(<StatusMessage>Frontend foundation is ready.</StatusMessage>);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Frontend foundation is ready.',
    );
  });
});
