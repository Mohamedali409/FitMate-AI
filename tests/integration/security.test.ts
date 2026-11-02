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

describe('Security & Multi-Tenant IDOR / BOLA Defenses (Integration)', () => {
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

  async function registerUser(email: string, displayName: string) {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'P@ssword12345!',
        displayName,
        onboarding: {
          goal: 'fat_loss',
          biologicalSex: 'female',
          birthDate: '1995-06-15',
          heightCm: 165.0,
          weightKg: 60.0,
          activityMultiplier: 1.375,
          trainingExperience: 'beginner',
          unitSystem: 'metric',
          preferredLanguage: 'en',
          hasAcceptedHealthDisclaimer: true,
          hasAcceptedTerms: true,
        },
      });

    return {
      accessToken: res.body.data.tokens.accessToken,
      userId: res.body.data.user.id,
      user: res.body.data.user,
    };
  }

  describe('OWASP API1:2023 — BOLA / IDOR Defense Matrix', () => {
    it('should strictly isolate user profile data to the token owner', async () => {
      const userA = await registerUser('userA@example.com', 'Alice');
      const userB = await registerUser('userB@example.com', 'Bob');

      // User A requests their profile
      const resA = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userA.accessToken}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data.displayName).toBe('Alice');
      expect(resA.body.data.userId).toBe(userA.userId);

      // User B requests their profile
      const resB = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userB.accessToken}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.displayName).toBe('Bob');
      expect(resB.body.data.userId).toBe(userB.userId);
    });

    it('should prevent User A from mutating User B preferences via token substitution', async () => {
      const userA = await registerUser('userA@example.com', 'Alice');
      const userB = await registerUser('userB@example.com', 'Bob');

      // User A updates preferences
      await request(app)
        .patch('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          preferredLanguage: 'ar',
          unitSystem: 'imperial',
        });

      // Verify User B's profile was NOT altered
      const profileB = await UserProfileModel.findOne({ userId: userB.userId });
      expect(profileB!.preferredLanguage).toBe('en');
      expect(profileB!.unitSystem).toBe('metric');
    });
  });

  describe('OWASP API3:2023 — Mass Assignment Defense', () => {
    it('should ignore or strip disallowed fields (isEmailVerified, tokenVersion, status) on profile update', async () => {
      const userA = await registerUser('userA@example.com', 'Alice');

      // Attempt mass assignment injection
      const maliciousPayload = {
        displayName: 'Alice Renamed',
        isEmailVerified: true,
        tokenVersion: 999,
        status: 'admin',
        role: 'admin',
      };

      const res = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send(maliciousPayload);

      expect(res.status).toBe(200);

      // Check database: internal flags must NOT have changed
      const dbUser = await UserModel.findById(userA.userId);
      expect(dbUser!.isEmailVerified).toBe(false);
      expect(dbUser!.tokenVersion).toBe(0);
      expect(dbUser!.status).toBe('active');
      expect(dbUser!.role).toBe('user');
    });
  });

  describe('Account Lifecycle & Access Restrictions', () => {
    it('should block suspended accounts from authenticated access with 403 ACCOUNT_SUSPENDED', async () => {
      const userA = await registerUser('userA@example.com', 'Alice');

      // Suspend user directly in DB
      await UserModel.findByIdAndUpdate(userA.userId, { status: 'suspended' });

      const res = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userA.accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('should block accounts pending deletion from accessing standard feature endpoints', async () => {
      const userA = await registerUser('userA@example.com', 'Alice');

      // Set user status to pending_deletion
      await UserModel.findByIdAndUpdate(userA.userId, { status: 'pending_deletion' });

      const res = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ displayName: 'New Name' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ACCOUNT_PENDING_DELETION');
    });
  });
});

