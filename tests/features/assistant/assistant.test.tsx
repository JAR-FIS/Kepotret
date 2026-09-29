import { NextIntlClientProvider } from 'next-intl';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ assistant: vi.fn(), pathname: '/' }));
vi.mock('@/lib/api/browser', () => ({ postApiV1AiAssistant: api.assistant }));
vi.mock('next/navigation', () => ({ usePathname: () => api.pathname }));

import { Assistant, getAssistantContext } from '@/features/assistant/components/assistant';
import { setGuestCameraActive } from '@/features/guest/lib/camera-visibility';
import messages from '@/messages/en.json';

function renderAssistant() {
  return render(<NextIntlClientProvider locale="en" messages={messages}><Assistant /></NextIntlClientProvider>);
}

describe('shared read-only assistant', () => {
  beforeEach(() => { api.assistant.mockReset(); api.pathname = '/'; setGuestCameraActive(false); });

  it('sends PUBLIC context by default without client role or capability claims', async () => {
    api.assistant.mockResolvedValue({ status: 200, data: { data: { answer: 'A safe informational answer.' } } });
    renderAssistant();
    fireEvent.click(screen.getByRole('button', { name: 'Open AI Assistant' }));
    fireEvent.change(screen.getByLabelText('Message to the Assistant'), { target: { value: 'How do albums work?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    expect(await screen.findByText('A safe informational answer.')).toBeInTheDocument();
    const request = api.assistant.mock.calls[0]![0] as Record<string, unknown>;
    expect(request).toMatchObject({ context: { surface: 'PUBLIC' }, message: 'How do albums work?', recent_turns: [] });
    expect(request).not.toHaveProperty('role');
    expect(request).not.toHaveProperty('can_setup');
    expect(request).not.toHaveProperty('can_moderate');
    expect(request).not.toHaveProperty('can_export_zip');
    expect(request).not.toHaveProperty('owner');
    expect(request).not.toHaveProperty('admin_privilege');
    expect(request).not.toHaveProperty('sensitive_grant');
    expect(Object.keys(request).sort()).toEqual(['context', 'message', 'recent_turns']);
  });

  it('sends USER context with the album route hint', async () => {
    api.pathname = '/album/123e4567-e89b-12d3-a456-426614174000/galeri';
    api.assistant.mockResolvedValue({ status: 200, data: { data: { answer: 'OK' } } });
    renderAssistant();
    fireEvent.click(screen.getByRole('button', { name: 'Open AI Assistant' }));
    fireEvent.change(screen.getByLabelText('Message to the Assistant'), { target: { value: 'Question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await screen.findByText('OK');
    expect(api.assistant.mock.calls[0]![0]).toMatchObject({ context: { surface: 'USER', album_id: '123e4567-e89b-12d3-a456-426614174000' } });
  });

  it('sends GUEST context without an album hint or authority claims', async () => {
    api.pathname = '/j/guest-link/galeri';
    api.assistant.mockResolvedValue({ status: 200, data: { data: { answer: 'OK' } } });
    renderAssistant();
    fireEvent.click(screen.getByRole('button', { name: 'Open AI Assistant' }));
    fireEvent.change(screen.getByLabelText('Message to the Assistant'), { target: { value: 'Question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await screen.findByText('OK');
    const request = api.assistant.mock.calls[0]![0];
    expect(request).toMatchObject({ context: { surface: 'GUEST' } });
    expect(request.context).not.toHaveProperty('album_id');
    expect(request).not.toHaveProperty('role');
    expect(request).not.toHaveProperty('can_moderate');
  });

  it('sends ADMIN context with the album route hint', async () => {
    api.pathname = '/admin/albums/123e4567-e89b-12d3-a456-426614174000';
    api.assistant.mockResolvedValue({ status: 200, data: { data: { answer: 'OK' } } });
    renderAssistant();
    fireEvent.click(screen.getByRole('button', { name: 'Open AI Assistant' }));
    fireEvent.change(screen.getByLabelText('Message to the Assistant'), { target: { value: 'Question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await screen.findByText('OK');
    expect(api.assistant.mock.calls[0]![0]).toMatchObject({ context: { surface: 'ADMIN', album_id: '123e4567-e89b-12d3-a456-426614174000' } });
  });

  it('does not invent an album id from malformed or unrelated paths', () => {
    expect(getAssistantContext('/album/not-a-uuid/overview')).toEqual({ surface: 'USER' });
    expect(getAssistantContext('/unrelated/123e4567-e89b-12d3-a456-426614174000')).toEqual({ surface: 'PUBLIC' });
    expect(getAssistantContext('/admin/albums/not-a-uuid')).toEqual({ surface: 'ADMIN' });
  });

  it('focuses the input on open and returns focus to the launcher on Escape', () => {
    renderAssistant();
    const launcher = screen.getByRole('button', { name: 'Open AI Assistant' });
    fireEvent.click(launcher);
    const input = screen.getByLabelText('Message to the Assistant');
    expect(input).toHaveFocus();
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-modal');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(launcher).toHaveFocus();
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

  it.each([
    '/admin/masuk',
    '/admin/mfa',
    '/admin/akses-ditolak',
    '/admin/albums/123e4567-e89b-12d3-a456-426614174000/sensitive-access',
    '/admin/albums/123e4567-e89b-12d3-a456-426614174000/hold',
    '/album/123e4567-e89b-12d3-a456-426614174000/checkout/pkg',
    '/album/123e4567-e89b-12d3-a456-426614174000/pembayaran/txn',
    '/album/123e4567-e89b-12d3-a456-426614174000/sensitive-access',
  ])('hides Assistant on protected route %s', (pathname) => {
    api.pathname = pathname;
    renderAssistant();
    expect(screen.queryByRole('button', { name: 'Open AI Assistant' })).not.toBeInTheDocument();
  });

  it.each(['/admin', '/admin/users', '/admin/albums', '/admin/payments', '/admin/catalog', '/admin/config', '/admin/issues', '/admin/audit', '/admin/admins'])('keeps Assistant visible on Admin operational route %s', (pathname) => {
    api.pathname = pathname;
    renderAssistant();
    expect(screen.getByRole('button', { name: 'Open AI Assistant' })).toBeInTheDocument();
  });
});
