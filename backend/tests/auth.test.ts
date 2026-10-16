import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Role } from '../src/generated/prisma/client.js';
import { createLogger } from '../src/lib/logger.js';
import { createErrorHandler } from '../src/middlewares/error-handler.js';
import { requireAuth, requireRole } from '../src/modules/auth/auth.middleware.js';
import { createUsersRepository } from '../src/modules/users/users.repository.js';
import { foreignPrivateKey, signToken, testTokenVerifier } from './auth-helpers.js';
import { buildTestApp, resetUsers, testPrisma } from './helpers.js';

const app = buildTestApp();
const ana = { sub: '0192f1a0-0000-7000-8000-000000000001', email: 'ana@exemplo.com' };

beforeEach(resetUsers);
afterAll(async () => {
  await resetUsers();
  await testPrisma.$disconnect();
});

describe('GET /me: verificação do login', () => {
  it('responde 401 sem token', async () => {
    const res = await request(app).get('/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it.each([
    ['cabeçalho em outro formato', async () => 'Basic abc'],
    ['token que não é JWT', async () => 'Bearer isso-nao-e-um-token'],
    ['token vencido', async () => `Bearer ${await signToken(ana, { expiresIn: '-1m' })}`],
    [
      'token de outro projeto (emissor diferente)',
      async () => `Bearer ${await signToken(ana, { issuer: 'https://outro.supabase.co/auth/v1' })}`,
    ],
    [
      'token sem login (audience "anon")',
      async () => `Bearer ${await signToken(ana, { audience: 'anon' })}`,
    ],
    [
      'token forjado (assinado com outra chave)',
      async () => `Bearer ${await signToken(ana, { key: await foreignPrivateKey() })}`,
    ],
  ])('responde 401 para %s', async (_label, header) => {
    const res = await request(app).get('/me').set('Authorization', await header());

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('cria o perfil no primeiro acesso, sempre como CUSTOMER', async () => {
    const token = await signToken({ ...ana, user_metadata: { name: 'Ana Souza' } });

    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: ana.sub,
      email: 'ana@exemplo.com',
      name: 'Ana Souza',
      role: 'CUSTOMER',
    });
    expect(await testPrisma.userProfile.count()).toBe(1);
  });

  it('ignora qualquer papel informado no token: o papel vem só do banco', async () => {
    // user_metadata é editável pelo próprio usuário; um atacante poderia
    // colocar "ADMIN" ali. O backend não pode confiar nisso.
    const token = await signToken({
      ...ana,
      role: 'ADMIN',
      user_metadata: { role: 'ADMIN' },
      app_metadata: { role: 'ADMIN' },
    });

    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);

    expect(res.body.data.role).toBe('CUSTOMER');
  });

  it('usa o papel salvo no banco', async () => {
    await testPrisma.userProfile.create({
      data: { id: ana.sub, email: ana.email, role: Role.ADMIN },
    });

    const res = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${await signToken(ana)}`);

    expect(res.body.data.role).toBe('ADMIN');
  });

  it('mantém o e-mail sincronizado com o Supabase', async () => {
    await testPrisma.userProfile.create({ data: { id: ana.sub, email: 'antigo@exemplo.com' } });

    const res = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${await signToken(ana)}`);

    expect(res.body.data.email).toBe('ana@exemplo.com');
  });

  it('não duplica o perfil quando chegam dois acessos ao mesmo tempo', async () => {
    const token = await signToken(ana);

    const responses = await Promise.all([
      request(app).get('/me').set('Authorization', `Bearer ${token}`),
      request(app).get('/me').set('Authorization', `Bearer ${token}`),
    ]);

    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(await testPrisma.userProfile.count()).toBe(1);
  });
});

describe('PATCH /me', () => {
  it('altera o próprio nome', async () => {
    const res = await request(app)
      .patch('/me')
      .set('Authorization', `Bearer ${await signToken(ana)}`)
      .send({ name: '  Ana Lima  ' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Ana Lima');
  });

  it('recusa tentar mudar o próprio papel', async () => {
    const res = await request(app)
      .patch('/me')
      .set('Authorization', `Bearer ${await signToken(ana)}`)
      .send({ name: 'Ana', role: 'ADMIN' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const profile = await testPrisma.userProfile.findUnique({ where: { id: ana.sub } });
    expect(profile?.role).toBe('CUSTOMER');
  });

  it('recusa nome longo demais', async () => {
    const res = await request(app)
      .patch('/me')
      .set('Authorization', `Bearer ${await signToken(ana)}`)
      .send({ name: 'x'.repeat(81) });

    expect(res.status).toBe(400);
  });
});

describe('requireRole', () => {
  // App mínimo só para testar o middleware de papel isoladamente.
  const users = createUsersRepository(testPrisma);
  const adminOnly = express()
    .get('/restrito', requireAuth(testTokenVerifier, users), requireRole(Role.ADMIN), (_req, res) => {
      res.json({ ok: true });
    })
    .use(createErrorHandler(createLogger('silent')));

  it('bloqueia clientes com 403', async () => {
    const res = await request(adminOnly)
      .get('/restrito')
      .set('Authorization', `Bearer ${await signToken(ana)}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('libera administradores', async () => {
    await testPrisma.userProfile.create({
      data: { id: ana.sub, email: ana.email, role: Role.ADMIN },
    });

    const res = await request(adminOnly)
      .get('/restrito')
      .set('Authorization', `Bearer ${await signToken(ana)}`);

    expect(res.status).toBe(200);
  });
});
