import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { push, replace, getStart } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), getStart: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));
vi.mock('@/lib/api/browser', () => ({ getApiV1AuthGoogleStart: getStart }));

import { GoogleSignInButton } from '@/features/auth/components/google-sign-in-button';

describe('Google sign-in boundary', () => {
  beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    getStart.mockReset();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('starts through the generated backend endpoint, shows processing, and handles an unsuccessful start without storing tokens', async () => {
    getStart.mockResolvedValue({ status: 401, data: {} });
    render(<GoogleSignInButton locale="id" />);
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan dengan Google' }));

    await waitFor(() => expect(getStart).toHaveBeenCalledOnce());
    expect(push).toHaveBeenCalledWith('/auth/google/memproses');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/masuk/gagal'));
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
