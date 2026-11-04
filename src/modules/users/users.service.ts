import { randomUUID } from 'crypto';
import { usersRepository, UsersRepository } from './users.repository.js';
import { authRepository, AuthRepository } from '../auth/auth.repository.js';
import { calculateEnergyTargets } from '../nutrition/domain/energyCalculator.js';
import { verifyPassword, hashIp, truncateUserAgent } from '../auth/auth.utils.js';
import { AppError, ErrorCode } from '../../shared/errors/AppError.js';
import {
  UpdateProfileInput,
  CompleteOnboardingInput,
  UpdatePreferencesInput,
  DeleteAccountInput,
  RecordConsentInput,
} from './dto/users.dto.js';
import { createHmac } from 'crypto';

export class UsersService {
  constructor(
    private usersRepo: UsersRepository = usersRepository,
    private authRepo: AuthRepository = authRepository
  ) {}

  async getProfile(userId: string) {
    const profile = await this.usersRepo.findProfileByUserId(userId);
    if (!profile) {
      throw AppError.notFound('User profile not found.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    return {
      userId: profile.userId.toString(),
      displayName: profile.displayName,
      goal: profile.goal,
      biologicalSex: profile.biologicalSex,
      birthDate: profile.birthDate ? profile.birthDate.toISOString().split('T')[0] : undefined,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      weightRecordedAt: profile.weightRecordedAt?.toISOString(),
      activityMultiplier: profile.activityMultiplier,
      trainingExperience: profile.trainingExperience,
      dietaryPreference: profile.dietaryPreference,
      unitSystem: profile.unitSystem,
      preferredLanguage: profile.preferredLanguage,
      isOnboardingCompleted: profile.isOnboardingCompleted,
      nutritionTargets: {
        dailyCalorieTarget: profile.dailyCalorieTarget,
        proteinTargetGrams: profile.proteinTargetGrams,
        carbsTargetGrams: profile.carbsTargetGrams,
        fatTargetGrams: profile.fatTargetGrams,
        isTargetsCustomized: profile.isTargetsCustomized,
        isEstimated: profile.isEstimated,
        targetsCalculatedAt: profile.targetsCalculatedAt?.toISOString(),
      },
    };
  }

  /**
   * Cross-Module Target Snapshot Provider (EP-NUTR-001 Integration)
   * Exposes active nutritional targets and preferences to NutritionModule without coupling persistence.
   * Stricter validation: Throws 404 RESOURCE_NOT_FOUND if profile is missing, onboarding is incomplete,
   * or any required target (calories, protein, carbs, fat) is missing or invalid.
   */
  async getProfileSnapshot(userId: string) {
    const profile = await this.usersRepo.findProfileByUserId(userId);
    if (!profile) {
      throw AppError.notFound('User profile not found.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (profile.isOnboardingCompleted !== true) {
      throw AppError.notFound(
        'User profile onboarding is not completed.',
        ErrorCode.RESOURCE_NOT_FOUND
      );
    }

    const validTargets =
      typeof profile.dailyCalorieTarget === 'number' &&
      Number.isFinite(profile.dailyCalorieTarget) &&
      profile.dailyCalorieTarget > 0 &&
      typeof profile.proteinTargetGrams === 'number' &&
      Number.isFinite(profile.proteinTargetGrams) &&
      profile.proteinTargetGrams >= 0 &&
      typeof profile.carbsTargetGrams === 'number' &&
      Number.isFinite(profile.carbsTargetGrams) &&
      profile.carbsTargetGrams >= 0 &&
      typeof profile.fatTargetGrams === 'number' &&
      Number.isFinite(profile.fatTargetGrams) &&
      profile.fatTargetGrams >= 0;

    if (!validTargets) {
      throw AppError.notFound(
        'User nutrition targets not found.',
        ErrorCode.RESOURCE_NOT_FOUND
      );
    }

    return {
      userId: profile.userId.toString(),
      dailyCalorieTarget: profile.dailyCalorieTarget!,
      proteinTargetGrams: profile.proteinTargetGrams!,
      carbsTargetGrams: profile.carbsTargetGrams!,
      fatTargetGrams: profile.fatTargetGrams!,
      isTargetsCustomized: Boolean(profile.isTargetsCustomized),
      isEstimated: true as const,
      unitSystem: profile.unitSystem,
      preferredLanguage: profile.preferredLanguage,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const profile = await this.usersRepo.findProfileByUserId(userId);
    if (!profile) {
      throw AppError.notFound('User profile not found.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    const now = new Date();

    // 1. If weight is being updated, log authoritative weigh-in to progress ledger (ADR-013)
    if (input.weightKg !== undefined && input.weightKg !== profile.weightKg) {
      const weightEntry = await this.usersRepo.createWeightEntry({
        userId: profile.userId,
        weightKg: input.weightKg,
        date: now,
        source: 'profile_update',
      });
      profile.weightKg = input.weightKg;
      profile.weightRecordedAt = now;
      profile.weightEntryId = weightEntry._id;
    }

    if (input.displayName !== undefined) profile.displayName = input.displayName;
    if (input.heightCm !== undefined) profile.heightCm = input.heightCm;
    if (input.activityMultiplier !== undefined) profile.activityMultiplier = input.activityMultiplier;
    if (input.trainingExperience !== undefined) profile.trainingExperience = input.trainingExperience;
    if (input.dietaryPreference !== undefined) profile.dietaryPreference = input.dietaryPreference;
    if (input.goal !== undefined) profile.goal = input.goal;

    // 2. Custom Targets handling (DB-012, DB-019)
    if (input.customTargets) {
      profile.dailyCalorieTarget = input.customTargets.dailyCalorieTarget;
      profile.proteinTargetGrams = input.customTargets.proteinTargetGrams;
      profile.carbsTargetGrams = input.customTargets.carbsTargetGrams;
      profile.fatTargetGrams = input.customTargets.fatTargetGrams;
      profile.isTargetsCustomized = true;
      profile.customTargetsSetAt = now;
    } else if (
      input.applyRecalculatedTargets === true ||
      (!profile.isTargetsCustomized &&
        (input.weightKg !== undefined ||
          input.heightCm !== undefined ||
          input.activityMultiplier !== undefined ||
          input.goal !== undefined))
    ) {
      // Recalculate Mifflin-St Jeor targets
      if (
        profile.weightKg &&
        profile.heightCm &&
        profile.birthDate &&
        profile.biologicalSex &&
        profile.activityMultiplier &&
        profile.goal
      ) {
        const recalculated = calculateEnergyTargets({
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
          birthDate: profile.birthDate.toISOString().split('T')[0]!,
          biologicalSex: profile.biologicalSex,
          activityMultiplier: profile.activityMultiplier,
          goal: profile.goal,
        });

        profile.dailyCalorieTarget = recalculated.dailyCalorieTarget;
        profile.proteinTargetGrams = recalculated.proteinTargetGrams;
        profile.carbsTargetGrams = recalculated.carbsTargetGrams;
        profile.fatTargetGrams = recalculated.fatTargetGrams;
        profile.isTargetsCustomized = false;
        profile.targetsCalculatedAt = now;
      }
    } else if (profile.isTargetsCustomized) {
      // Retain custom targets; mark baseline as recalculated for UI presentation
      profile.baselineRecalculatedAt = now;
    }

    await profile.save();

    return {
      userId: profile.userId.toString(),
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      nutritionTargets: {
        dailyCalorieTarget: profile.dailyCalorieTarget,
        proteinTargetGrams: profile.proteinTargetGrams,
        carbsTargetGrams: profile.carbsTargetGrams,
        fatTargetGrams: profile.fatTargetGrams,
        isTargetsCustomized: profile.isTargetsCustomized,
        isEstimated: true,
        targetsCalculatedAt: profile.targetsCalculatedAt?.toISOString(),
      },
    };
  }

  async completeOnboarding(
    userId: string,
    input: CompleteOnboardingInput,
    ip: string,
    userAgent: string
  ) {
    const profile = await this.usersRepo.findProfileByUserId(userId);
    if (!profile) {
      throw AppError.notFound('Profile not found.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    const targets = calculateEnergyTargets({
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      birthDate: input.birthDate,
      biologicalSex: input.biologicalSex,
      activityMultiplier: input.activityMultiplier,
      goal: input.goal,
    });

    const now = new Date();

    // 1. Authoritative initial weight entry (ADR-006, ADR-013)
    const weightEntry = await this.usersRepo.createWeightEntry({
      userId: profile.userId,
      weightKg: input.weightKg,
      date: now,
      source: 'onboarding_baseline',
    });

    // 2. Mandatory Health Disclaimer Consent Record
    await this.usersRepo.createConsentRecord({
      userId: profile.userId,
      consentType: 'health_disclaimer',
      action: 'accepted',
      hasAccepted: true,
      disclaimerVersion: '1.0.0',
      recordedAt: now,
      ipHash: hashIp(ip),
      userAgentTruncated: truncateUserAgent(userAgent),
    });

    // 3. Update Profile to Completed
    profile.goal = input.goal;
    profile.biologicalSex = input.biologicalSex;
    profile.birthDate = new Date(input.birthDate);
    profile.heightCm = input.heightCm;
    profile.weightKg = input.weightKg;
    profile.weightRecordedAt = now;
    profile.weightEntryId = weightEntry._id;
    profile.activityMultiplier = input.activityMultiplier;
    profile.trainingExperience = input.trainingExperience;
    profile.dailyCalorieTarget = targets.dailyCalorieTarget;
    profile.proteinTargetGrams = targets.proteinTargetGrams;
    profile.carbsTargetGrams = targets.carbsTargetGrams;
    profile.fatTargetGrams = targets.fatTargetGrams;
    profile.isOnboardingCompleted = true;
    profile.isTargetsCustomized = false;
    profile.isEstimated = true;
    profile.targetsCalculatedAt = now;

    await profile.save();

    return {
      isOnboardingCompleted: true,
      dailyCalorieTarget: profile.dailyCalorieTarget,
      isEstimated: true,
    };
  }

  async updatePreferences(userId: string, input: UpdatePreferencesInput) {
    const profile = await this.usersRepo.findProfileByUserId(userId);
    if (!profile) {
      throw AppError.notFound('Profile not found.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (input.unitSystem) profile.unitSystem = input.unitSystem;
    if (input.preferredLanguage) profile.preferredLanguage = input.preferredLanguage;

    await profile.save();

    return {
      unitSystem: profile.unitSystem,
      preferredLanguage: profile.preferredLanguage,
    };
  }

  async initiateAccountDeletion(
    userId: string,
    input: DeleteAccountInput,
    idempotencyKey?: string
  ) {
    const key = idempotencyKey || randomUUID();

    // Check if duplicate idempotency key was sent
    const existingJob = await this.usersRepo.findSagaByIdempotencyKey(key);
    if (existingJob) {
      return {
        sagaId: existingJob.sagaId,
        status: existingJob.status,
        message: 'Account deletion is already scheduled.',
      };
    }

    // Check if user already has an active deletion saga
    const activeJob = await this.usersRepo.findActiveSagaByUserId(userId);
    if (activeJob) {
      return {
        sagaId: activeJob.sagaId,
        status: activeJob.status,
        message: 'Account deletion is already in progress.',
      };
    }

    // Verify password if local credentials exist
    const primaryIdentity = await this.authRepo.findPrimaryIdentity(userId);
    if (primaryIdentity?.provider === 'local') {
      const fullIdentity = await this.authRepo.findIdentityByProvider(
        'local',
        primaryIdentity.providerUserId,
        undefined,
        true
      );
      if (!input.currentPassword || !fullIdentity?.passwordHash) {
        throw AppError.badRequest(
          'Password confirmation is required for account deletion.',
          ErrorCode.INVALID_CREDENTIALS
        );
      }
      const isValid = await verifyPassword(input.currentPassword, fullIdentity.passwordHash);
      if (!isValid) {
        throw AppError.badRequest('Password verification failed.', ErrorCode.INVALID_CREDENTIALS);
      }
    }

    const sagaId = randomUUID();
    const hmacSecret = process.env['HMAC_SECRET'] || 'fitmate_statutory_secret_default_key_v1';
    const pseudonymizedUserId = createHmac('sha256', hmacSecret).update(userId).digest('hex');

    // Step 1: Create durable operational saga job (DB-018)
    const sagaJob = await this.usersRepo.createSagaJob({
      sagaId,
      idempotencyKey: key,
      targetUserId: primaryIdentity ? primaryIdentity.userId : (userId as any),
      status: 'pending',
      currentStep: 'lock_account',
      completedSteps: [],
      hmacKeyVersion: 'v1',
      pseudonymizedUserId,
    });

    // Step 2: Lock Account status & Revoke all sessions (AuthModule contract)
    await this.authRepo.updateAccountStatus(userId, 'pending_deletion', new Date());
    await this.authRepo.incrementTokenVersion(userId);
    await this.authRepo.revokeUserTokens(userId, 'account_deletion');

    // Update saga state
    sagaJob.currentStep = 'purge_workouts';
    sagaJob.completedSteps.push('lock_account');
    sagaJob.status = 'in_progress';
    await sagaJob.save();

    return {
      sagaId,
      status: 'pending_deletion',
      message: 'Account deletion successfully initiated. All active sessions have been terminated.',
    };
  }

  async getDeletionStatus(userId: string) {
    const activeJob = await this.usersRepo.findActiveSagaByUserId(userId);
    if (!activeJob) {
      const user = await this.authRepo.findUserById(userId);
      return {
        status: user?.status === 'pending_deletion' ? 'pending_deletion' : 'not_requested',
        message: 'No active deletion saga running.',
      };
    }

    return {
      sagaId: activeJob.sagaId,
      status: activeJob.status,
      completedSteps: activeJob.completedSteps,
      currentStep: activeJob.currentStep,
    };
  }

  async getConsents(userId: string) {
    const consents = await this.usersRepo.findConsentsByUserId(userId);
    return consents.map((c) => ({
      id: c._id.toString(),
      consentType: c.consentType,
      action: c.action,
      hasAccepted: c.hasAccepted,
      disclaimerVersion: c.disclaimerVersion,
      recordedAt: c.recordedAt.toISOString(),
    }));
  }

  async recordConsent(
    userId: string,
    input: RecordConsentInput,
    ip: string,
    userAgent: string
  ) {
    const record = await this.usersRepo.createConsentRecord({
      userId: userId as any,
      consentType: input.consentType,
      action: input.action,
      hasAccepted: input.action === 'accepted',
      disclaimerVersion: input.disclaimerVersion,
      recordedAt: new Date(),
      ipHash: hashIp(ip),
      userAgentTruncated: truncateUserAgent(userAgent),
    });

    return {
      id: record._id.toString(),
      consentType: record.consentType,
      action: record.action,
      hasAccepted: record.hasAccepted,
      disclaimerVersion: record.disclaimerVersion,
      recordedAt: record.recordedAt.toISOString(),
    };
  }
}

export const usersService = new UsersService();

