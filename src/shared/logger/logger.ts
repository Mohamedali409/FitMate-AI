import pino from 'pino';
import { env } from '../../config/env.js';

// Sensitive keys to redact from application logs (FR-SAFE-002)
const REDACT_PATHS = [
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'headers.authorization',
  'headers.cookie',
  'cookie',
  'kmsKey',
  'secret',
  'clientSecret',
  'idToken',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    env.LOG_PRETTY && env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

