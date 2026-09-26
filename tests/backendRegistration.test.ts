import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from '../server/node_modules/express/index.js';
import authRouter from '../server/routes/auth.js';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getConnection: vi.fn(),
  connection: {
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
    execute: vi.fn(),
  },
}));

vi.mock('../server/db.js', () => ({ query: mocks.query, getConnection: mocks.getConnection }));
vi.mock('../server/middleware/rateLimiter.js', () => ({
  authLimiter: (_req: any, _res: any, next: () => void) => next(),
}));
vi.mock('../server/utils/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn() },
}));

describe('registration writes', () => {
  let server: ReturnType<ReturnType<typeof express>['listen']>;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    mocks.query.mockReset();
    mocks.getConnection.mockReset();
    for (const method of Object.values(mocks.connection)) method.mockReset();
    mocks.getConnection.mockResolvedValue(mocks.connection);
    mocks.connection.execute.mockImplementation(async (sql: string, params: unknown[]) => {
      const result = await mocks.query(sql, params);
      return [result.rows];
    });
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM invite_codes')) return { rows: [{ id: 'invite-1' }] };
      if (sql.includes('INSERT INTO users')) return { rows: { insertId: 7 } };
      if (sql.includes('INSERT INTO profiles')) throw new Error('profile insert failed');
      return { rows: [] };
    });
  });

  it('rolls back the user insert when profile creation fails', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@example.com', password: 'pass1234', username: 'alice', inviteCode: 'Rubbish',
      }),
    });

    expect(response.status).toBe(500);
    expect(mocks.connection.rollback).toHaveBeenCalledTimes(1);
    expect(mocks.connection.release).toHaveBeenCalledTimes(1);
  });

  it('returns a conflict when a concurrent registration hits a unique constraint', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM invite_codes')) return { rows: [{ id: 'invite-1' }] };
      if (sql.includes('INSERT INTO users')) throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
      return { rows: [] };
    });

    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@example.com', password: 'pass1234', username: 'alice', inviteCode: 'Rubbish',
      }),
    });

    expect(response.status).toBe(409);
  });

  it('normalizes login email the same way as registration', async () => {
    mocks.query.mockResolvedValue({ rows: [] });

    await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'First.Last@gmail.com', password: 'pass1234' }),
    });

    const lookup = mocks.query.mock.calls.find(([sql]) => String(sql).includes('WHERE u.email = ?'));
    expect(lookup?.[1]).toEqual(['firstlast@gmail.com']);
  });
});
