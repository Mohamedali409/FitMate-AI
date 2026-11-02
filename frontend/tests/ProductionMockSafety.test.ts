import { describe, it, expect, vi } from 'vitest';
import { shouldUseMocks } from '../src/lib/config/env';
import { RealAuthAdapter } from '../src/lib/api/auth.adapter';
import { ApiClientError } from '../src/lib/api/client';

describe('Production Mock Safety (AUD-FE-001 Remediation)', () => {
  describe('shouldUseMocks()', () => {
    it('MUST default to false in production when NEXT_PUBLIC_USE_MOCKS is omitted (AUD-FE-001)', () => {
      // Production with undefined or empty string env var
      expect(shouldUseMocks('production', undefined)).toBe(false);
      expect(shouldUseMocks('production', '')).toBe(false);
    });

    it('MUST return false in production when NEXT_PUBLIC_USE_MOCKS is explicitly "false"', () => {
      expect(shouldUseMocks('production', 'false')).toBe(false);
      expect(shouldUseMocks('production', 'FALSE')).toBe(false);
    });

    it('MUST allow explicit opt-in only if NEXT_PUBLIC_USE_MOCKS is explicitly "true" in production', () => {
      expect(shouldUseMocks('production', 'true')).toBe(true);
      expect(shouldUseMocks('production', 'TRUE')).toBe(true);
    });

    it('should default to true in development for preview/demo ergonomics when unset', () => {
      expect(shouldUseMocks('development', undefined)).toBe(true);
      expect(shouldUseMocks('development', '')).toBe(true);
    });

    it('should allow disabling mocks in development by setting NEXT_PUBLIC_USE_MOCKS="false"', () => {
      expect(shouldUseMocks('development', 'false')).toBe(false);
      expect(shouldUseMocks('development', '0')).toBe(false);
    });

    it('should default to true in test environment unless explicitly disabled', () => {
      expect(shouldUseMocks('test', undefined)).toBe(true);
      expect(shouldUseMocks('test', 'false')).toBe(false);
    });
  });

  describe('RealAuthAdapter Failure Handling (No Silent Fallback)', () => {
    it('MUST NOT silently fall back to MockAuthAdapter when API calls fail', async () => {
      const realAdapter = new RealAuthAdapter();
      expect(realAdapter.isMock).toBe(false);

      // Mock fetch to simulate 401 INVALID_CREDENTIALS response from backend
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
            details: [],
          },
          timestamp: new Date().toISOString(),
          path: '/api/v1/auth/login',
        }),
      } as unknown as Response);

      try {
        let threwError = false;
        try {
          await realAdapter.login('nonexistent@fitmate.ai', 'WrongPassword123!');
        } catch (err: unknown) {
          threwError = true;
          expect(err).toBeInstanceOf(ApiClientError);
          const apiErr = err as ApiClientError;
          expect(apiErr.code).toBe('INVALID_CREDENTIALS');
          expect(apiErr.statusCode).toBe(401);
        }
        expect(threwError).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('MUST NOT silently fall back on network error', async () => {
      const realAdapter = new RealAuthAdapter();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (ECONNREFUSED)'));

      try {
        let threwError = false;
        try {
          await realAdapter.login('demo@fitmate.ai', 'Secret123!');
        } catch (err: unknown) {
          threwError = true;
          expect(err).toBeInstanceOf(ApiClientError);
          const apiErr = err as ApiClientError;
          expect(apiErr.code).toBe('NETWORK_ERROR');
          expect(apiErr.message).toContain('Network request failed');
        }
        expect(threwError).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
