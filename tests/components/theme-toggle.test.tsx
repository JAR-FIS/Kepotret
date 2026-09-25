import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { describe, expect, it } from 'vitest';

import { ThemeToggle } from '@/components/ui/theme-toggle';

describe('ThemeToggle', () => {
  it('starts light and switches to dark with an accessible pressed state', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="light" enableColorScheme>
        <ThemeToggle lightLabel="Switch to light theme" darkLabel="Switch to dark theme" />
      </ThemeProvider>,
    );
    const button = screen.getByRole('button', { name: 'Switch to dark theme' });
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    fireEvent.click(button);
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toHaveAttribute('aria-pressed', 'true');
  });
});
