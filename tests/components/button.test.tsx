import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';

describe('Button', () => {
  it('renders a disabled state that cannot be activated', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Continue</Button>);
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('exposes its loading state and disables activation', () => {
    render(<Button loading>Saving</Button>);
    const button = screen.getByRole('button', { name: 'Saving' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('renders distinct primary, secondary, and ghost actions with native submit behavior', () => {
    render(
      <form>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </form>,
    );
    expect((screen.getByRole('button', { name: 'Primary' }) as HTMLButtonElement).type).toBe('submit');
    expect(screen.getByRole('button', { name: 'Secondary' })).toHaveClass('bg-[var(--color-secondary)]');
    expect(screen.getByRole('button', { name: 'Ghost' })).toHaveClass('text-[var(--color-foreground)]');
  });
});

describe('IconButton', () => {
  it('has an accessible name and does not submit a surrounding form by default', () => {
    render(<form><IconButton label="Close"><span aria-hidden="true">x</span></IconButton></form>);
    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toHaveAttribute('type', 'button');
  });
});
