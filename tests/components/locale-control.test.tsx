import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LocaleControl } from '@/components/ui/locale-control';
import { LocaleProvider } from '@/providers/locale-provider';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('LocaleControl', () => {
  it('switches the active locale and document language', async () => {
    render(
      <LocaleProvider>
        <LocaleControl label="Language" indonesianLabel="Indonesian" englishLabel="English" />
      </LocaleProvider>,
    );
    const select = screen.getByRole('combobox', { name: 'Language' });
    expect(select).toHaveValue('id');
    fireEvent.change(select, { target: { value: 'en' } });
    expect(select).toHaveValue('en');
    expect(refresh).toHaveBeenCalledOnce();
    await waitFor(() => expect(document.documentElement).toHaveAttribute('lang', 'en'));
  });
});
