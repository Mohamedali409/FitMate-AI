import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../src/lib/i18n/LanguageContext';
import { AuthProvider } from '../src/features/auth/AuthContext';
import { LoginForm } from '../src/features/auth/LoginForm';
import * as AuthContextModule from '../src/features/auth/AuthContext';
import { ApiClientError } from '../src/lib/api/client';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: (param: string) => (param === 'redirect' ? '/dashboard' : null),
  }),
}));

describe('LoginForm Integration & Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates email format before submitting', async () => {
    render(
      <AuthProvider>
        <LanguageProvider>
          <LoginForm />
        </LanguageProvider>
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Invalid email address format/i)).toBeInTheDocument();
  });

  it('validates required password before submitting', async () => {
    render(
      <AuthProvider>
        <LanguageProvider>
          <LoginForm />
        </LanguageProvider>
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });

    fireEvent.change(emailInput, { target: { value: 'athlete@fitmate.ai' } });
    fireEvent.change(passwordInput, { target: { value: '' } });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
  });

  it('submits valid credentials and redirects to redirect query param', async () => {
    render(
      <AuthProvider>
        <LanguageProvider>
          <LoginForm />
        </LanguageProvider>
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });

    fireEvent.change(emailInput, { target: { value: 'demo@fitmate.ai' } });
    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 2000 });
  });

  it('displays error cleanly when backend returns INVALID_CREDENTIALS', async () => {
    const mockLogin = vi.fn().mockRejectedValue(
      new ApiClientError(401, {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      })
    );

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isMock: true,
      user: null,
      profile: null,
      token: null,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <LanguageProvider>
        <LoginForm />
      </LanguageProvider>
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@fitmate.ai' } });
    fireEvent.change(passwordInput, { target: { value: 'WrongPass123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid email or password. Please verify your credentials/i)).toBeInTheDocument();
    });
  });

  it('displays rate limit error when backend returns RATE_LIMIT_EXCEEDED', async () => {
    const mockLogin = vi.fn().mockRejectedValue(
      new ApiClientError(429, {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many attempts. Please try again later.',
      })
    );

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isMock: true,
      user: null,
      profile: null,
      token: null,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <LanguageProvider>
        <LoginForm />
      </LanguageProvider>
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });

    fireEvent.change(emailInput, { target: { value: 'spam@fitmate.ai' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Too many authentication attempts/i)).toBeInTheDocument();
    });
  });
});
