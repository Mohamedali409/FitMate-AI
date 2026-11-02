import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import { authRepository, AuthRepository } from './auth.repository.js';
import { usersRepository, UsersRepository } from '../users/users.repository.js';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateRefreshTokenString,
  hashToken,
  hashIp,
  truncateUserAgent,
  encryptSuccessorToken,
  decryptSuccessorToken,
} from './auth.utils.js';
import { AppError, ErrorCode } from '../../shared/errors/AppError.js';
import { supportsReplicaSetTransactions } from '../../infrastructure/database.js';
import {
  RegisterInput,
  LoginInput,
  OAuthInput,
  RefreshInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from './dto/auth.dto.js';
import { env } from '../../config/env.js';

export function calculateEnergyTargets(params: {
  weightKg: number;
  heightCm: number;
  birthDate: string;
  biologicalSex: 'male' | 'female' | 'prefer_not_to_say';
  activityMultiplier: number;
  goal: 'fat_loss' | 'muscle_gain' | 'recomposition' | 'maintenance' | 'general_fitness' | 'undecided';
}) {
  const birthYear = new Date(params.birthDate).getFullYear();
  const age = Math.max(13, new Date().getFullYear() - birthYear);

  // DEC-005: Mifflin-St Jeor sex constant: male +5, female -161, prefer_not_to_say -78
  let s = -78;
  if (params.biologicalSex === 'male') s = 5;
  else if (params.biologicalSex === 'female') s = -161;

  const bmr = 10 * params.weightKg + 6.25 * params.heightCm - 5 * age + s;
  const tdee = bmr * params.activityMultiplier;

  let targetCalories = tdee;
  let proteinFactor = 1.6;

  switch (params.goal) {
    case 'fat_loss':
      targetCalories = Math.max(1200, tdee - 500);
      proteinFactor = 1.8;
      break;
    case 'muscle_gain':
      targetCalories = tdee + 300;
      proteinFactor = 2.0;
      break;
    case 'recomposition':
      targetCalories = Math.max(1200, tdee - 200);
      proteinFactor = 2.0;
      break;
    default:
      targetCalories = tdee;
      proteinFactor = 1.6;
      break;
  }

  const dailyCalorieTarget = Math.round(targetCalories);
  const proteinTargetGrams = Math.round(params.weightKg * proteinFactor * 10) / 10;
  const fatCalories = dailyCalorieTarget * 0.25;
  const fatTargetGrams = Math.round((fatCalories / 9) * 10) / 10;
  const carbCalories = Math.max(0, dailyCalorieTarget - proteinTargetGrams * 4 - fatTargetGrams * 9);
  const carbsTargetGrams = Math.round((carbCalories / 4) * 10) / 10;

  return {
    dailyCalorieTarget,
    proteinTargetGrams,
    carbsTargetGrams,
    fatTargetGrams,
    isEstimated: true as const, // Core Invariant 2
  };
}

export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private authRepo: AuthRepository = authRepository,
    private usersRepo: UsersRepository = usersRepository,
    googleClient?: OAuth2Client
  ) {
    this.googleClient = googleClient || new OAuth2Client();
  }

  async register(input: RegisterInput, ip: string, userAgent: string) {
    const existing = await this.authRepo.findUserByEmail(input.email);
    if (existing) {
      throw AppError.conflict('Email is already registered.', ErrorCode.EMAIL_ALREADY_EXISTS);
    }

    const targets = calculateEnergyTargets({
      weightKg: input.onboarding.weightKg,
      heightCm: input.onboarding.heightCm,
      birthDate: input.onboarding.birthDate,
      biologicalSex: input.onboarding.biologicalSex,
      activityMultiplier: input.onboarding.activityMultiplier,
      goal: input.onboarding.goal,
    });

    const hashedPassword = await hashPassword(input.password);
    const useTransactions = supportsReplicaSetTransactions();
    const session = useTransactions ? await mongoose.startSession() : undefined;

    try {
      if (session) session.startTransaction();

      // 1. Create User
      const user = await this.authRepo.createUser(
        {
          email: input.email,
          status: 'active',
          isEmailVerified: false,
          tokenVersion: 0,
        },
        session
      );

      // 2. Create User Identity (Local)
      await this.authRepo.createIdentity(
        {
          userId: user._id,
          provider: 'local',
          providerUserId: input.email.toLowerCase().trim(),
          passwordHash: hashedPassword,
          isPrimary: true,
          lastAuthenticatedAt: new Date(),
        },
        session
      );

      // 3. Create User Profile
      const birthDateObj = new Date(input.onboarding.birthDate);
      const profile = await this.usersRepo.createProfile(
        {
          userId: user._id,
          displayName: input.displayName || input.email.split('@')[0],
          isOnboardingCompleted: true,
          unitSystem: input.onboarding.unitSystem,
          preferredLanguage: input.onboarding.preferredLanguage,
          goal: input.onboarding.goal,
          biologicalSex: input.onboarding.biologicalSex,
          birthDate: birthDateObj,
          heightCm: input.onboarding.heightCm,
          weightKg: input.onboarding.weightKg,
          weightRecordedAt: new Date(),
          activityMultiplier: input.onboarding.activityMultiplier,
          trainingExperience: input.onboarding.trainingExperience,
          dietaryPreference: input.onboarding.dietaryPreference,
          dailyCalorieTarget: targets.dailyCalorieTarget,
          proteinTargetGrams: targets.proteinTargetGrams,
          carbsTargetGrams: targets.carbsTargetGrams,
          fatTargetGrams: targets.fatTargetGrams,
          isTargetsCustomized: false,
          isEstimated: true,
          targetsCalculatedAt: new Date(),
          calculationVersion: 'mifflin_st_jeor_v1',
        },
        session
      );

      // 4. Create Initial BodyWeightEntry (ADR-006, ADR-013)
      await this.usersRepo.createWeightEntry(
        {
          userId: user._id,
          weightKg: input.onboarding.weightKg,
          date: new Date(),
          source: 'onboarding_baseline',
        },
        session
      );

      // 5. Create Mandatory Legal Consent Records
      const ipHashed = hashIp(ip);
      const truncatedUA = truncateUserAgent(userAgent);
      await this.usersRepo.createConsentRecord(
        {
          userId: user._id,
          consentType: 'health_disclaimer',
          action: 'accepted',
          hasAccepted: true,
          disclaimerVersion: '1.0.0',
          recordedAt: new Date(),
          ipHash: ipHashed,
          userAgentTruncated: truncatedUA,
        },
        session
      );
      await this.usersRepo.createConsentRecord(
        {
          userId: user._id,
          consentType: 'terms_of_service',
          action: 'accepted',
          hasAccepted: true,
          disclaimerVersion: '1.0.0',
          recordedAt: new Date(),
          ipHash: ipHashed,
          userAgentTruncated: truncatedUA,
        },
        session
      );

      // 6. Generate Session Tokens
      const rawRefreshToken = generateRefreshTokenString();
      const hashedRefreshToken = hashToken(rawRefreshToken);
      const tokenFamily = randomUUID();
      const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

      await this.authRepo.createRefreshToken(
        {
          userId: user._id,
          hashedToken: hashedRefreshToken,
          tokenFamily,
          isRevoked: false,
          expiresAt,
          truncatedUserAgent: truncatedUA,
          ipHash: ipHashed,
        },
        session
      );

      if (session) await session.commitTransaction();

      const accessToken = signAccessToken({
        userId: user._id.toString(),
        email: user.email,
        tokenVersion: user.tokenVersion,
      });

      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          displayName: profile.displayName,
          isEmailVerified: user.isEmailVerified,
          isOnboardingCompleted: true,
        },
        tokens: {
          accessToken,
          tokenType: 'Bearer',
          expiresIn: env.JWT_ACCESS_EXPIRES_IN,
          refreshToken: rawRefreshToken,
        },
        profile: {
          goal: profile.goal,
          dailyCalorieTarget: profile.dailyCalorieTarget,
          proteinTargetGrams: profile.proteinTargetGrams,
          carbsTargetGrams: profile.carbsTargetGrams,
          fatTargetGrams: profile.fatTargetGrams,
          isEstimated: true,
          unitSystem: profile.unitSystem,
          preferredLanguage: profile.preferredLanguage,
        },
      };
    } catch (err) {
      if (session) await session.abortTransaction();
      throw err;
    } finally {
      if (session) await session.endSession();
    }
  }

  async login(input: LoginInput, ip: string, userAgent: string) {
    const user = await this.authRepo.findUserByEmail(input.email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password.', ErrorCode.INVALID_CREDENTIALS);
    }

    if (user.status === 'pending_deletion' || user.status === 'deleting') {
      throw AppError.forbidden('Account is pending deletion.', ErrorCode.ACCOUNT_PENDING_DELETION);
    }
    if (user.status === 'suspended') {
      throw AppError.forbidden('Account is suspended.', ErrorCode.ACCOUNT_SUSPENDED);
    }

    const identity = await this.authRepo.findIdentityByProvider('local', input.email, undefined, true);
    if (!identity || !identity.passwordHash) {
      throw AppError.unauthorized('Invalid email or password.', ErrorCode.INVALID_CREDENTIALS);
    }

    const isValid = await verifyPassword(input.password, identity.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password.', ErrorCode.INVALID_CREDENTIALS);
    }

    // Update last authenticated timestamp
    identity.lastAuthenticatedAt = new Date();
    await identity.save();

    const profile = await this.usersRepo.findProfileByUserId(user._id);

    const rawRefreshToken = generateRefreshTokenString();
    const hashedRefreshToken = hashToken(rawRefreshToken);
    const tokenFamily = randomUUID();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await this.authRepo.createRefreshToken({
      userId: user._id,
      hashedToken: hashedRefreshToken,
      tokenFamily,
      isRevoked: false,
      expiresAt,
      truncatedUserAgent: truncateUserAgent(userAgent),
      ipHash: hashIp(ip),
    });

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: profile?.displayName || user.email.split('@')[0],
        isOnboardingCompleted: profile?.isOnboardingCompleted ?? false,
      },
      tokens: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshToken: rawRefreshToken,
      },
    };
  }

  async oauthGoogle(input: OAuthInput, ip: string, userAgent: string) {
    let payload;
    try {
      // In production and non-test environments, strictly verify with Google OAuth2Client.
      // Mock tokens are strictly restricted to NODE_ENV === 'test'.
      if (env.NODE_ENV === 'test' && input.idToken.startsWith('mock-google-token-')) {
        const parts = input.idToken.split('-');
        const email = parts[3] || 'test@example.com';
        const sub = parts[4] || '123456789';
        payload = { email, sub, email_verified: true, name: 'Google User' };
      } else {
        const ticket = await this.googleClient.verifyIdToken({
          idToken: input.idToken,
        });
        payload = ticket.getPayload();
      }
    } catch {
      throw AppError.unauthorized('Invalid Google ID token.', ErrorCode.INVALID_OAUTH_TOKEN);
    }

    if (!payload || !payload.email || !payload.sub) {
      throw AppError.unauthorized('Malformed Google ID token payload.', ErrorCode.INVALID_OAUTH_TOKEN);
    }

    if (!payload.email_verified) {
      throw AppError.badRequest('Google account email is not verified.', ErrorCode.INVALID_OAUTH_TOKEN);
    }

    const sub = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const displayName = payload.name || email.split('@')[0];

    let identity = await this.authRepo.findIdentityByProvider('google', sub);
    let user = identity ? await this.authRepo.findUserById(identity.userId) : null;
    let isNewUser = false;

    if (!identity) {
      // Check if user with same email exists
      let existingUser = await this.authRepo.findUserByEmail(email);

      if (existingUser) {
        // Link Google identity to existing user (DB-021)
        identity = await this.authRepo.createIdentity({
          userId: existingUser._id,
          provider: 'google',
          providerUserId: sub,
          isPrimary: false,
          lastAuthenticatedAt: new Date(),
        });

        if (!existingUser.isEmailVerified) {
          existingUser.isEmailVerified = true;
          await existingUser.save();
        }
        user = existingUser;
      } else {
        // Create new user and skeletal profile (DB-026)
        isNewUser = true;
        user = await this.authRepo.createUser({
          email,
          status: 'active',
          isEmailVerified: true,
          tokenVersion: 0,
        });

        identity = await this.authRepo.createIdentity({
          userId: user._id,
          provider: 'google',
          providerUserId: sub,
          isPrimary: true,
          lastAuthenticatedAt: new Date(),
        });

        await this.usersRepo.createProfile({
          userId: user._id,
          displayName,
          isOnboardingCompleted: false, // Skeletal profile awaiting onboarding completion (DB-026)
          unitSystem: 'metric',
          preferredLanguage: input.preferredLanguage || 'en',
        });
      }
    } else {
      identity.lastAuthenticatedAt = new Date();
      await identity.save();
    }

    if (!user) {
      throw AppError.unauthorized('User not found.', ErrorCode.UNAUTHORIZED);
    }

    if (user.status === 'suspended') {
      throw AppError.forbidden('Account is suspended.', ErrorCode.ACCOUNT_SUSPENDED);
    }

    const profile = await this.usersRepo.findProfileByUserId(user._id);

    const rawRefreshToken = generateRefreshTokenString();
    const hashedRefreshToken = hashToken(rawRefreshToken);
    const tokenFamily = randomUUID();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await this.authRepo.createRefreshToken({
      userId: user._id,
      hashedToken: hashedRefreshToken,
      tokenFamily,
      isRevoked: false,
      expiresAt,
      truncatedUserAgent: truncateUserAgent(userAgent),
      ipHash: hashIp(ip),
    });

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    return {
      isNewUser,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: profile?.displayName || displayName,
        isEmailVerified: user.isEmailVerified,
        isOnboardingCompleted: profile?.isOnboardingCompleted ?? false,
      },
      tokens: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshToken: rawRefreshToken,
      },
    };
  }

  async refresh(input: RefreshInput, ip: string, userAgent: string) {
    const incomingHash = hashToken(input.refreshToken);
    const tokenDoc = await this.authRepo.findRefreshTokenByHash(incomingHash, undefined, true);

    if (!tokenDoc) {
      throw AppError.unauthorized('Invalid or expired refresh token.', ErrorCode.TOKEN_REVOKED);
    }

    // Application-level expiration check (DB-023)
    if (tokenDoc.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token has expired.', ErrorCode.TOKEN_EXPIRED);
    }

    // Check if token is already revoked
    if (tokenDoc.isRevoked) {
      // 30-Second Grace Period Check (DB-036)
      const now = Date.now();
      const rotatedAtMs = tokenDoc.rotatedAt ? tokenDoc.rotatedAt.getTime() : 0;
      const isWithinGraceWindow =
        tokenDoc.revocationReason === 'rotation' && now - rotatedAtMs <= 30_000;

      if (isWithinGraceWindow && tokenDoc.encryptedSuccessorToken) {
        // Re-deliver successor token safely
        const recoveredToken = decryptSuccessorToken(tokenDoc.encryptedSuccessorToken);
        const user = await this.authRepo.findUserById(tokenDoc.userId);
        if (!user || user.status === 'suspended') {
          throw AppError.unauthorized('User session is no longer active.', ErrorCode.TOKEN_REVOKED);
        }

        const accessToken = signAccessToken({
          userId: user._id.toString(),
          email: user.email,
          tokenVersion: user.tokenVersion,
        });

        return {
          accessToken,
          tokenType: 'Bearer',
          expiresIn: env.JWT_ACCESS_EXPIRES_IN,
          refreshToken: recoveredToken,
        };
      }

      // Outside grace period: REUSE ATTACK DETECTED! (DB-037)
      await this.authRepo.revokeTokenFamily(tokenDoc.tokenFamily, 'reuse_detected');
      await this.authRepo.incrementTokenVersion(tokenDoc.userId);

      throw AppError.unauthorized(
        'Token reuse detected. All active sessions have been terminated.',
        ErrorCode.TOKEN_REUSE_DETECTED
      );
    }

    // Active unrevoked token: execute atomic rotation (DB-037)
    const newRawRefreshToken = generateRefreshTokenString();
    const newHashedToken = hashToken(newRawRefreshToken);
    const encryptedSuccessor = encryptSuccessorToken(newRawRefreshToken);

    const rotatedDoc = await this.authRepo.atomicRotateToken(
      incomingHash,
      newHashedToken,
      encryptedSuccessor
    );

    if (!rotatedDoc) {
      // Race condition: another concurrent request just rotated this token.
      // Re-query and let grace period recovery handle it.
      const freshDoc = await this.authRepo.findRefreshTokenByHash(incomingHash, undefined, true);
      if (freshDoc?.encryptedSuccessorToken) {
        const recovered = decryptSuccessorToken(freshDoc.encryptedSuccessorToken);
        const user = await this.authRepo.findUserById(freshDoc.userId);
        const accessToken = signAccessToken({
          userId: user!._id.toString(),
          email: user!.email,
          tokenVersion: user!.tokenVersion,
        });
        return {
          accessToken,
          tokenType: 'Bearer',
          expiresIn: env.JWT_ACCESS_EXPIRES_IN,
          refreshToken: recovered,
        };
      }
      throw AppError.unauthorized('Concurrent token refresh failure.', ErrorCode.TOKEN_REVOKED);
    }

    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    await this.authRepo.createRefreshToken({
      userId: tokenDoc.userId,
      hashedToken: newHashedToken,
      tokenFamily: tokenDoc.tokenFamily,
      isRevoked: false,
      expiresAt,
      truncatedUserAgent: truncateUserAgent(userAgent),
      ipHash: hashIp(ip),
    });

    const user = await this.authRepo.findUserById(tokenDoc.userId);
    if (!user || user.status === 'suspended') {
      throw AppError.unauthorized('User session is invalid.', ErrorCode.TOKEN_REVOKED);
    }

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshToken: newRawRefreshToken,
    };
  }

  async logout(refreshTokenString: string) {
    const hashed = hashToken(refreshTokenString);
    await this.authRepo.revokeSingleToken(hashed, 'logout');
    return { message: 'Session successfully terminated.' };
  }

  async forgotPassword(email: string, ip: string) {
    const user = await this.authRepo.findUserByEmail(email);
    if (user && user.status === 'active') {
      const resetToken = generateRefreshTokenString();
      const hashedToken = hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.authRepo.createPasswordResetToken({
        userId: user._id,
        hashedToken,
        expiresAt,
        ipHash: hashIp(ip),
      });

      // Anti-enumeration: In production, send email asynchronously.
      // If running in development/test, token can be logged or returned internally
    }

    return {
      message: 'If an account matches this email, reset instructions have been dispatched.',
    };
  }

  async resetPassword(input: ResetPasswordInput, _ip: string) {
    const hashedToken = hashToken(input.token);
    const resetTokenDoc = await this.authRepo.findValidPasswordResetToken(hashedToken);

    if (!resetTokenDoc) {
      throw AppError.badRequest(
        'Invalid or expired password reset token.',
        ErrorCode.INVALID_RESET_TOKEN
      );
    }

    await this.authRepo.consumePasswordResetToken(resetTokenDoc._id);

    const newHashedPassword = await hashPassword(input.newPassword);
    await this.authRepo.updatePasswordHash(resetTokenDoc.userId, newHashedPassword);

    // Global session invalidation (DB-039, DB-040)
    await this.authRepo.incrementTokenVersion(resetTokenDoc.userId);
    await this.authRepo.revokeUserTokens(resetTokenDoc.userId, 'password_reset');

    return {
      message: 'Password updated successfully. Please log in with your new credentials.',
    };
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const identities = await this.authRepo.findIdentitiesByUserId(userId);
    const localIdentity = identities.find((id) => id.provider === 'local');

    if (!localIdentity) {
      throw AppError.badRequest('No password set on this account.', ErrorCode.BAD_REQUEST);
    }

    // Need password hash
    const fullIdentity = await this.authRepo.findIdentityByProvider(
      'local',
      localIdentity.providerUserId,
      undefined,
      true
    );

    if (!fullIdentity || !fullIdentity.passwordHash) {
      throw AppError.badRequest('No password set on this account.', ErrorCode.BAD_REQUEST);
    }

    const isValid = await verifyPassword(input.currentPassword, fullIdentity.passwordHash);
    if (!isValid) {
      throw AppError.badRequest('Current password is incorrect.', ErrorCode.INVALID_CREDENTIALS);
    }

    const newHash = await hashPassword(input.newPassword);
    await this.authRepo.updatePasswordHash(userId, newHash);

    // Global session revocation
    await this.authRepo.incrementTokenVersion(userId);
    await this.authRepo.revokeUserTokens(userId, 'password_reset');

    return {
      message: 'Password changed successfully. All other active sessions have been terminated.',
    };
  }

  async getMe(userId: string) {
    const user = await this.authRepo.findUserById(userId);
    if (!user) {
      throw AppError.notFound('User not found.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    const primaryIdentity = await this.authRepo.findPrimaryIdentity(userId);

    return {
      id: user._id.toString(),
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      provider: primaryIdentity?.provider || 'local',
      tokenVersion: user.tokenVersion,
      status: user.status,
    };
  }
}

export const authService = new AuthService();
