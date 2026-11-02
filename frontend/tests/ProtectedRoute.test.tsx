import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../src/components/auth/ProtectedRoute';
import * as AuthContextModule from '../src/features/auth/AuthContext';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/dashboard',
}));

describe('ProtectedRoute Route Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect unauthenticated users to /auth/login with redirect query param', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isMock: false,
      user: null,
      profile: null,
      token: null,
      refreshToken: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div data-testid="secret-content">Secret Protected Content</div>
      </ProtectedRoute>
    );

    // Protected content should NOT be rendered
    expect(screen.queryByTestId('secret-content')).toBeNull();

    // Redirection should be called
    expect(mockPush).toHaveBeenCalledWith('/auth/login?redirect=%2Fdashboard');
  });

  it('should render children when user is authenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isMock: false,
      user: {
        id: 'usr_1',
        email: 'athlete@fitmate.ai',
        displayName: 'Captain Fit',
        isEmailVerified: true,
        isOnboardingCompleted: true,
      },
      profile: null,
      token: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token',
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div data-testid="secret-content">Secret Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('secret-content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
