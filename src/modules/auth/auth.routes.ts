import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../shared/validation/validate.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  authStrictRateLimiter,
  passwordResetRateLimiter,
  silentRefreshRateLimiter,
} from '../../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  oauthSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './dto/auth.dto.js';

const router = Router();

// EP-AUTH-001: Atomic user registration (Auth Strict: 5 req / 15m)
router.post('/register', authStrictRateLimiter, validate(registerSchema), authController.register);

// EP-AUTH-002: Credentials login (Auth Strict: 5 req / 15m)
router.post('/login', authStrictRateLimiter, validate(loginSchema), authController.login);

// EP-AUTH-003: Third-party OAuth Google (Auth Strict: 5 req / 15m)
router.post('/oauth', authStrictRateLimiter, validate(oauthSchema), authController.oauth);

// EP-AUTH-004: Silent token refresh & rotation (Silent Refresh: 30 req / 1m)
router.post('/refresh', silentRefreshRateLimiter, validate(refreshSchema), authController.refresh);

// EP-AUTH-005: Session logout
router.post('/logout', validate(logoutSchema), authController.logout);

// EP-AUTH-006: Password reset request (Password Reset: 3 req / 1h)
router.post('/forgot-password', passwordResetRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);

// EP-AUTH-007: Password reset confirmation (Auth Strict: 5 req / 15m)
router.post('/reset-password', authStrictRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

// EP-AUTH-008: Authenticated password change (Auth Strict: 5 req / 15m)
router.post(
  '/change-password',
  authMiddleware,
  authStrictRateLimiter,
  validate(changePasswordSchema),
  authController.changePassword
);

// EP-AUTH-009: Current user identity
router.get('/me', authMiddleware, authController.getMe);

export const authRoutes = router;

