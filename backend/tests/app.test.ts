import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.js';

describe('comportamento geral da API', () => {
  it('responde 404 em formato padronizado para rotas inexistentes', async () => {
    const res = await request(buildTestApp()).get('/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Rota não encontrada' },
    });
  });

  it('responde 400 quando o corpo não é um JSON válido', async () => {
    const res = await request(buildTestApp())
      .post('/qualquer-rota')
      .set('Content-Type', 'application/json')
      .send('{"json": quebrado');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('libera CORS apenas para as origens configuradas', async () => {
    const app = buildTestApp();

    const allowed = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const blocked = await request(app)
      .get('/health')
      .set('Origin', 'https://site-malicioso.example');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('aplica cabeçalhos de segurança e não revela a tecnologia do servidor', async () => {
    const res = await request(buildTestApp()).get('/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
