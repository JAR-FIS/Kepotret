import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmationPanel } from '@/components/ui/confirmation-panel';
import { Disclosure } from '@/components/ui/disclosure';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { MediaFrame } from '@/components/ui/media-frame';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Toast } from '@/components/ui/toast';

vi.mock('next/image', () => ({
  default: ({ alt, sizes }: { alt: string; sizes: string }) => (
    <span role="img" aria-label={alt} data-sizes={sizes} />
  ),
}));

describe('shared feedback primitives', () => {
  it('announces loading and empty states with their supplied copy', () => {
    render(
      <>
        <LoadingState label="Loading album" />
        <EmptyState title="No items" description="Nothing is available yet." />
      </>,
    );
    expect(screen.getByRole('status', { name: 'Loading album' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('heading', { name: 'No items' })).toBeVisible();
  });

  it('calls the explicit recoverable error retry action', () => {
    const retry = vi.fn();
    render(<ErrorState title="Could not load" description="Try again." retryLabel="Retry" onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
  });

  it('keeps success and error system statuses distinct', () => {
    render(<><StatusIndicator status="success">Saved</StatusIndicator><StatusIndicator status="error">Failed</StatusIndicator></>);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
  });

  it('announces transient error feedback assertively', () => {
    render(<Toast status="error">Temporary failure</Toast>);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('dismisses transient feedback after its configured duration', () => {
    vi.useFakeTimers();
    render(<Toast duration={2500}>Temporary notice</Toast>);
    expect(screen.getByRole('status')).toHaveTextContent('Temporary notice');
    act(() => vi.advanceTimersByTime(2500));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('runs confirmation actions independently', () => {
    const confirm = vi.fn();
    const cancel = vi.fn();
    render(<ConfirmationPanel title="Confirm" description="Review first." confirmLabel="Continue" cancelLabel="Cancel" onConfirm={confirm} onCancel={cancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });
});

describe('disclosure and media primitives', () => {
  it('uses native details/summary disclosure semantics', () => {
    render(<Disclosure title="More information">Expanded details.</Disclosure>);
    const summary = screen.getByText('More information');
    const details = summary.closest('details');
    expect(details).not.toHaveAttribute('open');
    fireEvent.click(summary);
    expect(details).toHaveAttribute('open');
    expect(screen.getByText('Expanded details.')).toBeVisible();
  });

  it('reserves a responsive media frame aspect ratio', () => {
    render(<MediaFrame aspectRatio="1 / 1" aria-label="Media placeholder" />);
    expect(screen.getByLabelText('Media placeholder')).toHaveStyle({ aspectRatio: '1 / 1' });
  });

  it('renders a responsive Next image with required alt text and sizes', () => {
    render(<ResponsiveImage src="/brand/icon.svg" alt="Kepotret symbol" sizes="(max-width: 640px) 100vw, 50vw" />);
    expect(screen.getByRole('img', { name: 'Kepotret symbol' })).toHaveAttribute('data-sizes', '(max-width: 640px) 100vw, 50vw');
  });
});
