import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  goal: z
    .enum(['fat_loss', 'muscle_gain', 'recomposition', 'maintenance', 'general_fitness', 'undecided'])
    .optional(),
  heightCm: z.number().min(100.0).max(250.0).optional(),
  weightKg: z.number().min(30.0).max(300.0).optional(),
  activityMultiplier: z
    .union([z.literal(1.2), z.literal(1.375), z.literal(1.55), z.literal(1.725), z.literal(1.9)])
    .optional(),
  trainingExperience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  dietaryPreference: z
    .enum(['none', 'vegetarian', 'vegan', 'pescatarian', 'halal', 'keto', 'custom'])
    .optional(),
  customTargets: z
    .object({
      dailyCalorieTarget: z.number().int().min(500).max(10000),
      proteinTargetGrams: z.number().min(0),
      carbsTargetGrams: z.number().min(0),
      fatTargetGrams: z.number().min(0),
    })
    .optional(),
  applyRecalculatedTargets: z.boolean().optional(),
});

export const completeOnboardingSchema = z.object({
  goal: z.enum(['fat_loss', 'muscle_gain', 'recomposition', 'maintenance', 'general_fitness', 'undecided']),
  biologicalSex: z.enum(['male', 'female', 'prefer_not_to_say']),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Birth date must be in YYYY-MM-DD format' })
    .refine(
      (val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) return false;
        const today = new Date();
        const age = today.getFullYear() - date.getFullYear();
        return age >= 13 && age <= 100;
      },
      { message: 'User must be between 13 and 100 years of age' }
    ),
  heightCm: z.number().min(100.0).max(250.0),
  weightKg: z.number().min(30.0).max(300.0),
  activityMultiplier: z.union([
    z.literal(1.2),
    z.literal(1.375),
    z.literal(1.55),
    z.literal(1.725),
    z.literal(1.9),
  ]),
  trainingExperience: z.enum(['beginner', 'intermediate', 'advanced']),
  hasAcceptedHealthDisclaimer: z.literal(true, {
    errorMap: () => ({ message: 'Health disclaimer acceptance is mandatory' }),
  }),
});

export const updatePreferencesSchema = z.object({
  unitSystem: z.enum(['metric', 'imperial']).optional(),
  preferredLanguage: z.enum(['en', 'ar']).optional(),
});

export const deleteAccountSchema = z.object({
  currentPassword: z.string().optional(),
});

export const recordConsentSchema = z.object({
  consentType: z.enum(['health_disclaimer', 'terms_of_service', 'privacy_policy']),
  action: z.enum(['accepted', 'withdrawn']),
  disclaimerVersion: z.string().min(1).default('1.0.0'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type RecordConsentInput = z.infer<typeof recordConsentSchema>;

