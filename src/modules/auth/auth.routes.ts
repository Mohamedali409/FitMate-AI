import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../shared/validation/validate.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
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

// EP-AUTH-001: Atomic user registration
router.post('/register', validate(registerSchema), authController.register);

// EP-AUTH-002: Credentials login
router.post('/login', validate(loginSchema), authController.login);

// EP-AUTH-003: Third-party OAuth (Google)
router.post('/oauth', validate(oauthSchema), authController.oauth);

// EP-AUTH-004: Silent token refresh & rotation
router.post('/refresh', validate(refreshSchema), authController.refresh);

// EP-AUTH-005: Session logout
router.post('/logout', validate(logoutSchema), authController.logout);

// EP-AUTH-006: Password reset request
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

// EP-AUTH-007: Password reset confirmation
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// EP-AUTH-008: Authenticated password change
router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  authController.changePassword
);

// EP-AUTH-009: Current user identity
router.get('/me', authMiddleware, authController.getMe);

export const authRoutes = router;

