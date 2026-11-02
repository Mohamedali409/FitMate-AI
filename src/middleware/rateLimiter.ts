import { Request, Response, NextFunction } from 'express';
import { getRedisClient, isRedisConnected } from '../infrastructure/redis.js';
import { AppError, ErrorCode } from '../shared/errors/AppError.js';
import { logger } from '../shared/logger/logger.js';
import { hashToken } from '../modules/auth/auth.utils.js';

export interface RateLimitOptions {
  prefix: string;
  maxRequests: number;
  windowMs: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface MemoryStoreEntry {
  count: number;
  resetAt: number;
}

// In-memory fallback map for offline Redis or degraded mode
const memoryStore = new Map<string, MemoryStoreEntry>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (typeof raw === 'string') {
      const firstIp = raw.split(',')[0]?.trim();
      if (firstIp) return firstIp;
    }
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

function checkMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { count: number; remaining: number; resetSeconds: number; isBlocked: boolean } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      count: 1,
      remaining: Math.max(0, maxRequests - 1),
      resetSeconds: Math.ceil(windowMs / 1000),
      isBlocked: maxRequests < 1,
    };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  const isBlocked = entry.count > maxRequests;

  return {
    count: entry.count,
    remaining,
    resetSeconds,
    isBlocked,
  };
}

async function checkRedisRateLimit(
  client: any,
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ count: number; remaining: number; resetSeconds: number; isBlocked: boolean }> {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = `rl:${key}`;

  const pipeline = client.pipeline();
  pipeline.incr(redisKey);
  pipeline.ttl(redisKey);
  const results = await pipeline.exec();

  if (!results || results.length < 2) {
    throw new Error('Redis pipeline returned incomplete results');
  }

  const [incrErr, countResult] = results[0];
  const [ttlErr, ttlResult] = results[1];

  if (incrErr) throw incrErr;
  if (ttlErr) throw ttlErr;

  const count = Number(countResult);
  let ttl = Number(ttlResult);

  // If key had no TTL (e.g. freshly incremented), set expiration
  if (ttl === -1 || ttl === -2) {
    await client.expire(redisKey, windowSeconds);
    ttl = windowSeconds;
  }

  const remaining = Math.max(0, maxRequests - count);
  const resetSeconds = Math.max(1, ttl);
  const isBlocked = count > maxRequests;

  return {
    count,
    remaining,
    resetSeconds,
    isBlocked,
  };
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    prefix,
    maxRequests,
    windowMs,
    message = 'Too many requests. Please try again later.',
    keyGenerator = (req: Request) => getClientIp(req),
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawKey = keyGenerator(req);
    const fullKey = `${prefix}:${rawKey}`;

    let result: { count: number; remaining: number; resetSeconds: number; isBlocked: boolean };

    try {
      if (isRedisConnected()) {
        const client = getRedisClient();
        if (client) {
          result = await checkRedisRateLimit(client, fullKey, maxRequests, windowMs);
        } else {
          result = checkMemoryRateLimit(fullKey, maxRequests, windowMs);
        }
      } else {
        result = checkMemoryRateLimit(fullKey, maxRequests, windowMs);
      }
    } catch (err: any) {
      logger.warn(
        { err: err?.message, key: fullKey },
        '[RateLimiter] Error during Redis rate-limit evaluation. Falling back to in-memory store.'
      );
      result = checkMemoryRateLimit(fullKey, maxRequests, windowMs);
    }

    // Set standard RFC rate-limiting headers on all responses
    res.setHeader('RateLimit-Limit', maxRequests.toString());
    res.setHeader('RateLimit-Remaining', result.remaining.toString());
    res.setHeader('RateLimit-Reset', result.resetSeconds.toString());

    if (result.isBlocked) {
      res.setHeader('Retry-After', result.resetSeconds.toString());
      return next(
        AppError.rateLimit(message, ErrorCode.RATE_LIMIT_EXCEEDED, [
          {
            field: 'rateLimit',
            message: `Rate limit exceeded. Retry after ${result.resetSeconds} seconds.`,
          },
        ])
      );
    }

    next();
  };
}

/**
 * Auth Strict: 5 attempts / 15 minutes per IP
 * Applied to: Register, Login, OAuth, Reset Password, Change Password, Account Deletion
 */
export const authStrictRateLimiter = createRateLimiter({
  prefix: 'auth_strict',
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyGenerator: (req) => getClientIp(req),
});

/**
 * Password Reset: 3 requests / 1 hour per IP + Email
 * Applied to: Forgot Password
 */
export const passwordResetRateLimiter = createRateLimiter({
  prefix: 'pw_reset',
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : 'no_email';
    return `${ip}:${email}`;
  },
});

/**
 * Silent Refresh: 30 requests / 1 minute per User / Token / IP
 * Applied to: Token Refresh
 */
export const silentRefreshRateLimiter = createRateLimiter({
  prefix: 'refresh',
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (req) => {
    if (req.user?.id) return req.user.id;
    if (typeof req.body?.refreshToken === 'string' && req.body.refreshToken.length > 0) {
      return hashToken(req.body.refreshToken);
    }
    return getClientIp(req);
  },
});

/**
 * Reset rate limits helper for testing suites
 */
export async function resetRateLimits(): Promise<void> {
  memoryStore.clear();
  try {
    if (isRedisConnected()) {
      const client = getRedisClient();
      if (client) {
        const keys = await client.keys('*rl:*');
        if (keys.length > 0) {
          await client.del(...keys);
        }
      }
    }
  } catch (err: any) {
    logger.warn({ err: err?.message }, '[RateLimiter] Error flushing Redis rate limit keys');
  }
}
