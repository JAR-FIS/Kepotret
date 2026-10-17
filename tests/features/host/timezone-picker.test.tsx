import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TimezonePicker } from '@/features/host/components/timezone-picker';

describe('TimezonePicker', () => {
  it('filters valid IANA zones and supports keyboard selection and Escape', () => {
    const onChange = vi.fn();
    const view = render(<TimezonePicker id="zone" label="Event time zone" value="" onChange={onChange} />);
    const input = screen.getByRole('combobox', { name: 'Event time zone' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Asia/Jak' } });
    expect(onChange).toHaveBeenCalledWith('Asia/Jak');
    view.rerender(<TimezonePicker id="zone" label="Event time zone" value="Asia/Jak" onChange={onChange} />);
    expect(screen.getByRole('option', { name: 'Asia/Jakarta' })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('Asia/Jakarta');
    expect(input).toHaveAttribute('aria-expanded', 'false');

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not expose suggestions or accept edits when the album time zone is locked', () => {
    const onChange = vi.fn();
    render(<TimezonePicker id="locked-zone" label="Event time zone" value="Asia/Jakarta" onChange={onChange} disabled />);
    const input = screen.getByRole('combobox', { name: 'Event time zone' });
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
