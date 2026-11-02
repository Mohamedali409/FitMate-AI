import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('App Bootstrap & Middleware (Integration)', () => {
  const app = createApp();

  it('should return 404 with standard error envelope for unmapped routes', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('Route not found');
    expect(res.body.error.correlationId).toBeDefined();
    expect(res.header['x-correlation-id']).toBe(res.body.error.correlationId);
  });

  it('should preserve and reflect client-provided X-Correlation-ID', async () => {
    const customId = 'e3b0c442-98fc-1c14-9afb-4c8996fb9242';
    const res = await request(app)
      .get('/health')
      .set('X-Correlation-ID', customId);

    expect(res.header['x-correlation-id']).toBe(customId);
  });

  it('should attach essential security headers (Helmet)', async () => {
    const res = await request(app).get('/health');

    expect(res.header['x-content-type-options']).toBe('nosniff');
    expect(res.header['x-frame-options']).toBe('DENY');
  });

  it('should reject requests exceeding 100kb payload limit with 413 Payload Too Large', async () => {
    // Generate 120KB payload
    const largeData = 'a'.repeat(120 * 1024);

    const res = await request(app)
      .post('/health')
      .set('Content-Type', 'application/json')
      .send({ data: largeData });

    expect(res.status).toBe(413);
  });
});

