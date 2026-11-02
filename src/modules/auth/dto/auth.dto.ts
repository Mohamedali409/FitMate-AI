import { z } from 'zod';

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,128}$/;

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'A valid email address is required' })
    .max(254, { message: 'Email cannot exceed 254 characters' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(128, { message: 'Password cannot exceed 128 characters' })
    .regex(passwordRegex, {
      message:
        'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
    }),
  displayName: z.string().trim().min(1).max(100).optional(),
  onboarding: z.object({
    goal: z.enum([
      'fat_loss',
      'muscle_gain',
      'recomposition',
      'maintenance',
      'general_fitness',
      'undecided',
    ]),
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
    heightCm: z
      .number()
      .min(100.0, { message: 'Height must be at least 100.0 cm' })
      .max(250.0, { message: 'Height cannot exceed 250.0 cm' }),
    weightKg: z
      .number()
      .min(30.0, { message: 'Weight must be at least 30.00 kg' })
      .max(300.0, { message: 'Weight cannot exceed 300.00 kg' }),
    activityMultiplier: z.union([
      z.literal(1.2),
      z.literal(1.375),
      z.literal(1.55),
      z.literal(1.725),
      z.literal(1.9),
    ]),
    trainingExperience: z.enum(['beginner', 'intermediate', 'advanced']),
    dietaryPreference: z
      .enum(['none', 'vegetarian', 'vegan', 'pescatarian', 'halal', 'keto', 'custom'])
      .optional()
      .default('none'),
    unitSystem: z.enum(['metric', 'imperial']).default('metric'),
    preferredLanguage: z.enum(['en', 'ar']).default('en'),
    hasAcceptedHealthDisclaimer: z.literal(true, {
      errorMap: () => ({ message: 'Health disclaimer acceptance is mandatory' }),
    }),
    hasAcceptedTerms: z.literal(true, {
      errorMap: () => ({ message: 'Terms of service acceptance is mandatory' }),
    }),
  }),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'A valid email address is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const oauthSchema = z.object({
  provider: z.literal('google'),
  idToken: z.string().min(1, { message: 'Google ID token is required' }),
  preferredLanguage: z.enum(['en', 'ar']).optional().default('en'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token is required' }),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token is required' }),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'A valid email address is required' }),
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .regex(/^[a-f0-9]{64}$/, { message: 'Token must be a valid 64-character hex string' }),
  newPassword: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(128, { message: 'Password cannot exceed 128 characters' })
    .regex(passwordRegex, {
      message:
        'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
    }),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required' }),
  newPassword: z
    .string()
    .min(8, { message: 'New password must be at least 8 characters long' })
    .max(128, { message: 'New password cannot exceed 128 characters' })
    .regex(passwordRegex, {
      message:
        'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OAuthInput = z.infer<typeof oauthSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

