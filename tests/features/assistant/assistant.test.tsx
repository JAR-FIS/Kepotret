import { NextIntlClientProvider } from 'next-intl';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ assistant: vi.fn(), pathname: '/' }));
vi.mock('@/lib/api/browser', () => ({ postApiV1AiAssistant: api.assistant }));
vi.mock('next/navigation', () => ({ usePathname: () => api.pathname }));

import { Assistant } from '@/features/assistant/components/assistant';
import { setGuestCameraActive } from '@/features/guest/lib/camera-visibility';
import messages from '@/messages/en.json';

function renderAssistant() {
  return render(<NextIntlClientProvider locale="en" messages={messages}><Assistant /></NextIntlClientProvider>);
}

describe('shared read-only assistant', () => {
  beforeEach(() => { api.assistant.mockReset(); api.pathname = '/'; setGuestCameraActive(false); });

  it('sends a bounded message without a client-supplied role and renders the answer', async () => {
    api.assistant.mockResolvedValue({ status: 200, data: { data: { answer: 'A safe informational answer.' } } });
    renderAssistant();
    fireEvent.click(screen.getByRole('button', { name: 'Open AI Assistant' }));
    fireEvent.change(screen.getByLabelText('Message to the Assistant'), { target: { value: 'How do albums work?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    expect(await screen.findByText('A safe informational answer.')).toBeInTheDocument();
    const request = api.assistant.mock.calls[0]![0] as Record<string, unknown>;
    expect(request).toMatchObject({ message: 'How do albums work?', recent_turns: [] });
    expect(request).not.toHaveProperty('role');
  });

  it('shows rate limited and unavailable responses without affecting the main page', async () => {
    api.assistant.mockResolvedValueOnce({ status: 429, data: {} }).mockResolvedValueOnce({ status: 503, data: {} });
    renderAssistant();
    fireEvent.click(screen.getByRole('button', { name: 'Open AI Assistant' }));
    const input = screen.getByLabelText('Message to the Assistant');
    fireEvent.change(input, { target: { value: 'First question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    expect(await screen.findByText('Too many requests. Try again shortly.')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Second question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    expect(await screen.findByText('The assistant is unavailable. The main page remains usable.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('is available on Guest surfaces and hidden only while H69 camera is active', () => {
    api.pathname = '/j/guest-link';
    const view = renderAssistant();
    expect(screen.getByRole('button', { name: 'Open AI Assistant' })).toBeInTheDocument();
    act(() => setGuestCameraActive(true));
    expect(screen.queryByRole('button', { name: 'Open AI Assistant' })).not.toBeInTheDocument();
    act(() => setGuestCameraActive(false));
    expect(screen.getByRole('button', { name: 'Open AI Assistant' })).toBeInTheDocument();
    view.unmount();
    api.pathname = '/j/guest-link/galeri';
    renderAssistant();
    expect(screen.getByRole('button', { name: 'Open AI Assistant' })).toBeInTheDocument();
  });
});
