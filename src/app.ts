import express, { Express } from 'express';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './shared/logger/logger.js';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { createSecurityHeadersMiddleware, createCorsMiddleware } from './middleware/securityHeaders.js';
import { notFoundMiddleware } from './middleware/notFound.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';

export function createApp(): Express {
  const app = express();

  // Trust reverse proxy (e.g. Cloudflare / Nginx)
  app.set('trust proxy', 1);

  // 1. Request correlation ID
  app.use(correlationIdMiddleware);

  // 2. Security headers & CORS
  app.use(createSecurityHeadersMiddleware());
  app.use(createCorsMiddleware());

  // 3. Body parsers with defensive size boundaries (max 100KB)
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // 4. Structured HTTP request logging with PII redaction
  if (env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        genReqId: (req: any) => req.correlationId || 'unknown',
        customLogLevel: (_req: any, res: any, err: any) => {
          if (res.statusCode >= 500 || err) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
      })
    );
  }

  // 5. Mount root and versioned health routes
  app.use('/', healthRoutes); // GET /health
  app.use(env.API_PREFIX, healthRoutes); // GET /api/v1/health

  // 6. Mount domain feature modules
  app.use(`${env.API_PREFIX}/auth`, authRoutes);
  app.use(`${env.API_PREFIX}/users`, usersRoutes);

  // 7. 404 Catch-all handler for unmapped routes
  app.use(notFoundMiddleware);

  // 8. Centralized application error handler
  app.use(errorMiddleware);

  return app;
}

