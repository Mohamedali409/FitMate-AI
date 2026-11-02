import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  encryptSuccessorToken,
  decryptSuccessorToken,
  hashToken,
  hashIp,
  truncateUserAgent,
} from '../../src/modules/auth/auth.utils.js';
import { calculateEnergyTargets } from '../../src/modules/auth/auth.service.js';

describe('Auth Utilities & Domain Calculations (Unit)', () => {
  describe('Password Hashing & Verification (Argon2id/bcrypt 12 rounds)', () => {
    it('should hash a password and verify it successfully', async () => {
      const password = 'SuperSecureP@ssw0rd!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt 12 rounds prefix

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword123!', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Access Token Signing & Verification', () => {
    it('should sign and verify a short-lived access JWT', () => {
      const payload = {
        userId: '6725619b0f9488a4e3df5678',
        email: 'user@example.com',
        role: 'user',
        tokenVersion: 2,
      };

      const token = signAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.tokenVersion).toBe(payload.tokenVersion);
    });

    it('should throw an error when token signature is invalid', () => {
      const tampered = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });
  });

  describe('30-Second Grace Period AES-256-GCM Ephemeral Recovery (DB-036)', () => {
    it('should encrypt and decrypt a successor refresh token accurately', () => {
      const successorToken = 'fm_rt_new_successor_token_value_abc123';
      const encryptedBlob = encryptSuccessorToken(successorToken);

      expect(encryptedBlob).toBeDefined();
      expect(encryptedBlob.split(':')).toHaveLength(3); // ciphertext:iv:tag

      const decrypted = decryptSuccessorToken(encryptedBlob);
      expect(decrypted).toBe(successorToken);
    });

    it('should fail gracefully and return null when ciphertext is corrupt or tampered', () => {
      const corruptBlob = 'deadbeef1234:aabbccddeeff:11223344';
      const decrypted = decryptSuccessorToken(corruptBlob);
      expect(decrypted).toBeNull();
    });
  });

  describe('Cryptographic Token & IP Hashing (NFR-SEC-006)', () => {
    it('should compute deterministic SHA-256 token hash', () => {
      const token = 'my_test_token_string';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
    });

    it('should compute HMAC-SHA256 IP hash with secret salt', () => {
      const ip = '192.168.1.100';
      const hash = hashIp(ip);

      expect(hash).toHaveLength(64);
      expect(hashIp(ip)).toBe(hash);
    });

    it('should truncate user agent string to 100 characters', () => {
      const longUA = 'A'.repeat(250);
      const truncated = truncateUserAgent(longUA, 100);

      expect(truncated).toHaveLength(100);
      expect(truncateUserAgent('')).toBe('Unknown Device');
    });
  });

  describe('Mifflin-St Jeor Energy & Macro Calculation (Core Invariant 2, DB-012)', () => {
    it('should calculate BMR, TDEE, and macro splits for fat loss with female s = -161', () => {
      const result = calculateEnergyTargets({
        weightKg: 65,
        heightCm: 168,
        birthDate: '1995-06-15', // approx 31 years old in 2026
        biologicalSex: 'female',
        activityMultiplier: 1.375,
        goal: 'fat_loss',
      });

      // Verification of Core Invariant 2
      expect(result.isEstimated).toBe(true);
      expect(result.dailyCalorieTarget).toBeGreaterThan(1200);
      expect(result.proteinTargetGrams).toBeGreaterThan(0);
      expect(result.carbsTargetGrams).toBeGreaterThan(0);
      expect(result.fatTargetGrams).toBeGreaterThan(0);

      // Protein for fat loss is 1.8g/kg -> 65 * 1.8 = 117.0g
      expect(result.proteinTargetGrams).toBe(117.0);
    });

    it('should calculate muscle gain targets with male s = +5', () => {
      const result = calculateEnergyTargets({
        weightKg: 75,
        heightCm: 180,
        birthDate: '1998-01-01',
        biologicalSex: 'male',
        activityMultiplier: 1.55,
        goal: 'muscle_gain',
      });

      expect(result.isEstimated).toBe(true);
      // Protein for muscle gain is 2.0g/kg -> 75 * 2.0 = 150.0g
      expect(result.proteinTargetGrams).toBe(150.0);
      expect(result.dailyCalorieTarget).toBeGreaterThan(2000);
    });

    it('should enforce safety floor of 1200 kcal for aggressive fat loss deficits', () => {
      const result = calculateEnergyTargets({
        weightKg: 40,
        heightCm: 140,
        birthDate: '1980-01-01',
        biologicalSex: 'female',
        activityMultiplier: 1.2,
        goal: 'fat_loss',
      });

      expect(result.dailyCalorieTarget).toBe(1200);
      expect(result.isEstimated).toBe(true);
    });
  });
});

