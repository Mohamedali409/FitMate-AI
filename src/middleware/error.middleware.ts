import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../shared/errors/AppError.js';
import { ApiErrorResponse, ApiValidationErrorDetail } from '../shared/types/api.types.js';
import { logger } from '../shared/logger/logger.js';
import { env } from '../config/env.js';

export function errorMiddleware(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const correlationId = req.correlationId;

  // Case 1: Known operational AppError
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, correlationId, url: req.originalUrl, method: req.method }, '[AppError] Critical non-operational error');
    } else {
      logger.warn({ err: err.message, errorCode: err.errorCode, statusCode: err.statusCode, correlationId }, '[AppError] Operational client error');
    }

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        correlationId,
        details: err.details,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Case 2: Zod Validation Error (if thrown outside validation middleware)
  if (err instanceof ZodError) {
    const details: ApiValidationErrorDetail[] = err.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    logger.warn({ details, correlationId }, '[ZodError] Schema validation failure');

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid input parameters',
        correlationId,
        details,
      },
    };

    res.status(400).json(response);
    return;
  }

  // Case 2b: Payload Too Large (413 from body-parser)
  const errStatus = (err as any).statusCode || (err as any).status;
  if (errStatus === 413 || (err as any).type === 'entity.too.large') {
    logger.warn({ message: err.message, correlationId }, '[PayloadTooLarge] Request entity too large');
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.BAD_REQUEST,
        message: 'Request payload exceeds the maximum permitted limit of 100KB.',
        correlationId,
      },
    };
    res.status(413).json(response);
    return;
  }

  // Case 3: CORS error
  if (err.message && err.message.includes('CORS')) {
    logger.warn({ message: err.message, correlationId }, '[CORS] Request blocked by policy');
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.FORBIDDEN,
        message: err.message,
        correlationId,
      },
    };
    res.status(403).json(response);
    return;
  }

  // Case 4: Unexpected unhandled server exception
  logger.error({ err, correlationId, url: req.originalUrl, method: req.method }, '[UnhandledException] Unhandled server error');

  const isProduction = env.NODE_ENV === 'production';
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: isProduction ? 'An unexpected server error occurred. Please try again later.' : err.message || 'Internal server error',
      correlationId,
    },
  };

  res.status(500).json(response);
}

