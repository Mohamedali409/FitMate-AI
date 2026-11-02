import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:8081'),

  // Database Configuration
  MONGODB_URI: z.string({ required_error: 'MONGODB_URI is required' }).min(1, 'MONGODB_URI is required'),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().positive().default(50),
  MONGODB_MIN_POOL_SIZE: z.coerce.number().int().nonnegative().default(10),

  // Redis Configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().int().nonnegative().default(0),
  REDIS_KEY_PREFIX: z.string().default('fitmate:'),

  // Security & Secrets
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long'),
  JWT_ACCESS_EXPIRES_IN: z.coerce.number().int().positive().default(900), // 15 minutes in seconds
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(30),
  KMS_RECOVERY_KEY: z.string().length(64, 'KMS_RECOVERY_KEY must be a 64-character hex string').optional(),

  // Logging Configuration
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates and parses environment variables.
 * Fails fast with clear diagnostic errors if mandatory variables are missing.
 */
function validateConfig(configInput: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(configInput);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    throw new Error(`[Configuration Error] Invalid or missing environment variables:\n${errorDetails}`);
  }

  return result.data;
}

// In test environment, provide fallback test URI if MONGODB_URI is not set
const rawEnv: Record<string, unknown> = { ...process.env };
if (process.env['NODE_ENV'] === 'test' && !rawEnv['MONGODB_URI']) {
  rawEnv['MONGODB_URI'] = 'mongodb://127.0.0.1:27017/fitmate_test';
}
if (process.env['NODE_ENV'] === 'test' && !rawEnv['JWT_ACCESS_SECRET']) {
  rawEnv['JWT_ACCESS_SECRET'] = 'test_jwt_access_secret_min_32_chars_long_for_unit_tests';
}

export const env = validateConfig(rawEnv);
export { validateConfig };

