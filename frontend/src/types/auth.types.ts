/**
 * FitMate AI — Frontend Auth & User Profile Types
 * Aligned with backend `src/modules/auth/dto/auth.dto.ts` and `users.dto.ts`
 */

export type FitnessGoal =
  | 'fat_loss'
  | 'muscle_gain'
  | 'recomposition'
  | 'maintenance'
  | 'general_fitness'
  | 'undecided';

export type BiologicalSex = 'male' | 'female' | 'prefer_not_to_say';

export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';

export type DietaryPreference =
  | 'none'
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'halal'
  | 'keto'
  | 'custom';

export type UnitSystem = 'metric' | 'imperial';
export type PreferredLanguage = 'en' | 'ar';

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  isEmailVerified: boolean;
  isOnboardingCompleted: boolean;
}

export interface UserProfileSnapshot {
  goal: FitnessGoal;
  dailyCalorieTarget: number;
  proteinTargetGrams: number;
  carbsTargetGrams: number;
  fatTargetGrams: number;
  isEstimated: true;
  unitSystem: UnitSystem;
  preferredLanguage: PreferredLanguage;
}

export interface AuthTokens {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
}

export interface AuthResponseData {
  user: UserSummary;
  tokens: AuthTokens;
  profile?: UserProfileSnapshot | null;
}

export interface RefreshResponseData {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
}

export interface UserIdentityDto {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  tokenVersion: number;
  createdAt: string;
}

export interface LogoutResponseData {
  message: string;
}

export interface OnboardingFormState {
  // Step 1: Goal & Biological Sex
  goal: FitnessGoal;
  biologicalSex: BiologicalSex;
  birthDate: string; // YYYY-MM-DD

  // Step 2: Physical Metrics
  heightCm: number;
  weightKg: number;
  unitSystem: UnitSystem;

  // Step 3: Activity & Training
  activityMultiplier: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
  trainingExperience: TrainingExperience;

  // Step 4: Dietary Preferences & Language
  dietaryPreference: DietaryPreference;
  preferredLanguage: PreferredLanguage;

  // Step 5: Account Info & Legal Consents
  displayName: string;
  email: string;
  password: string;
  hasAcceptedHealthDisclaimer: boolean;
  hasAcceptedTerms: boolean;
}
