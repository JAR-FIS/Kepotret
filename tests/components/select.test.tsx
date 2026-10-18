import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from '@/components/ui/select';

const options = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'pending', label: 'Pending approval' },
];

describe('branded accessible Select', () => {
  it('opens with the selected option active and supports keyboard selection', () => {
    const onValueChange = vi.fn();
    render(<Select label="Sort order" value="newest" options={options} onValueChange={onValueChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Sort order' });
    fireEvent.click(trigger);
    const listbox = screen.getByRole('listbox', { name: 'Sort order' });
    expect(listbox).toHaveFocus();
    expect(within(listbox).getByRole('option', { name: 'Newest first' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'End' });
    fireEvent.keyDown(listbox, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith('pending');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports pointer selection, escape, outside click, and disabled state', () => {
    const onValueChange = vi.fn();
    render(<><Select label="Sort order" value="newest" options={options} onValueChange={onValueChange} /><button type="button">Outside</button></>);
    const trigger = screen.getByRole('combobox', { name: 'Sort order' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: 'Oldest first' }));
    expect(onValueChange).toHaveBeenCalledWith('oldest');
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    render(<Select label="Disabled choice" value="newest" options={options} onValueChange={onValueChange} disabled />);
    expect(screen.getByRole('combobox', { name: 'Disabled choice' })).toBeDisabled();
  });
});
