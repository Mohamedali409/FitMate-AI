import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../src/config/env.js';

describe('Configuration Validation (Unit)', () => {
  it('should validate a valid configuration payload with defaults', () => {
    const raw = {
      MONGODB_URI: 'mongodb://localhost:27017/fitmate',
      JWT_ACCESS_SECRET: 'super_secret_jwt_string_that_is_at_least_32_characters_long',
    };

    const config = validateConfig(raw);

    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3000);
    expect(config.API_PREFIX).toBe('/api/v1');
    expect(config.MONGODB_URI).toBe('mongodb://localhost:27017/fitmate');
    expect(config.JWT_ACCESS_EXPIRES_IN).toBe(900);
  });

  it('should throw an error when mandatory MONGODB_URI is missing', () => {
    const raw = {
      JWT_ACCESS_SECRET: 'super_secret_jwt_string_that_is_at_least_32_characters_long',
    };

    expect(() => validateConfig(raw)).toThrowError(/MONGODB_URI is required/);
  });

  it('should throw an error when JWT_ACCESS_SECRET is shorter than 32 characters', () => {
    const raw = {
      MONGODB_URI: 'mongodb://localhost:27017/fitmate',
      JWT_ACCESS_SECRET: 'too_short',
    };

    expect(() => validateConfig(raw)).toThrowError(/JWT_ACCESS_SECRET must be at least 32 characters/);
  });

  it('should parse custom port and boolean flags properly', () => {
    const raw = {
      MONGODB_URI: 'mongodb://localhost:27017/fitmate',
      JWT_ACCESS_SECRET: 'super_secret_jwt_string_that_is_at_least_32_characters_long',
      PORT: '8080',
      LOG_PRETTY: 'true',
    };

    const config = validateConfig(raw);
    expect(config.PORT).toBe(8080);
    expect(config.LOG_PRETTY).toBe(true);
  });
});

