import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { replace, csrf, login, verify } = vi.hoisted(() => ({ replace: vi.fn(), csrf: vi.fn(), login: vi.fn(), verify: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock('@/components/ui/locale-control', () => ({ LocaleControl: () => null }));
vi.mock('@/components/ui/theme-toggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/lib/api/admin-browser', () => ({
  getApiV1AdminSecurityCsrf: csrf,
  postApiV1AdminAuthLogin: login,
  postApiV1AdminAuthMfaVerify: verify,
}));

import { AdminLogin, AdminMfa } from '@/features/admin/auth';
import enMessages from '@/messages/en.json';

describe('FE-8 Admin authentication boundary', () => {
  beforeEach(() => {
    replace.mockReset(); csrf.mockReset(); login.mockReset(); verify.mockReset();
    localStorage.clear(); sessionStorage.clear();
    csrf.mockResolvedValue({ status: 200, data: { data: { csrf_token: 'admin-csrf-test' } } });
  });

  it('uses Admin CSRF, sends credentials without persisting them, and sends a 202 challenge to MFA', async () => {
    login.mockResolvedValue({ status: 202, data: {} });
    render(<NextIntlClientProvider locale="en" messages={enMessages}><AdminLogin /></NextIntlClientProvider>);
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
    render(<NextIntlClientProvider locale="en" messages={enMessages}><AdminLogin /></NextIntlClientProvider>);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'unknown@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to MFA verification' }));
    expect(await screen.findByText('The email or password could not be verified.')).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('shows and hides the password without changing the entered value or form submission', async () => {
    login.mockResolvedValue({ status: 202, data: {} });
    render(<NextIntlClientProvider locale="en" messages={enMessages}><AdminLogin /></NextIntlClientProvider>);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.test' } });
    const password = screen.getByLabelText('Password');
    fireEvent.change(password, { target: { value: 'private-password' } });
    expect(password).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('private-password');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveValue('private-password');

    fireEvent.click(screen.getByRole('button', { name: 'Continue to MFA verification' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/mfa'));
    expect(login).toHaveBeenCalledWith({ email: 'admin@example.test', password: 'private-password' }, { headers: { 'X-CSRF-Token': 'admin-csrf-test' } });
  });

  it('accepts numeric MFA input, explains rejected characters, and submits through Admin CSRF', async () => {
    verify.mockResolvedValue({ status: 200, data: {} });
    render(<NextIntlClientProvider locale="en" messages={enMessages}><AdminMfa /></NextIntlClientProvider>);
    const code = screen.getByLabelText('Authentication code');
    fireEvent.change(code, { target: { value: 'abc' } });
    expect(code).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Use digits 0–9');
    fireEvent.change(code, { target: { value: '123456' } });
    expect(code).toHaveValue('123456');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'));
    expect(csrf).toHaveBeenCalledOnce();
    expect(verify).toHaveBeenCalledWith({ totp_code: '123456' }, { headers: { 'X-CSRF-Token': 'admin-csrf-test' } });
  });

  it('does not advance MFA when verification is rejected', async () => {
    verify.mockResolvedValue({ status: 401, data: {} });
    render(<NextIntlClientProvider locale="en" messages={enMessages}><AdminMfa /></NextIntlClientProvider>);
    fireEvent.change(screen.getByLabelText('Authentication code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    await waitFor(() => expect(verify).toHaveBeenCalledOnce());
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Authentication code')).toHaveValue('');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
