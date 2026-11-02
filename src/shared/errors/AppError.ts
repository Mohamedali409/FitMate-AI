import { ApiValidationErrorDetail } from '../types/api.types.js';

export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_ID_FORMAT: 'INVALID_ID_FORMAT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  TOKEN_REUSE_DETECTED: 'TOKEN_REUSE_DETECTED',
  INVALID_OAUTH_TOKEN: 'INVALID_OAUTH_TOKEN',
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
  FORBIDDEN: 'FORBIDDEN',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_PENDING_DELETION: 'ACCOUNT_PENDING_DELETION',
  ONBOARDING_INCOMPLETE: 'ONBOARDING_INCOMPLETE',
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  COACH_RATE_LIMIT_EXCEEDED: 'COACH_RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCodeType | string;
  public readonly isOperational: boolean;
  public readonly details?: ApiValidationErrorDetail[];

  constructor(
    message: string,
    statusCode = 500,
    errorCode: ErrorCodeType | string = ErrorCode.INTERNAL_SERVER_ERROR,
    isOperational = true,
    details?: ApiValidationErrorDetail[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(
    message: string,
    errorCode: ErrorCodeType | string = ErrorCode.VALIDATION_ERROR,
    details?: ApiValidationErrorDetail[]
  ): AppError {
    return new AppError(message, 400, errorCode, true, details);
  }

  static unauthorized(
    message: string,
    errorCode: ErrorCodeType | string = ErrorCode.UNAUTHORIZED
  ): AppError {
    return new AppError(message, 401, errorCode, true);
  }

  static forbidden(
    message: string,
    errorCode: ErrorCodeType | string = ErrorCode.FORBIDDEN
  ): AppError {
    return new AppError(message, 403, errorCode, true);
  }

  static notFound(
    message: string,
    errorCode: ErrorCodeType | string = ErrorCode.NOT_FOUND
  ): AppError {
    return new AppError(message, 404, errorCode, true);
  }

  static conflict(
    message: string,
    errorCode: ErrorCodeType | string = ErrorCode.CONFLICT
  ): AppError {
    return new AppError(message, 409, errorCode, true);
  }

  static unprocessable(
    message: string,
    errorCode: ErrorCodeType | string = ErrorCode.UNPROCESSABLE_ENTITY,
    details?: ApiValidationErrorDetail[]
  ): AppError {
    return new AppError(message, 422, errorCode, true, details);
  }

  static rateLimit(
    message = 'Too many requests',
    errorCode: ErrorCodeType | string = ErrorCode.RATE_LIMIT_EXCEEDED,
    details?: ApiValidationErrorDetail[]
  ): AppError {
    return new AppError(message, 429, errorCode, true, details);
  }

  static serviceUnavailable(
    message = 'Service temporarily unavailable',
    errorCode: ErrorCodeType | string = ErrorCode.SERVICE_UNAVAILABLE
  ): AppError {
    return new AppError(message, 503, errorCode, false);
  }

  static internal(
    message = 'Internal server error',
    errorCode: ErrorCodeType | string = ErrorCode.INTERNAL_SERVER_ERROR
  ): AppError {
    return new AppError(message, 500, errorCode, false);
  }
}
