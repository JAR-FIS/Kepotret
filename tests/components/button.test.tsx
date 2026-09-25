import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders a keyboard-accessible disabled state', () => {
    render(<Button disabled>Continue</Button>);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});
