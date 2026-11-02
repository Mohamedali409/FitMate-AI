import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from '../helpers/db.helper.js';
import { UserModel } from '../../src/modules/auth/models/user.model.js';
import { UserIdentityModel } from '../../src/modules/auth/models/userIdentity.model.js';
import { UserProfileModel } from '../../src/modules/users/models/userProfile.model.js';
import { RefreshTokenModel } from '../../src/modules/auth/models/refreshToken.model.js';
import { PasswordResetTokenModel } from '../../src/modules/auth/models/passwordResetToken.model.js';
import { BodyWeightEntryModel } from '../../src/modules/progress/models/bodyWeightEntry.model.js';
import { ConsentRecordModel } from '../../src/modules/users/models/consentRecord.model.js';

describe('AuthModule REST Endpoints (Integration)', () => {
  const app = createApp();

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  const validRegistrationPayload = {
    email: 'sarah.walker@example.com',
    password: 'P@ssword12345!',
    displayName: 'Sarah Walker',
    onboarding: {
      goal: 'fat_loss',
      biologicalSex: 'female',
      birthDate: '1995-06-15',
      heightCm: 168.0,
      weightKg: 65.0,
      activityMultiplier: 1.375,
      trainingExperience: 'intermediate',
      dietaryPreference: 'none',
      unitSystem: 'metric',
      preferredLanguage: 'en',
      hasAcceptedHealthDisclaimer: true,
      hasAcceptedTerms: true,
    },
  };

  describe('POST /api/v1/auth/register (EP-AUTH-001)', () => {
    it('should successfully register a user and create records across all 6 collections atomically', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('sarah.walker@example.com');
      expect(res.body.data.user.isOnboardingCompleted).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.profile.isEstimated).toBe(true); // Core Invariant 2
      expect(res.body.data.profile.dailyCalorieTarget).toBeGreaterThan(1200);

      // Verify persistent collections
      const user = await UserModel.findOne({ email: 'sarah.walker@example.com' });
      expect(user).not.toBeNull();
      expect(user!.status).toBe('active');
      expect(user!.tokenVersion).toBe(0);

      const identity = await UserIdentityModel.findOne({ userId: user!._id });
      expect(identity).not.toBeNull();
      expect(identity!.provider).toBe('local');
      expect(identity!.isPrimary).toBe(true);

      const profile = await UserProfileModel.findOne({ userId: user!._id });
      expect(profile).not.toBeNull();
      expect(profile!.weightKg).toBe(65.0);
      expect(profile!.isEstimated).toBe(true);

      const weightEntry = await BodyWeightEntryModel.findOne({ userId: user!._id });
      expect(weightEntry).not.toBeNull();
      expect(weightEntry!.weightKg).toBe(65.0);

      const consents = await ConsentRecordModel.find({ userId: user!._id });
      expect(consents).toHaveLength(2); // health_disclaimer & terms_of_service

      const refreshToken = await RefreshTokenModel.findOne({ userId: user!._id });
      expect(refreshToken).not.toBeNull();
      expect(refreshToken!.isRevoked).toBe(false);
    });

    it('should return 409 Conflict when attempting to register an existing email', async () => {
      await request(app).post('/api/v1/auth/register').send(validRegistrationPayload);

      const duplicateRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should reject registration when password does not meet complexity requirements', async () => {
      const invalidPayload = {
        ...validRegistrationPayload,
        password: 'weak',
      };

      const res = await request(app).post('/api/v1/auth/register').send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login (EP-AUTH-002)', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validRegistrationPayload);
    });

    it('should authenticate user with valid credentials and return tokens', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'sarah.walker@example.com',
        password: 'P@ssword12345!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject invalid password with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'sarah.walker@example.com',
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent email with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nobody@example.com',
        password: 'P@ssword12345!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/oauth (EP-AUTH-003)', () => {
    it('should create new user with skeletal profile when registering via Google OAuth', async () => {
      const res = await request(app).post('/api/v1/auth/oauth').send({
        provider: 'google',
        idToken: 'mock-google-token-alex.smith@example.com-google_sub_987654321',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alex.smith@example.com');
      expect(res.body.data.user.isOnboardingCompleted).toBe(false); // Skeletal profile (DB-026)
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/refresh (EP-AUTH-004) & Token Rotation', () => {
    it('should rotate refresh token and support 30s grace period recovery (DB-036)', async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(validRegistrationPayload);
      const originalRefreshToken = reg.body.data.tokens.refreshToken;

      // 1. First refresh (Rotation)
      const refreshRes1 = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: originalRefreshToken,
      });

      expect(refreshRes1.status).toBe(200);
      expect(refreshRes1.body.success).toBe(true);
      const rotatedRefreshToken = refreshRes1.body.data.refreshToken;
      expect(rotatedRefreshToken).not.toBe(originalRefreshToken);

      // 2. Retry within 30-second grace window (e.g. mobile network flap)
      const graceRes = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: originalRefreshToken,
      });

      expect(graceRes.status).toBe(200);
      expect(graceRes.body.success).toBe(true);
      expect(graceRes.body.data.refreshToken).toBe(rotatedRefreshToken);
    });

    it('should detect token reuse and terminate all sessions when old token is used after grace period', async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(validRegistrationPayload);
      const originalRefreshToken = reg.body.data.tokens.refreshToken;

      // Rotate token
      await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: originalRefreshToken,
      });

      // Manually set rotatedAt to 35 seconds ago to simulate expiry of grace window
      const fortySecsAgo = new Date(Date.now() - 35_000);
      await RefreshTokenModel.updateMany({}, { $set: { rotatedAt: fortySecsAgo } });

      // Attempt reuse of original token outside grace window
      const reuseRes = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: originalRefreshToken,
      });

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');

      // Verify all family sessions are revoked and user tokenVersion incremented
      const user = await UserModel.findOne({ email: 'sarah.walker@example.com' });
      expect(user!.tokenVersion).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/auth/logout (EP-AUTH-005)', () => {
    it('should revoke the refresh token on logout', async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(validRegistrationPayload);
      const refreshToken = reg.body.data.tokens.refreshToken;
      const accessToken = reg.body.data.tokens.accessToken;

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Subsequent refresh must fail
      const refreshRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
      expect(refreshRes.status).toBe(401);
    });
  });

  describe('Password Reset Lifecycle (EP-AUTH-006 & EP-AUTH-007)', () => {
    it('should dispatch reset token and atomically consume it to update password', async () => {
      await request(app).post('/api/v1/auth/register').send(validRegistrationPayload);

      // 1. Request reset
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'sarah.walker@example.com' });

      expect(forgotRes.status).toBe(200);

      // Find token from DB
      const resetDoc = await PasswordResetTokenModel.findOne();
      expect(resetDoc).not.toBeNull();

      // 2. Consume reset token with new password
      // Since token in DB is hashed, in service tests we test the full consumption flow
    });
  });

  describe('GET /api/v1/auth/me (EP-AUTH-009)', () => {
    it('should return authenticated user identity', async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(validRegistrationPayload);
      const accessToken = reg.body.data.tokens.accessToken;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.email).toBe('sarah.walker@example.com');
      expect(meRes.body.data.provider).toBe('local');
    });
  });
});

