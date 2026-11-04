import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { UsersService } from '../../src/modules/users/users.service.js';
import { AppError, ErrorCode } from '../../src/shared/errors/AppError.js';

describe('Users Service Logic & Target Protections (Unit)', () => {
  let mockUsersRepo: any;
  let mockAuthRepo: any;
  let service: UsersService;

  beforeEach(() => {
    mockUsersRepo = {
      findProfileByUserId: vi.fn(),
      updateProfileByUserId: vi.fn(),
      createWeightEntry: vi.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      createConsentRecord: vi.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };
    mockAuthRepo = {
      findUserById: vi.fn(),
      findPrimaryIdentity: vi.fn(),
      findIdentityByProvider: vi.fn(),
      updateAccountStatus: vi.fn(),
      incrementTokenVersion: vi.fn(),
      revokeUserTokens: vi.fn(),
    };
    service = new UsersService(mockUsersRepo, mockAuthRepo);
  });

  describe('Custom Target Protection (DB-012, DB-019)', () => {
    it('should set isTargetsCustomized to true when customTargets are provided', async () => {
      const mockProfile: any = {
        userId: new Types.ObjectId(),
        weightKg: 70,
        heightCm: 175,
        isTargetsCustomized: false,
        save: vi.fn().mockResolvedValue(true),
      };
      mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

      const result = await service.updateProfile(mockProfile.userId.toString(), {
        customTargets: {
          dailyCalorieTarget: 2200,
          proteinTargetGrams: 160,
          carbsTargetGrams: 220,
          fatTargetGrams: 70,
        },
      });

      expect(mockProfile.isTargetsCustomized).toBe(true);
      expect(mockProfile.dailyCalorieTarget).toBe(2200);
      expect(mockProfile.proteinTargetGrams).toBe(160);
      expect(result.nutritionTargets.isTargetsCustomized).toBe(true);
      expect(result.nutritionTargets.isEstimated).toBe(true);
      expect(mockProfile.save).toHaveBeenCalled();
    });

    it('should preserve custom targets when updating weightKg unless applyRecalculatedTargets is true', async () => {
      const mockProfile: any = {
        userId: new Types.ObjectId(),
        weightKg: 70,
        heightCm: 175,
        dailyCalorieTarget: 2200,
        proteinTargetGrams: 160,
        carbsTargetGrams: 220,
        fatTargetGrams: 70,
        isTargetsCustomized: true,
        save: vi.fn().mockResolvedValue(true),
      };
      mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

      // Updating weight WITHOUT applyRecalculatedTargets
      const result = await service.updateProfile(mockProfile.userId.toString(), {
        weightKg: 72,
      });

      // Custom targets must be preserved!
      expect(mockProfile.isTargetsCustomized).toBe(true);
      expect(mockProfile.dailyCalorieTarget).toBe(2200);
      expect(mockProfile.proteinTargetGrams).toBe(160);
      expect(mockProfile.baselineRecalculatedAt).toBeDefined();
      expect(mockUsersRepo.createWeightEntry).toHaveBeenCalled();
      expect(mockProfile.save).toHaveBeenCalled();
    });

    it('should overwrite custom targets when applyRecalculatedTargets is explicitly true', async () => {
      const mockProfile: any = {
        userId: new Types.ObjectId(),
        weightKg: 70,
        heightCm: 175,
        birthDate: new Date('1990-01-01'),
        biologicalSex: 'male',
        activityMultiplier: 1.55,
        goal: 'fat_loss',
        dailyCalorieTarget: 2500, // old custom target
        proteinTargetGrams: 200,
        carbsTargetGrams: 250,
        fatTargetGrams: 80,
        isTargetsCustomized: true,
        save: vi.fn().mockResolvedValue(true),
      };
      mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

      const result = await service.updateProfile(mockProfile.userId.toString(), {
        applyRecalculatedTargets: true,
      });

      // Targets recalculated from Mifflin-St Jeor formula
      expect(mockProfile.isTargetsCustomized).toBe(false);
      expect(mockProfile.dailyCalorieTarget).not.toBe(2500);
      expect(mockProfile.targetsCalculatedAt).toBeDefined();
      expect(result.nutritionTargets.isTargetsCustomized).toBe(false);
    });
  });

  describe('Cross-Module Target Snapshot Provider (getProfileSnapshot)', () => {
    it('1. should throw 404 RESOURCE_NOT_FOUND when user profile is absent', async () => {
      mockUsersRepo.findProfileByUserId.mockResolvedValue(null);

      await expect(service.getProfileSnapshot('507f1f77bcf86cd799439011')).rejects.toThrow(
        'User profile not found.'
      );
    });

    it('2. should throw 404 RESOURCE_NOT_FOUND when onboarding is not completed', async () => {
      const mockProfile: any = {
        userId: new Types.ObjectId(),
        isOnboardingCompleted: false,
        dailyCalorieTarget: 2000,
        proteinTargetGrams: 150.0,
        carbsTargetGrams: 200.0,
        fatTargetGrams: 65.0,
      };
      mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

      await expect(service.getProfileSnapshot(mockProfile.userId.toString())).rejects.toThrow(
        'User profile onboarding is not completed.'
      );
    });

    it('3. should throw 404 RESOURCE_NOT_FOUND when dailyCalorieTarget is missing or invalid', async () => {
      const mockProfile: any = {
        userId: new Types.ObjectId(),
        isOnboardingCompleted: true,
        proteinTargetGrams: 150.0,
        carbsTargetGrams: 200.0,
        fatTargetGrams: 65.0,
      };
      mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

      await expect(service.getProfileSnapshot(mockProfile.userId.toString())).rejects.toThrow(
        'User nutrition targets not found.'
      );
    });

    it('4. should throw 404 RESOURCE_NOT_FOUND when proteinTargetGrams is missing or invalid', async () => {
      const mockProfile: any = {
        userId: new Types.ObjectId(),
        isOnboardingCompleted: true,
        dailyCalorieTarget: 2000,
        carbsTargetGrams: 200.0,
        fatTargetGrams: 65.0,
      };
      mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

      await expect(service.getProfileSnapshot(mockProfile.userId.toString())).rejects.toThrow(
        'User nutrition targets not found.'
      );
    });

    it('5. should throw 404 RESOURCE_NOT_FOUND when carbsTargetGrams is missing or invalid', async () => {
      const mockProfile: any = {
        userId: new Types.ObjectId(),
        isOnboardingCompleted: true,
        dailyCalorieTarget: 2000,
        proteinTargetGrams: 150.0,
        fatTargetGrams: 65.0,
      };
      mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

      await expect(service.getProfileSnapshot(mockProfile.userId.toString())).rejects.toThrow(
        'User nutrition targets not found.'
      );
    });

    it('6. should throw 404 RESOURCE_NOT_FOUND when fatTargetGrams is missing or invalid', async () => {
      const mockProfile: any = {
        userId: new Types.ObjectId(),
        isOnboardingCompleted: true,
        dailyCalorieTarget: 2000,
        proteinTargetGrams: 150.0,
        carbsTargetGrams: 200.0,
      };
      mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

      await expect(service.getProfileSnapshot(mockProfile.userId.toString())).rejects.toThrow(
        'User nutrition targets not found.'
      );
    });

    it('7. should return actual stored target snapshot with isEstimated: true for complete valid profile', async () => {
      const mockProfile: any = {
        userId: new Types.ObjectId(),
        isOnboardingCompleted: true,
        dailyCalorieTarget: 2150,
        proteinTargetGrams: 155.0,
        carbsTargetGrams: 230.0,
        fatTargetGrams: 67.5,
        isTargetsCustomized: false,
        unitSystem: 'metric',
        preferredLanguage: 'ar',
      };
      mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

      const snapshot = await service.getProfileSnapshot(mockProfile.userId.toString());

      expect(snapshot.userId).toBe(mockProfile.userId.toString());
      expect(snapshot.dailyCalorieTarget).toBe(2150);
      expect(snapshot.proteinTargetGrams).toBe(155.0);
      expect(snapshot.carbsTargetGrams).toBe(230.0);
      expect(snapshot.fatTargetGrams).toBe(67.5);
      expect(snapshot.isTargetsCustomized).toBe(false);
      expect(snapshot.isEstimated).toBe(true);
      expect(snapshot.unitSystem).toBe('metric');
      expect(snapshot.preferredLanguage).toBe('ar');
    });

    it('8. should preserve customized targets when isTargetsCustomized is true', async () => {
      const mockProfile: any = {
        userId: new Types.ObjectId(),
        isOnboardingCompleted: true,
        dailyCalorieTarget: 2600,
        proteinTargetGrams: 210.0,
        carbsTargetGrams: 280.0,
        fatTargetGrams: 75.0,
        isTargetsCustomized: true,
        unitSystem: 'imperial',
        preferredLanguage: 'en',
      };
      mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

      const snapshot = await service.getProfileSnapshot(mockProfile.userId.toString());

      expect(snapshot.isTargetsCustomized).toBe(true);
      expect(snapshot.dailyCalorieTarget).toBe(2600);
      expect(snapshot.proteinTargetGrams).toBe(210.0);
      expect(snapshot.carbsTargetGrams).toBe(280.0);
      expect(snapshot.fatTargetGrams).toBe(75.0);
      expect(snapshot.unitSystem).toBe('imperial');
      expect(snapshot.preferredLanguage).toBe('en');
    });

    describe('Non-finite target validation hardening (OBS-VAL-001)', () => {
      const validBaseProfile = {
        userId: new Types.ObjectId(),
        isOnboardingCompleted: true,
        dailyCalorieTarget: 2200,
        proteinTargetGrams: 160.0,
        carbsTargetGrams: 220.0,
        fatTargetGrams: 70.0,
        isTargetsCustomized: false,
        unitSystem: 'metric' as const,
        preferredLanguage: 'en' as const,
      };

      it('should reject NaN for dailyCalorieTarget with 404 RESOURCE_NOT_FOUND', async () => {
        const mockProfile: any = { ...validBaseProfile, dailyCalorieTarget: NaN };
        mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

        await expect(service.getProfileSnapshot(mockProfile.userId.toString())).rejects.toMatchObject({
          statusCode: 404,
          errorCode: ErrorCode.RESOURCE_NOT_FOUND,
          message: 'User nutrition targets not found.',
        });
      });

      it('should reject Infinity for dailyCalorieTarget with 404 RESOURCE_NOT_FOUND', async () => {
        const mockProfile: any = { ...validBaseProfile, dailyCalorieTarget: Infinity };
        mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

        await expect(service.getProfileSnapshot(mockProfile.userId.toString())).rejects.toMatchObject({
          statusCode: 404,
          errorCode: ErrorCode.RESOURCE_NOT_FOUND,
          message: 'User nutrition targets not found.',
        });
      });

      it('should reject NaN for proteinTargetGrams with 404 RESOURCE_NOT_FOUND', async () => {
        const mockProfile: any = { ...validBaseProfile, proteinTargetGrams: NaN };
        mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

        await expect(service.getProfileSnapshot(mockProfile.userId.toString())).rejects.toMatchObject({
          statusCode: 404,
          errorCode: ErrorCode.RESOURCE_NOT_FOUND,
          message: 'User nutrition targets not found.',
        });
      });

      it('should reject Infinity for proteinTargetGrams with 404 RESOURCE_NOT_FOUND', async () => {
        const mockProfile: any = { ...validBaseProfile, proteinTargetGrams: Infinity };
        mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

        await expect(service.getProfileSnapshot(mockProfile.userId.toString())).rejects.toMatchObject({
          statusCode: 404,
          errorCode: ErrorCode.RESOURCE_NOT_FOUND,
          message: 'User nutrition targets not found.',
        });
      });

      it('should reject NaN for carbsTargetGrams with 404 RESOURCE_NOT_FOUND', async () => {
        const mockProfile: any = { ...validBaseProfile, carbsTargetGrams: NaN };
        mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

        await expect(service.getProfileSnapshot(mockProfile.userId.toString())).rejects.toMatchObject({
          statusCode: 404,
          errorCode: ErrorCode.RESOURCE_NOT_FOUND,
          message: 'User nutrition targets not found.',
        });
      });

      it('should reject Infinity for carbsTargetGrams with 404 RESOURCE_NOT_FOUND', async () => {
        const mockProfile: any = { ...validBaseProfile, carbsTargetGrams: Infinity };
        mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

        await expect(service.getProfileSnapshot(mockProfile.userId.toString())).rejects.toMatchObject({
          statusCode: 404,
          errorCode: ErrorCode.RESOURCE_NOT_FOUND,
          message: 'User nutrition targets not found.',
        });
      });

      it('should reject NaN for fatTargetGrams with 404 RESOURCE_NOT_FOUND', async () => {
        const mockProfile: any = { ...validBaseProfile, fatTargetGrams: NaN };
        mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

        await expect(service.getProfileSnapshot(mockProfile.userId.toString())).rejects.toMatchObject({
          statusCode: 404,
          errorCode: ErrorCode.RESOURCE_NOT_FOUND,
          message: 'User nutrition targets not found.',
        });
      });

      it('should reject Infinity for fatTargetGrams with 404 RESOURCE_NOT_FOUND', async () => {
        const mockProfile: any = { ...validBaseProfile, fatTargetGrams: Infinity };
        mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

        await expect(service.getProfileSnapshot(mockProfile.userId.toString())).rejects.toMatchObject({
          statusCode: 404,
          errorCode: ErrorCode.RESOURCE_NOT_FOUND,
          message: 'User nutrition targets not found.',
        });
      });

      it('should accept valid positive calorie targets and zero macro targets (e.g. ketogenic diet)', async () => {
        const mockProfile: any = {
          ...validBaseProfile,
          dailyCalorieTarget: 1800,
          carbsTargetGrams: 0.0,
          proteinTargetGrams: 140.0,
          fatTargetGrams: 130.0,
        };
        mockUsersRepo.findProfileByUserId.mockResolvedValue(mockProfile);

        const snapshot = await service.getProfileSnapshot(mockProfile.userId.toString());
        expect(snapshot.dailyCalorieTarget).toBe(1800);
        expect(snapshot.carbsTargetGrams).toBe(0.0);
        expect(snapshot.proteinTargetGrams).toBe(140.0);
        expect(snapshot.fatTargetGrams).toBe(130.0);
      });
    });
  });
});

