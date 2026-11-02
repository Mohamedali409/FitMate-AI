import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '../shared/errors/AppError.js';

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const message = `Route not found: ${req.method} ${req.originalUrl}`;
  next(AppError.notFound(message, ErrorCode.NOT_FOUND));
}

