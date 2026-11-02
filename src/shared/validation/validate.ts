import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError, ErrorCode } from '../errors/AppError.js';
import { ApiValidationErrorDetail } from '../types/api.types.js';

function formatZodErrors(error: ZodError): ApiValidationErrorDetail[] {
  return error.errors.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      return next(AppError.badRequest('Invalid request body payload', ErrorCode.VALIDATION_ERROR, details));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      return next(AppError.badRequest('Invalid query parameters', ErrorCode.VALIDATION_ERROR, details));
    }
    req.query = result.data as Request['query'];
    next();
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      return next(AppError.badRequest('Invalid path parameters', ErrorCode.VALIDATION_ERROR, details));
    }
    req.params = result.data as Request['params'];
    next();
  };
}

export const validate = validateBody;

