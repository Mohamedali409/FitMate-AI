import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import { env } from '../config/env.js';

export function createSecurityHeadersMiddleware() {
  return helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
  });
}

export function createCorsMiddleware() {
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

  const corsOptions: CorsOptions = {
    origin(requestOrigin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!requestOrigin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(requestOrigin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${requestOrigin} not permitted by CORS policy`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-ID',
      'X-Idempotency-Key',
      'X-Timezone-Offset-Minutes',
      'X-Unit-System',
      'Accept-Language',
    ],
    exposedHeaders: ['X-Correlation-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After'],
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
  };

  return cors(corsOptions);
}

