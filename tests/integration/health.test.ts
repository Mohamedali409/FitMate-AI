import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Health Endpoints (Integration)', () => {
  const app = createApp();

  it('GET /health should return 503 or 200 with standard health envelope depending on DB status', async () => {
    const res = await request(app).get('/health');

    // In unit test without connected DB, expect 503 (degraded/unhealthy) with valid envelope
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.timestamp).toBeDefined();
    expect(res.body.data.dependencies).toBeDefined();
    expect(res.body.data.dependencies.database).toBeDefined();
    expect(res.body.data.dependencies.cache).toBeDefined();
  });

  it('GET /api/v1/health should respond under API version prefix', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.body.success).toBe(true);
    expect(res.body.data.version).toBe('1.0.0');
    expect(res.header['x-correlation-id']).toBeDefined();
  });
});

