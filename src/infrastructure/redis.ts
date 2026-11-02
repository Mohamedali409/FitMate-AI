import { Redis, RedisOptions } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../shared/logger/logger.js';

let redisClient: Redis | null = null;
let isHealthy = false;

export function getRedisClient(): Redis | null {
  return redisClient;
}

export function isRedisConnected(): boolean {
  return isHealthy && redisClient?.status === 'ready';
}

export function initRedis(customOptions?: RedisOptions): Redis {
  if (redisClient) {
    return redisClient;
  }

  const options: RedisOptions = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    db: env.REDIS_DB,
    keyPrefix: env.REDIS_KEY_PREFIX,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 10) {
        logger.warn('[Redis] Max reconnection attempts reached. Continuing with degraded cache state.');
        return null; // Stop retrying; fall back to cache bypass
      }
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
    ...customOptions,
  };

  redisClient = new Redis(options);

  redisClient.on('connect', () => {
    logger.info({ host: env.REDIS_HOST, port: env.REDIS_PORT }, '[Redis] TCP connection established');
  });

  redisClient.on('ready', () => {
    isHealthy = true;
    logger.info('[Redis] Client ready to receive commands');
  });

  redisClient.on('error', (err) => {
    isHealthy = false;
    logger.warn({ err: err.message }, '[Redis] Connection error encountered');
  });

  redisClient.on('close', () => {
    isHealthy = false;
    logger.warn('[Redis] Connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.info('[Redis] Reconnecting to server...');
  });

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = initRedis();
  try {
    if (client.status === 'wait') {
      await client.connect();
    }
  } catch (err) {
    isHealthy = false;
    logger.warn({ err }, '[Redis] Initial connection failed. Service will operate in degraded cache-bypass mode.');
    // In alignment with Section 10: Redis is not a hidden single point of failure
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      isHealthy = false;
      await redisClient.quit();
      redisClient = null;
      logger.info('[Redis] Cleanly disconnected');
    } catch (err) {
      logger.error({ err }, '[Redis] Error during disconnect');
      redisClient?.disconnect();
      redisClient = null;
    }
  }
}

