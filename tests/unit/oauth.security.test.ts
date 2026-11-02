import { describe, it, expect, vi } from 'vitest';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { AppError, ErrorCode } from '../../src/shared/errors/AppError.js';
import { env } from '../../src/config/env.js';
import { OAuth2Client } from 'google-auth-library';

describe('Google OAuth Security & Verification (Unit)', () => {
  const mockAuthRepo: any = {
    findUserByEmail: vi.fn(),
    findIdentityByProvider: vi.fn(),
    findUserById: vi.fn(),
    createUser: vi.fn(),
    createIdentity: vi.fn(),
    createRefreshToken: vi.fn(),
  };

  const mockUsersRepo: any = {
    findProfileByUserId: vi.fn().mockResolvedValue(null),
    createProfile: vi.fn(),
    recordConsent: vi.fn(),
  };

  it('should accept mock Google token strictly when NODE_ENV === "test"', async () => {
    expect(env.NODE_ENV).toBe('test');

    mockAuthRepo.findIdentityByProvider.mockResolvedValue(null);
    mockAuthRepo.findUserByEmail.mockResolvedValue(null);
    const mockUserDoc = {
      _id: '6725619b0f9488a4e3df5678',
      email: 'oauth.test@example.com',
      tokenVersion: 0,
      save: vi.fn(),
    };
    mockAuthRepo.createUser.mockResolvedValue(mockUserDoc);
    mockAuthRepo.createIdentity.mockResolvedValue({});
    mockAuthRepo.createRefreshToken.mockResolvedValue({});

    const authService = new AuthService(mockAuthRepo, mockUsersRepo);
    const result = await authService.oauthGoogle(
      {
        provider: 'google',
        idToken: 'mock-google-token-oauth.test@example.com-google_sub_12345',
      },
      '127.0.0.1',
      'JestAgent'
    );

    expect(result).toBeDefined();
    expect(result.user.email).toBe('oauth.test@example.com');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
  });

  it('should reject mock tokens when NODE_ENV is set to "production"', async () => {
    const originalEnv = env.NODE_ENV;
    try {
      (env as any).NODE_ENV = 'production';

      const authService = new AuthService(mockAuthRepo, mockUsersRepo);

      await expect(
        authService.oauthGoogle(
          {
            provider: 'google',
            idToken: 'mock-google-token-production.bypass@example.com-google_sub_99999',
          },
          '127.0.0.1',
          'AttackerAgent'
        )
      ).rejects.toThrow(AppError);

      try {
        await authService.oauthGoogle(
          {
            provider: 'google',
            idToken: 'mock-google-token-production.bypass@example.com-google_sub_99999',
          },
          '127.0.0.1',
          'AttackerAgent'
        );
      } catch (err: any) {
        expect(err.statusCode).toBe(401);
        expect(err.errorCode).toBe(ErrorCode.INVALID_OAUTH_TOKEN);
      }
    } finally {
      (env as any).NODE_ENV = originalEnv;
    }
  });

  it('should support dependency injection of custom OAuth2Client in AuthService', async () => {
    const mockGoogleClient = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({
          email: 'verified.google.user@example.com',
          sub: 'google_sub_verified_777',
          email_verified: true,
          name: 'Verified User',
        }),
      }),
    } as unknown as OAuth2Client;

    mockAuthRepo.findIdentityByProvider.mockResolvedValue(null);
    mockAuthRepo.findUserByEmail.mockResolvedValue(null);
    const mockUserDoc = {
      _id: '6725619b0f9488a4e3df7777',
      email: 'verified.google.user@example.com',
      tokenVersion: 0,
      save: vi.fn(),
    };
    mockAuthRepo.createUser.mockResolvedValue(mockUserDoc);
    mockAuthRepo.createIdentity.mockResolvedValue({});
    mockAuthRepo.createRefreshToken.mockResolvedValue({});

    const authService = new AuthService(mockAuthRepo, mockUsersRepo, mockGoogleClient);

    const result = await authService.oauthGoogle(
      {
        provider: 'google',
        idToken: 'real-verified-production-jwt-token-string',
      },
      '127.0.0.1',
      'ClientAgent'
    );

    expect(mockGoogleClient.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'real-verified-production-jwt-token-string',
    });
    expect(result.user.email).toBe('verified.google.user@example.com');
  });

  it('should reject unverified Google email with 400 INVALID_OAUTH_TOKEN', async () => {
    const mockGoogleClient = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({
          email: 'unverified@example.com',
          sub: 'google_sub_unverified',
          email_verified: false,
        }),
      }),
    } as unknown as OAuth2Client;

    const authService = new AuthService(mockAuthRepo, mockUsersRepo, mockGoogleClient);

    try {
      await authService.oauthGoogle(
        { provider: 'google', idToken: 'valid-signature-unverified-email-jwt' },
        '127.0.0.1',
        'ClientAgent'
      );
      expect.fail('Should have thrown error for unverified email');
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
      expect(err.errorCode).toBe(ErrorCode.INVALID_OAUTH_TOKEN);
      expect(err.message).toMatch(/not verified/i);
    }
  });

  it('should reject malformed Google payload missing email or sub with 401 INVALID_OAUTH_TOKEN', async () => {
    const mockGoogleClient = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({
          email_verified: true,
          // sub and email missing
        }),
      }),
    } as unknown as OAuth2Client;

    const authService = new AuthService(mockAuthRepo, mockUsersRepo, mockGoogleClient);

    try {
      await authService.oauthGoogle(
        { provider: 'google', idToken: 'valid-signature-missing-sub-jwt' },
        '127.0.0.1',
        'ClientAgent'
      );
      expect.fail('Should have thrown error for missing sub');
    } catch (err: any) {
      expect(err.statusCode).toBe(401);
      expect(err.errorCode).toBe(ErrorCode.INVALID_OAUTH_TOKEN);
    }
  });

  it('should reject invalid/tampered token when verification throws', async () => {
    const mockGoogleClient = {
      verifyIdToken: vi.fn().mockRejectedValue(new Error('Wrong signature')),
    } as unknown as OAuth2Client;

    const authService = new AuthService(mockAuthRepo, mockUsersRepo, mockGoogleClient);

    await expect(
      authService.oauthGoogle(
        { provider: 'google', idToken: 'tampered-or-expired-token' },
        '127.0.0.1',
        'ClientAgent'
      )
    ).rejects.toThrow(AppError);
  });
});

