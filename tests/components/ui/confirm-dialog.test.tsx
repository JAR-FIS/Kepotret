import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function Harness({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)}>Open confirmation</button>
    <ConfirmDialog open={open} title="Confirm change" description="This change affects access." confirmLabel="Confirm" cancelLabel="Cancel" onConfirm={onConfirm} onCancel={() => setOpen(false)} />
  </>;
}

describe('ConfirmDialog', () => {
  it('uses dialog semantics, initially focuses Cancel, and returns focus after cancellation', () => {
    render(<Harness onConfirm={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Open confirmation' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Confirm change' });
    expect(dialog).toHaveAttribute('aria-describedby');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('calls only the explicit confirmation action when Confirm is activated', () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open confirmation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
