import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.js';

describe('GET /health', () => {
  it('responde 200 sem depender do banco', async () => {
    const app = buildTestApp({
      checkDatabase: async () => {
        throw new Error('banco fora do ar');
      },
    });

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /health/ready', () => {
  it('responde 200 quando o banco está acessível', async () => {
    const res = await request(buildTestApp()).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('responde 503 quando o banco está inacessível, sem expor o erro', async () => {
    const app = buildTestApp({
      checkDatabase: async () => {
        throw new Error('password authentication failed for user "vera"');
      },
    });

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unavailable', database: 'down' });
    expect(JSON.stringify(res.body)).not.toContain('password');
  });
});
