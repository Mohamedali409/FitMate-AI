import { beforeAll, afterAll } from 'vitest';

// Configure test environment variables before all test suites execute
beforeAll(() => {
  process.env['NODE_ENV'] = 'test';
  process.env['PORT'] = '3001';
  process.env['JWT_ACCESS_SECRET'] = 'test_secret_must_be_at_least_32_characters_long_for_tests';
  process.env['MONGODB_URI'] = 'mongodb://127.0.0.1:27017/fitmate_test';
});

afterAll(() => {
  // Global cleanup if needed
});

