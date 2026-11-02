import { describe, it, expect } from 'vitest';
import { AppError, ErrorCode } from '../../src/shared/errors/AppError.js';

describe('AppError (Unit)', () => {
  it('should instantiate AppError with appropriate status code and defaults', () => {
    const err = new AppError('Custom error', 400, ErrorCode.VALIDATION_ERROR);

    expect(err.message).toBe('Custom error');
    expect(err.statusCode).toBe(400);
    expect(err.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
    expect(err.isOperational).toBe(true);
    expect(err.name).toBe('AppError');
  });

  it('should produce factory helpers with exact status codes', () => {
    const badReq = AppError.badRequest('Invalid input');
    expect(badReq.statusCode).toBe(400);
    expect(badReq.errorCode).toBe(ErrorCode.VALIDATION_ERROR);

    const unauth = AppError.unauthorized();
    expect(unauth.statusCode).toBe(401);
    expect(unauth.errorCode).toBe(ErrorCode.UNAUTHORIZED);

    const forbidden = AppError.forbidden();
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.errorCode).toBe(ErrorCode.FORBIDDEN);

    const notFound = AppError.notFound();
    expect(notFound.statusCode).toBe(404);
    expect(notFound.errorCode).toBe(ErrorCode.NOT_FOUND);

    const conflict = AppError.conflict('Duplicate email');
    expect(conflict.statusCode).toBe(409);
    expect(conflict.errorCode).toBe(ErrorCode.CONFLICT);

    const rateLimit = AppError.rateLimit();
    expect(rateLimit.statusCode).toBe(429);
    expect(rateLimit.errorCode).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);

    const internal = AppError.internal();
    expect(internal.statusCode).toBe(500);
    expect(internal.isOperational).toBe(false);

    const svcUnavailable = AppError.serviceUnavailable();
    expect(svcUnavailable.statusCode).toBe(503);
  });

  it('should attach validation details array when provided', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const err = AppError.badRequest('Validation failed', ErrorCode.VALIDATION_ERROR, details);

    expect(err.details).toEqual(details);
  });
});

