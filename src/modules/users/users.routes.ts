import { Router } from 'express';
import { usersController } from './users.controller.js';
import { validate } from '../../shared/validation/validate.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { authStrictRateLimiter } from '../../middleware/rateLimiter.js';
import {
  updateProfileSchema,
  completeOnboardingSchema,
  updatePreferencesSchema,
  deleteAccountSchema,
  recordConsentSchema,
} from './dto/users.dto.js';

const router = Router();

// All user routes require authenticated session
router.use(authMiddleware);

// EP-USER-001: Retrieve user profile & targets
router.get('/profile', usersController.getProfile);

// EP-USER-002: Update profile traits & goals
router.patch('/profile', validate(updateProfileSchema), usersController.updateProfile);

// EP-USER-003: Complete Google OAuth onboarding
router.post(
  '/onboarding/complete',
  validate(completeOnboardingSchema),
  usersController.completeOnboarding
);

// EP-USER-004: Update preferences (language & units)
router.patch('/preferences', validate(updatePreferencesSchema), usersController.updatePreferences);

// EP-USER-005: Initiate account deletion saga (Auth Strict: 5 req / 15m)
router.delete('/account', authStrictRateLimiter, validate(deleteAccountSchema), usersController.deleteAccount);

// EP-USER-006: Check account deletion status
router.get('/account/deletion-status', usersController.getDeletionStatus);

// EP-USER-007: List user consents
router.get('/consents', usersController.getConsents);

// EP-USER-008: Record affirmative consent or withdrawal action
router.post('/consents', validate(recordConsentSchema), usersController.recordConsent);

export const usersRoutes = router;

