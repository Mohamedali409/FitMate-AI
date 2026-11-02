import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from '../helpers/db.helper.js';
import { UserModel } from '../../src/modules/auth/models/user.model.js';
import { UserProfileModel } from '../../src/modules/users/models/userProfile.model.js';
import { BodyWeightEntryModel } from '../../src/modules/progress/models/bodyWeightEntry.model.js';
import { DeletionSagaJobModel } from '../../src/modules/users/models/deletionSagaJob.model.js';
import { ConsentRecordModel } from '../../src/modules/users/models/consentRecord.model.js';

describe('UsersModule REST Endpoints (Integration)', () => {
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

  const registrationPayload = {
    email: 'ahmed.fitness@example.com',
    password: 'P@ssword12345!',
    displayName: 'Ahmed Fitness',
    onboarding: {
      goal: 'muscle_gain',
      biologicalSex: 'male',
      birthDate: '1998-04-12',
      heightCm: 180.0,
      weightKg: 78.0,
      activityMultiplier: 1.55,
      trainingExperience: 'intermediate',
      dietaryPreference: 'halal',
      unitSystem: 'metric',
      preferredLanguage: 'ar',
      hasAcceptedHealthDisclaimer: true,
      hasAcceptedTerms: true,
    },
  };

  async function registerAndGetToken() {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send(registrationPayload);
    return {
      accessToken: regRes.body.data.tokens.accessToken,
      userId: regRes.body.data.user.id,
    };
  }

  describe('GET /api/v1/users/profile (EP-USER-001)', () => {
    it('should retrieve user profile with calculated nutrition targets and estimation transparency', async () => {
      const { accessToken } = await registerAndGetToken();

      const res = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.displayName).toBe('Ahmed Fitness');
      expect(res.body.data.goal).toBe('muscle_gain');
      expect(res.body.data.unitSystem).toBe('metric');
      expect(res.body.data.preferredLanguage).toBe('ar');
      expect(res.body.data.isOnboardingCompleted).toBe(true);

      // Nutrition targets verification (Core Invariant 2, DB-012)
      const targets = res.body.data.nutritionTargets;
      expect(targets.isEstimated).toBe(true);
      expect(targets.dailyCalorieTarget).toBeGreaterThan(2000);
      expect(targets.proteinTargetGrams).toBe(78.0 * 2.0); // 156.0g
      expect(targets.isTargetsCustomized).toBe(false);
    });

    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/users/profile');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PATCH /api/v1/users/profile (EP-USER-002)', () => {
    it('should update weightKg, record entry in body_weight_entries, and recalculate formula targets', async () => {
      const { accessToken, userId } = await registerAndGetToken();

      const res = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          weightKg: 80.5,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.weightKg).toBe(80.5);
      expect(res.body.data.nutritionTargets.isEstimated).toBe(true);

      // Check authoritative progress ledger (ADR-013)
      const weightEntries = await BodyWeightEntryModel.find({ userId }).sort({ date: -1 });
      expect(weightEntries.length).toBeGreaterThanOrEqual(2);
      expect(weightEntries[0]!.weightKg).toBe(80.5);
    });

    it('should set custom targets and protect them from automatic recalculation (DB-012, DB-019)', async () => {
      const { accessToken } = await registerAndGetToken();

      // 1. Configure custom targets
      const customRes = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customTargets: {
            dailyCalorieTarget: 2600,
            proteinTargetGrams: 180.0,
            carbsTargetGrams: 280.0,
            fatTargetGrams: 75.0,
          },
        });

      expect(customRes.status).toBe(200);
      expect(customRes.body.data.nutritionTargets.isTargetsCustomized).toBe(true);
      expect(customRes.body.data.nutritionTargets.dailyCalorieTarget).toBe(2600);

      // 2. Update weight afterwards without applyRecalculatedTargets
      const weightRes = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          weightKg: 82.0,
        });

      // Custom targets must be preserved!
      expect(weightRes.status).toBe(200);
      expect(weightRes.body.data.nutritionTargets.isTargetsCustomized).toBe(true);
      expect(weightRes.body.data.nutritionTargets.dailyCalorieTarget).toBe(2600);
      expect(weightRes.body.data.nutritionTargets.proteinTargetGrams).toBe(180.0);
    });

    it('should allow user to overwrite custom targets by passing applyRecalculatedTargets: true', async () => {
      const { accessToken } = await registerAndGetToken();

      // Set custom targets
      await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customTargets: {
            dailyCalorieTarget: 3000,
            proteinTargetGrams: 200.0,
            carbsTargetGrams: 300.0,
            fatTargetGrams: 80.0,
          },
        });

      // Confirm apply recalculated targets
      const resetRes = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          applyRecalculatedTargets: true,
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.data.nutritionTargets.isTargetsCustomized).toBe(false);
      expect(resetRes.body.data.nutritionTargets.dailyCalorieTarget).not.toBe(3000);
    });
  });

  describe('POST /api/v1/users/onboarding/complete (EP-USER-003)', () => {
    it('should complete onboarding for Google OAuth skeletal profile and log baseline weigh-in', async () => {
      // 1. Sign in via Google OAuth to create skeletal profile
      const oauthRes = await request(app).post('/api/v1/auth/oauth').send({
        provider: 'google',
        idToken: 'mock-google-token-karim@example.com-google_sub_11223344',
      });
      const token = oauthRes.body.data.tokens.accessToken;
      expect(oauthRes.body.data.user.isOnboardingCompleted).toBe(false);

      // 2. Complete onboarding questionnaire
      const completeRes = await request(app)
        .post('/api/v1/users/onboarding/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          goal: 'general_fitness',
          biologicalSex: 'male',
          birthDate: '1992-08-20',
          heightCm: 175.0,
          weightKg: 74.0,
          activityMultiplier: 1.375,
          trainingExperience: 'beginner',
          hasAcceptedHealthDisclaimer: true,
        });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.success).toBe(true);
      expect(completeRes.body.data.isOnboardingCompleted).toBe(true);
      expect(completeRes.body.data.dailyCalorieTarget).toBeGreaterThan(1500);
      expect(completeRes.body.data.isEstimated).toBe(true);

      // Verify baseline weight was recorded in progress ledger
      const weightEntry = await BodyWeightEntryModel.findOne({ weightKg: 74.0 });
      expect(weightEntry).not.toBeNull();
    });
  });

  describe('PATCH /api/v1/users/preferences (EP-USER-004)', () => {
    it('should update unitSystem and preferredLanguage', async () => {
      const { accessToken } = await registerAndGetToken();

      const res = await request(app)
        .patch('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          unitSystem: 'imperial',
          preferredLanguage: 'en',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unitSystem).toBe('imperial');
      expect(res.body.data.preferredLanguage).toBe('en');
    });
  });

  describe('Account Deletion Saga: DELETE /api/v1/users/account (EP-USER-005, DB-018)', () => {
    it('should initiate account deletion, lock account, revoke sessions, and create deletion_saga_jobs ledger', async () => {
      const { accessToken, userId } = await registerAndGetToken();

      const res = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Idempotency-Key', 'b7f8e3c1-9012-4567-89ab-cdef01234567')
        .send({
          currentPassword: 'P@ssword12345!',
        });

      expect(res.status).toBe(202); // 202 Accepted
      expect(res.body.success).toBe(true);
      expect(res.body.data.sagaId).toBeDefined();
      expect(res.body.data.status).toBe('pending_deletion');

      // Verify durable saga job ledger in deletion_saga_jobs (DB-018)
      const saga = await DeletionSagaJobModel.findOne({ sagaId: res.body.data.sagaId });
      expect(saga).not.toBeNull();
      expect(saga!.completedSteps).toContain('lock_account');
      expect(saga!.status).toBe('in_progress');

      // Verify user account is locked to pending_deletion and sessions invalidated
      const user = await UserModel.findById(userId);
      expect(user!.status).toBe('pending_deletion');
      expect(user!.deletionRequestedAt).toBeDefined();
      expect(user!.tokenVersion).toBeGreaterThan(0);
    });

    it('should return idempotent response when duplicate deletion request is received', async () => {
      const { accessToken } = await registerAndGetToken();
      const idempotencyKey = 'b7f8e3c1-9012-4567-89ab-cdef01234567';

      const firstRes = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ currentPassword: 'P@ssword12345!' });

      expect(firstRes.status).toBe(202);

      const duplicateRes = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ currentPassword: 'P@ssword12345!' });

      expect(duplicateRes.status).toBe(202);
      expect(duplicateRes.body.data.sagaId).toBe(firstRes.body.data.sagaId);
    });

    it('should reject account deletion when incorrect password is provided for local account', async () => {
      const { accessToken } = await registerAndGetToken();

      const res = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'WrongPassword999!' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/users/account/deletion-status (EP-USER-006)', () => {
    it('should return operational status of in-flight deletion saga', async () => {
      const { accessToken } = await registerAndGetToken();

      const deleteRes = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'P@ssword12345!' });

      const statusRes = await request(app)
        .get('/api/v1/users/account/deletion-status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.success).toBe(true);
      expect(statusRes.body.data.sagaId).toBe(deleteRes.body.data.sagaId);
      expect(statusRes.body.data.completedSteps).toContain('lock_account');
    });
  });

  describe('Legal Consents: GET & POST /api/v1/users/consents (EP-USER-007 & EP-USER-008)', () => {
    it('should record explicit consent action and retrieve active consents', async () => {
      const { accessToken } = await registerAndGetToken();

      // Record Privacy Policy consent
      const postRes = await request(app)
        .post('/api/v1/users/consents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          consentType: 'privacy_policy',
          action: 'accepted',
          disclaimerVersion: '1.0.0',
        });

      expect(postRes.status).toBe(200);
      expect(postRes.body.success).toBe(true);
      expect(postRes.body.data.consentType).toBe('privacy_policy');
      expect(postRes.body.data.hasAccepted).toBe(true);

      // List consents
      const getRes = await request(app)
        .get('/api/v1/users/consents')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.length).toBeGreaterThanOrEqual(3); // health_disclaimer, terms_of_service, privacy_policy
    });
  });
});

