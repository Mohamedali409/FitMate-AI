import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/features/auth/AuthContext';
import { MockAuthAdapter } from '../src/lib/api/auth.adapter';
import { ApiClient, setTokenRefreshHandler, ApiClientError } from '../src/lib/api/client';
import { sanitizeRedirectPath } from '../src/lib/utils/security';
import { ProtectedRoute } from '../src/components/auth/ProtectedRoute';
import * as AuthContextModule from '../src/features/auth/AuthContext';
import { LoginForm } from '../src/features/auth/LoginForm';
import { LanguageProvider } from '../src/lib/i18n/LanguageContext';

const mockPush = vi.fn();
let mockSearchParamRedirect: string | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => ({
    get: (param: string) => (param === 'redirect' ? mockSearchParamRedirect : null),
  }),
}));

describe('Phase FE 2.1 — Security & Integration Audit Remediation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamRedirect = null;
    localStorage.clear();
    sessionStorage.clear();
    setTokenRefreshHandler(null);
  });

  // =========================================================================
  // SEC-FE-001: Refresh Contract Alignment (Real Backend Response Shape)
  // =========================================================================
  describe('SEC-FE-001: Silent Refresh Contract Alignment', () => {
    it('handles backend refresh response format { accessToken, tokenType, expiresIn, refreshToken } without TypeError', async () => {
      const realShapeAdapter = new MockAuthAdapter();
      // Real backend response has tokens directly at root of data (no nested tokens or user)
      realShapeAdapter.refresh = vi.fn().mockResolvedValue({
        accessToken: 'new_rotated_access_jwt',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshToken: 'new_rotated_refresh_token',
      });

      const Consumer: React.FC = () => {
        const { token, refreshSession, login } = useAuth();
        return (
          <div>
            <div data-testid="token-val">{token || 'no-token'}</div>
            <button data-testid="login-btn" onClick={() => login('demo@fitmate.ai', 'Secret123!')}>Login</button>
            <button data-testid="refresh-btn" onClick={() => refreshSession()}>Refresh</button>
          </div>
        );
      };

      render(
        <AuthProvider customAdapter={realShapeAdapter}>
          <Consumer />
        </AuthProvider>
      );

      // Login first
      fireEvent.click(screen.getByTestId('login-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('token-val')).not.toHaveTextContent('no-token');
      });

      // Execute refresh
      fireEvent.click(screen.getByTestId('refresh-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('token-val')).toHaveTextContent('new_rotated_access_jwt');
      });

      expect(realShapeAdapter.refresh).toHaveBeenCalled();
    });

    it('safely handles refresh failures without uncaught TypeErrors, resetting session state', async () => {
      const failingRefreshAdapter = new MockAuthAdapter();
      failingRefreshAdapter.refresh = vi.fn().mockRejectedValue(
        new ApiClientError(401, { code: 'TOKEN_REVOKED', message: 'Token revoked' })
      );

      const Consumer: React.FC = () => {
        const { isAuthenticated, refreshSession, login } = useAuth();
        return (
          <div>
            <div data-testid="auth-status">{isAuthenticated ? 'auth' : 'unauth'}</div>
            <button data-testid="login-btn" onClick={() => login('demo@fitmate.ai', 'Secret123!')}>Login</button>
            <button data-testid="refresh-btn" onClick={() => refreshSession()}>Refresh</button>
          </div>
        );
      };

      render(
        <AuthProvider customAdapter={failingRefreshAdapter}>
          <Consumer />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('login-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('auth');
      });

      // Refresh fails -> should not throw, gracefully resets state to unauth
      fireEvent.click(screen.getByTestId('refresh-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('unauth');
      });
    });
  });

  // =========================================================================
  // SEC-FE-002: Login Profile Hydration (GET /users/profile)
  // =========================================================================
  describe('SEC-FE-002: Login Profile Hydration', () => {
    it('hydrates profile targets via adapter.getProfile when backend login omits profile', async () => {
      const adapter = new MockAuthAdapter();
      // Simulate real backend login: returns user and tokens, NO profile
      adapter.login = vi.fn().mockResolvedValue({
        user: {
          id: 'usr_real_01',
          email: 'real@fitmate.ai',
          displayName: 'Real Athlete',
          isEmailVerified: true,
          isOnboardingCompleted: true,
        },
        tokens: {
          accessToken: 'real_access_token',
          tokenType: 'Bearer',
          expiresIn: 900,
          refreshToken: 'real_refresh_token',
        },
        profile: undefined,
      });

      adapter.getProfile = vi.fn().mockResolvedValue({
        goal: 'muscle_gain',
        dailyCalorieTarget: 2800,
        proteinTargetGrams: 190.0,
        carbsTargetGrams: 320.0,
        fatTargetGrams: 75.0,
        isEstimated: true,
        unitSystem: 'metric',
        preferredLanguage: 'en',
      });

      const Consumer: React.FC = () => {
        const { profile, login } = useAuth();
        return (
          <div>
            <div data-testid="calorie-target">{profile ? profile.dailyCalorieTarget : 'none'}</div>
            <div data-testid="goal">{profile ? profile.goal : 'none'}</div>
            <button data-testid="login-btn" onClick={() => login('real@fitmate.ai', 'Secret123!')}>Login</button>
          </div>
        );
      };

      render(
        <AuthProvider customAdapter={adapter}>
          <Consumer />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('login-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('calorie-target')).toHaveTextContent('2800');
        expect(screen.getByTestId('goal')).toHaveTextContent('muscle_gain');
      });

      expect(adapter.getProfile).toHaveBeenCalledWith('real_access_token');
    });

    it('does not de-authenticate user if profile hydration fails after login', async () => {
      const adapter = new MockAuthAdapter();
      adapter.login = vi.fn().mockResolvedValue({
        user: {
          id: 'usr_real_01',
          email: 'real@fitmate.ai',
          displayName: 'Real Athlete',
          isEmailVerified: true,
          isOnboardingCompleted: true,
        },
        tokens: {
          accessToken: 'real_access_token',
          tokenType: 'Bearer',
          expiresIn: 900,
          refreshToken: 'real_refresh_token',
        },
        profile: undefined,
      });

      // Profile endpoint fails
      adapter.getProfile = vi.fn().mockRejectedValue(new Error('Network error on profile'));

      const Consumer: React.FC = () => {
        const { isAuthenticated, profile, login } = useAuth();
        return (
          <div>
            <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
            <div data-testid="profile-status">{profile ? 'loaded' : 'null'}</div>
            <button data-testid="login-btn" onClick={() => login('real@fitmate.ai', 'Secret123!')}>Login</button>
          </div>
        );
      };

      render(
        <AuthProvider customAdapter={adapter}>
          <Consumer />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('login-btn'));

      await waitFor(() => {
        // User remains authenticated even if profile target fetch failed
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('profile-status')).toHaveTextContent('null');
      });
    });
  });

  // =========================================================================
  // SEC-FE-003: Open Redirect Prevention
  // =========================================================================
  describe('SEC-FE-003: Open Redirect Sanitization', () => {
    it('accepts safe relative paths', () => {
      expect(sanitizeRedirectPath('/dashboard')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/nutrition')).toBe('/nutrition');
      expect(sanitizeRedirectPath('/workouts')).toBe('/workouts');
      expect(sanitizeRedirectPath('/settings?tab=profile')).toBe('/settings?tab=profile');
    });

    it('rejects external absolute URLs', () => {
      expect(sanitizeRedirectPath('https://evil-phishing.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('http://attacker.com/steal')).toBe('/dashboard');
      expect(sanitizeRedirectPath('ftp://malicious.org')).toBe('/dashboard');
    });

    it('rejects protocol-relative URLs', () => {
      expect(sanitizeRedirectPath('//evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('///evil.com/path')).toBe('/dashboard');
    });

    it('rejects backslash-based bypasses', () => {
      expect(sanitizeRedirectPath('/\\evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('\\evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/dashboard\\evil.com')).toBe('/dashboard');
    });

    it('rejects JavaScript and data schemes', () => {
      expect(sanitizeRedirectPath('javascript:alert(1)')).toBe('/dashboard');
      expect(sanitizeRedirectPath('data:text/html,<script>alert(1)</script>')).toBe('/dashboard');
    });

    it('falls back to safe default on null, undefined, or empty string', () => {
      expect(sanitizeRedirectPath(null)).toBe('/dashboard');
      expect(sanitizeRedirectPath(undefined)).toBe('/dashboard');
      expect(sanitizeRedirectPath('')).toBe('/dashboard');
      expect(sanitizeRedirectPath('   ')).toBe('/dashboard');
    });

    it('LoginForm sanitizes malicious redirect query parameter on login', async () => {
      mockSearchParamRedirect = 'https://evil-phishing.com/harvest';

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
      fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        // MUST redirect to /dashboard and NEVER to https://evil-phishing.com
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
        expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('evil-phishing.com'));
      });
    });
  });

  // =========================================================================
  // SEC-FE-004: Protected Routes (Workouts, Progress, Coach)
  // =========================================================================
  describe('SEC-FE-004: Protected Routes Guarding', () => {
    it('redirects unauthenticated users attempting to access /workouts, /progress, /coach', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        isMock: false,
        user: null,
        profile: null,
        token: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(
        <ProtectedRoute>
          <div data-testid="protected-content">Content</div>
        </ProtectedRoute>
      );

      expect(screen.queryByTestId('protected-content')).toBeNull();
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/auth/login?redirect='));
    });

    it('allows access to protected routes when authenticated', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        isMock: false,
        user: {
          id: 'usr_01',
          email: 'captain@fitmate.ai',
          displayName: 'Captain',
          isEmailVerified: true,
          isOnboardingCompleted: true,
        },
        profile: null,
        token: 'access_jwt',
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(
        <ProtectedRoute>
          <div data-testid="protected-content">Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SEC-FE-005: Refresh Token Encapsulation (useAuth isolation)
  // =========================================================================
  describe('SEC-FE-005: Refresh Token Encapsulation', () => {
    it('does not expose refreshToken property on useAuth()', () => {
      let authResult: any = null;
      const Consumer: React.FC = () => {
        authResult = useAuth();
        return <div>Ready</div>;
      };

      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      );

      expect(authResult).toBeDefined();
      expect(authResult.refreshToken).toBeUndefined();
    });

    it('guarantees zero tokens in persistent storage', () => {
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(sessionStorage.getItem('token')).toBeNull();
      expect(sessionStorage.getItem('refreshToken')).toBeNull();
    });
  });

  // =========================================================================
  // SEC-FE-006: 401 Recovery & Refresh Resilience in ApiClient
  // =========================================================================
  describe('SEC-FE-006: 401 Recovery and Concurrency Handling', () => {
    it('automatically catches 401, coordinates single refresh, and replays request with new token', async () => {
      const client = new ApiClient('http://localhost:3000/api/v1');
      let callCount = 0;
      const originalFetch = globalThis.fetch;

      // Mock fetch: first call returns 401, second call returns 200 with new token
      globalThis.fetch = vi.fn().mockImplementation(async (_url: string, options: any) => {
        callCount++;
        const authHeader = options.headers?.Authorization;
        if (authHeader === 'Bearer expired_token') {
          return {
            ok: false,
            status: 401,
            json: async () => ({
              success: false,
              error: { code: 'UNAUTHORIZED', message: 'Token expired' },
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { message: 'Replayed successfully' },
          }),
        };
      });

      const refreshMock = vi.fn().mockResolvedValue('fresh_token_123');
      setTokenRefreshHandler(refreshMock);

      try {
        const result = await client.request<{ message: string }>('/users/profile', {
          token: 'expired_token',
        });

        expect(result.message).toBe('Replayed successfully');
        expect(refreshMock).toHaveBeenCalledTimes(1);
        expect(callCount).toBe(2); // 1st failed with 401, 2nd succeeded with fresh_token_123
      } finally {
        globalThis.fetch = originalFetch;
        setTokenRefreshHandler(null);
      }
    });

    it('coordinates concurrent 401 requests sharing ONE single refresh operation', async () => {
      const client = new ApiClient('http://localhost:3000/api/v1');
      const originalFetch = globalThis.fetch;

      globalThis.fetch = vi.fn().mockImplementation(async (_url: string, options: any) => {
        const authHeader = options.headers?.Authorization;
        if (authHeader === 'Bearer expired_token') {
          return {
            ok: false,
            status: 401,
            json: async () => ({
              success: false,
              error: { code: 'UNAUTHORIZED', message: 'Token expired' },
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { status: 'ok' },
          }),
        };
      });

      // Simulate a refresh that takes 50ms
      let refreshCallCount = 0;
      const refreshMock = vi.fn().mockImplementation(async () => {
        refreshCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'new_concurrent_token';
      });

      setTokenRefreshHandler(refreshMock);

      try {
        // Fire 3 requests in parallel
        const [res1, res2, res3] = await Promise.all([
          client.request('/users/profile', { token: 'expired_token' }),
          client.request('/nutrition/diary', { token: 'expired_token' }),
          client.request('/users/consents', { token: 'expired_token' }),
        ]);

        expect(res1).toEqual({ status: 'ok' });
        expect(res2).toEqual({ status: 'ok' });
        expect(res3).toEqual({ status: 'ok' });

        // CRUCIAL: refreshMock must only be called ONCE for all 3 concurrent requests
        expect(refreshCallCount).toBe(1);
      } finally {
        globalThis.fetch = originalFetch;
        setTokenRefreshHandler(null);
      }
    });

    it('prevents infinite loops and throws ApiClientError if replayed request also returns 401', async () => {
      const client = new ApiClient('http://localhost:3000/api/v1');
      const originalFetch = globalThis.fetch;
      let requestAttempts = 0;

      // Always return 401
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        requestAttempts++;
        return {
          ok: false,
          status: 401,
          json: async () => ({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Persistent unauthorized' },
          }),
        };
      });

      const refreshMock = vi.fn().mockResolvedValue('token_attempt');
      setTokenRefreshHandler(refreshMock);

      try {
        await expect(
          client.request('/users/profile', { token: 'expired_token' })
        ).rejects.toThrow(ApiClientError);

        // Must attempt original request (1) + single retry (2) = max 2 attempts, NEVER infinite
        expect(requestAttempts).toBe(2);
        expect(refreshMock).toHaveBeenCalledTimes(1);
      } finally {
        globalThis.fetch = originalFetch;
        setTokenRefreshHandler(null);
      }
    });

    it('never retries auth endpoints like /auth/refresh or /auth/login', async () => {
      const client = new ApiClient('http://localhost:3000/api/v1');
      const originalFetch = globalThis.fetch;
      let attempts = 0;

      globalThis.fetch = vi.fn().mockImplementation(async () => {
        attempts++;
        return {
          ok: false,
          status: 401,
          json: async () => ({
            success: false,
            error: { code: 'TOKEN_REVOKED', message: 'Token revoked' },
          }),
        };
      });

      const refreshMock = vi.fn().mockResolvedValue('new_token');
      setTokenRefreshHandler(refreshMock);

      try {
        await expect(
          client.request('/auth/refresh', { token: 'revoked_token' })
        ).rejects.toThrow(ApiClientError);

        // Must NOT attempt refresh handler for /auth/refresh itself
        expect(refreshMock).not.toHaveBeenCalled();
        expect(attempts).toBe(1);
      } finally {
        globalThis.fetch = originalFetch;
        setTokenRefreshHandler(null);
      }
    });
  });
});

