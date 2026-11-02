import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { UsersService } from '../../src/modules/users/users.service.js';

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
    it('should return active target snapshot with isEstimated: true for valid user', async () => {
      const mockProfile: any = {
        userId: new Types.ObjectId(),
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

    it('should throw RESOURCE_NOT_FOUND when user profile is absent', async () => {
      mockUsersRepo.findProfileByUserId.mockResolvedValue(null);

      await expect(service.getProfileSnapshot('507f1f77bcf86cd799439011')).rejects.toThrow(
        'User profile not found.'
      );
    });
  });
});

