import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/features/auth/AuthContext';

// Helper test consumer component
const AuthConsumer: React.FC = () => {
  const auth = useAuth();
  const {
    isAuthenticated,
    user,
    token,
    login,
    logout,
    refreshSession,
  } = auth;

  // SEC-FE-005 verification: raw refreshToken must not be exposed on useAuth()
  const isRefreshTokenExposed = Boolean((auth as any).refreshToken);

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="user-email">{user ? user.email : 'none'}</div>
      <div data-testid="has-token">{token ? 'yes' : 'no'}</div>
      <div data-testid="exposed-refresh-token">{isRefreshTokenExposed ? 'exposed' : 'encapsulated'}</div>
      <button
        data-testid="login-btn"
        onClick={() => login('demo@fitmate.ai', 'Secret123!')}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => logout()}>
        Logout
      </button>
      <button data-testid="refresh-btn" onClick={() => refreshSession()}>
        Refresh
      </button>
    </div>
  );
};

describe('Auth Lifecycle & In-Memory Token Safety', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should initialize in an unauthenticated state with null tokens and encapsulated refresh token', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('none');
    expect(screen.getByTestId('has-token')).toHaveTextContent('no');
    // SEC-FE-005: Raw refresh token must never be exposed to consumers
    expect(screen.getByTestId('exposed-refresh-token')).toHaveTextContent('encapsulated');
  });

  it('should login, populate state in-memory, and NEVER store tokens in localStorage', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    const loginBtn = screen.getByTestId('login-btn');
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('user-email')).toHaveTextContent('demo@fitmate.ai');
      expect(screen.getByTestId('has-token')).toHaveTextContent('yes');
      expect(screen.getByTestId('exposed-refresh-token')).toHaveTextContent('encapsulated');
    }, { timeout: 2000 });

    // Strict Security Invariant: Tokens MUST NEVER be stored in localStorage or sessionStorage
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('refreshToken')).toBeNull();
  });

  it('should logout cleanly, reset in-memory tokens and authenticated state', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    // Login first
    fireEvent.click(screen.getByTestId('login-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    }, { timeout: 2000 });

    // Logout
    fireEvent.click(screen.getByTestId('logout-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      expect(screen.getByTestId('user-email')).toHaveTextContent('none');
      expect(screen.getByTestId('has-token')).toHaveTextContent('no');
    }, { timeout: 2000 });
  });

  it('should successfully refresh session with valid in-memory refresh token', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    // Login first
    fireEvent.click(screen.getByTestId('login-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    }, { timeout: 2000 });

    // Refresh
    fireEvent.click(screen.getByTestId('refresh-btn'));

    // Still authenticated with refreshed in-memory tokens
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('has-token')).toHaveTextContent('yes');
      expect(screen.getByTestId('exposed-refresh-token')).toHaveTextContent('encapsulated');
    }, { timeout: 2000 });
  });
});
