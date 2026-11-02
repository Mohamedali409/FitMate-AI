import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/auth.utils.js';
import { UserModel } from '../modules/auth/models/user.model.js';
import { AppError, ErrorCode } from '../shared/errors/AppError.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized(
        'Authentication token is missing or malformed.',
        ErrorCode.UNAUTHORIZED
      );
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw AppError.unauthorized(
        'Authentication token is missing.',
        ErrorCode.UNAUTHORIZED
      );
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      throw AppError.unauthorized(
        'Access token is invalid or expired.',
        ErrorCode.TOKEN_EXPIRED
      );
    }

    const user = await UserModel.findById(decoded.userId).exec();
    if (!user) {
      throw AppError.unauthorized(
        'User account no longer exists.',
        ErrorCode.UNAUTHORIZED
      );
    }

    if (user.status === 'suspended') {
      throw AppError.forbidden(
        'Account is suspended.',
        ErrorCode.ACCOUNT_SUSPENDED
      );
    }

    const isDeletionRelatedRoute =
      req.originalUrl.includes('/account/deletion-status') ||
      req.originalUrl.endsWith('/account');

    if (
      (user.status === 'pending_deletion' || user.status === 'deleting') &&
      !isDeletionRelatedRoute
    ) {
      throw AppError.forbidden(
        'Account is pending deletion.',
        ErrorCode.ACCOUNT_PENDING_DELETION
      );
    }

    // High security check: tokenVersion matching (DB-040)
    // Allows the initiating client session to check deletion status or retry deletion
    if (user.tokenVersion !== decoded.tokenVersion) {
      const isAllowedDeletionGrace =
        isDeletionRelatedRoute &&
        user.status === 'pending_deletion' &&
        decoded.tokenVersion === user.tokenVersion - 1;

      if (!isAllowedDeletionGrace) {
        throw AppError.unauthorized(
          'Token has been invalidated by a credential update or global logout.',
          ErrorCode.TOKEN_REVOKED
        );
      }
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    next();
  } catch (error) {
    next(error);
  }
}
