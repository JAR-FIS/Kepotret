import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { replace, csrf, login } = vi.hoisted(() => ({ replace: vi.fn(), csrf: vi.fn(), login: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
vi.mock('@/components/ui/locale-control', () => ({ LocaleControl: () => null }));
vi.mock('@/components/ui/theme-toggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/lib/api/admin-browser', () => ({
  getApiV1AdminSecurityCsrf: csrf,
  postApiV1AdminAuthLogin: login,
}));

import { AdminLogin } from '@/features/admin/auth';

describe('FE-8 Admin authentication boundary', () => {
  beforeEach(() => {
    replace.mockReset(); csrf.mockReset(); login.mockReset();
    localStorage.clear(); sessionStorage.clear();
    csrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'admin-csrf-test' } } });
  });

  it('uses Admin CSRF, sends credentials without persisting them, and sends a 202 challenge to MFA', async () => {
    login.mockResolvedValue({ status: 202, data: {} });
    render(<AdminLogin />);
    expect(screen.queryByRole('button', { name: /google|sign up|forgot/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'temporary-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to MFA verification' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/mfa'));
    expect(csrf).toHaveBeenCalledOnce();
    expect(login).toHaveBeenCalledWith(
      { email: 'admin@example.test', password: 'temporary-password' },
      { headers: { 'X-CSRF-Token': 'admin-csrf-test' } },
    );
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('uses generic credential failure copy', async () => {
    login.mockResolvedValue({ status: 401, data: {} });
    render(<AdminLogin />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'unknown@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to MFA verification' }));
    expect(await screen.findByText('The email or password could not be verified.')).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
