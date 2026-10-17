import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LocaleControl } from '@/components/ui/locale-control';
import { LocaleProvider } from '@/providers/locale-provider';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('LocaleControl', () => {
  it('shows ID/ENG and switches locale through the accessible custom listbox', async () => {
    render(
      <LocaleProvider>
        <LocaleControl label="Language" indonesianLabel="Indonesian" englishLabel="English" />
      </LocaleProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Language: ID' });
    expect(trigger).toHaveTextContent('ID');
    fireEvent.click(trigger);
    const listbox = screen.getByRole('listbox', { name: 'Language' });
    expect(listbox).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'English' })).toHaveTextContent('ENG');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(refresh).toHaveBeenCalledOnce();
    await waitFor(() => expect(document.documentElement).toHaveAttribute('lang', 'en'));
    expect(screen.getByRole('button', { name: 'Language: ENG' })).toHaveTextContent('ENG');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes with Escape and restores focus to the trigger', () => {
    render(
      <LocaleProvider>
        <LocaleControl label="Bahasa" indonesianLabel="Bahasa Indonesia" englishLabel="Bahasa Inggris" />
      </LocaleProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Bahasa: ID' });
    fireEvent.click(trigger);
    const listbox = screen.getByRole('listbox', { name: 'Bahasa' });
    fireEvent.keyDown(listbox, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
