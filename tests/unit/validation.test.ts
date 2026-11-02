import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateBody, validateQuery } from '../../src/shared/validation/validate.js';
import { AppError, ErrorCode } from '../../src/shared/errors/AppError.js';
import { Request, Response, NextFunction } from 'express';

describe('Validation Middleware (Unit)', () => {
  const testSchema = z.object({
    name: z.string().min(2),
    age: z.number().int().positive(),
  });

  it('should call next() without error when payload is valid', () => {
    const req = { body: { name: 'Sarah', age: 25 } } as Request;
    const res = {} as Response;
    let nextCalled = false;
    let nextError: unknown = null;

    const middleware = validateBody(testSchema);
    middleware(req, res, ((err?: unknown) => {
      nextCalled = true;
      nextError = err;
    }) as NextFunction);

    expect(nextCalled).toBe(true);
    expect(nextError).toBeUndefined();
    expect(req.body).toEqual({ name: 'Sarah', age: 25 });
  });

  it('should pass an AppError with VALIDATION_ERROR to next() when payload is invalid', () => {
    const req = { body: { name: 'S', age: -5 } } as Request;
    const res = {} as Response;
    let nextError: unknown = null;

    const middleware = validateBody(testSchema);
    middleware(req, res, ((err?: unknown) => {
      nextError = err;
    }) as NextFunction);

    expect(nextError).toBeInstanceOf(AppError);
    const appErr = nextError as AppError;
    expect(appErr.statusCode).toBe(400);
    expect(appErr.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
    expect(appErr.details).toHaveLength(2);
    expect(appErr.details?.[0]?.field).toBe('name');
    expect(appErr.details?.[1]?.field).toBe('age');
  });

  it('should validate query parameters correctly', () => {
    const querySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      search: z.string().optional(),
    });

    const req = { query: { page: '2', search: 'bench' } } as unknown as Request;
    const res = {} as Response;
    let nextCalled = false;

    const middleware = validateQuery(querySchema);
    middleware(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);

    expect(nextCalled).toBe(true);
    expect(req.query).toEqual({ page: 2, search: 'bench' });
  });
});

