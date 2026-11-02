import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../helpers/db.helper.js';
import { resetRateLimits } from '../../src/middleware/rateLimiter.js';

describe('Centralized Rate Limiting & Abuse Protection (Integration)', () => {
  const app = createApp();

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await resetRateLimits();
  });

  describe('Auth Strict Rate Limiting (5 attempts / 15 min per IP)', () => {
    it('should permit 5 consecutive auth attempts and block the 6th with 429 and standard headers', async () => {
      // 1-5: Allowed attempts
      for (let i = 0; i < 5; i++) {
        const res = await request(app).post('/api/v1/auth/login').send({
          email: 'rate.limit.test@example.com',
          password: 'WrongPassword123!',
        });

        // Regular 401 response from authentication failure
        expect(res.status).toBe(401);
        expect(res.headers['ratelimit-limit']).toBe('5');
        expect(res.headers['ratelimit-remaining']).toBe(String(4 - i));
        expect(Number(res.headers['ratelimit-reset'])).toBeGreaterThan(0);
      }

      // 6th attempt: Must be blocked by rate limiter with 429
      const blockedRes = await request(app).post('/api/v1/auth/login').send({
        email: 'rate.limit.test@example.com',
        password: 'WrongPassword123!',
      });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.success).toBe(false);
      expect(blockedRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(blockedRes.headers['ratelimit-limit']).toBe('5');
      expect(blockedRes.headers['ratelimit-remaining']).toBe('0');
      expect(blockedRes.headers['retry-after']).toBeDefined();
      expect(Number(blockedRes.headers['retry-after'])).toBeGreaterThan(0);

      // Verify resetRateLimits immediately restores capacity
      await resetRateLimits();

      const restoredRes = await request(app).post('/api/v1/auth/login').send({
        email: 'rate.limit.test@example.com',
        password: 'WrongPassword123!',
      });

      expect(restoredRes.status).toBe(401); // Not 429!
      expect(restoredRes.headers['ratelimit-remaining']).toBe('4');
    });

    it('should protect account deletion EP-USER-005 under Auth Strict category', async () => {
      // Register a user first to have a valid bearer token
      const regRes = await request(app).post('/api/v1/auth/register').send({
        email: 'delete.rate.test@example.com',
        password: 'P@ssword12345!',
        displayName: 'Delete Rate User',
        onboarding: {
          goal: 'fat_loss',
          biologicalSex: 'male',
          birthDate: '1995-05-15',
          heightCm: 175.0,
          weightKg: 80.0,
          activityMultiplier: 1.375,
          trainingExperience: 'beginner',
          dietaryPreference: 'none',
          unitSystem: 'metric',
          preferredLanguage: 'en',
          hasAcceptedHealthDisclaimer: true,
          hasAcceptedTerms: true,
        },
      });

      const token = regRes.body.data.tokens.accessToken;

      // 4 subsequent requests (registration was 1st request on this IP)
      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .delete('/api/v1/users/account')
          .set('Authorization', `Bearer ${token}`)
          .send({ currentPassword: 'WrongPassword!' });

        expect(res.status).toBe(400); // Invalid password
      }

      // 6th attempt total on IP: should hit 429
      const blockedRes = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'WrongPassword!' });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Password Reset Rate Limiting (3 requests / 1 hr per IP + Email)', () => {
    it('should allow 3 password reset requests and block the 4th for the same target email', async () => {
      const targetEmail = 'user.forgot@example.com';

      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({ email: targetEmail });

        expect(res.status).toBe(200);
        expect(res.headers['ratelimit-limit']).toBe('3');
        expect(res.headers['ratelimit-remaining']).toBe(String(2 - i));
      }

      const blockedRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: targetEmail });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(blockedRes.headers['ratelimit-remaining']).toBe('0');
      expect(blockedRes.headers['retry-after']).toBeDefined();
    });
  });
});

