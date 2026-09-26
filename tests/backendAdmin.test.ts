import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from '../server/node_modules/express/index.js';
import jwt from '../server/node_modules/jsonwebtoken/index.js';
import adminRouter from '../server/routes/admin.js';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('../server/db.js', () => ({ query: mocks.query }));
vi.mock('../server/utils/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn() },
}));

describe('admin API authorization', () => {
  let server: ReturnType<ReturnType<typeof express>['listen']>;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'backend-admin-test-secret';
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);
    app.use((_err: Error, _req: any, res: any, _next: any) => res.status(500).json({ error: '服务器错误' }));
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
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM users u')) {
        return { rows: [{ id: 1, email: 'admin@example.com', username: 'former-admin', role: 'user', is_banned: 0 }] };
      }
      return { rows: [] };
    });
  });

  it('uses the current database role instead of an old admin token', async () => {
    const token = jwt.sign({ userId: 1, role: 'admin' }, process.env.JWT_SECRET!);

    const response = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(403);
  });

  it('does not misreport a database outage as an invalid token', async () => {
    mocks.query.mockRejectedValue(new Error('database unavailable'));
    const token = jwt.sign({ userId: 1, role: 'admin' }, process.env.JWT_SECRET!);

    const response = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(500);
  });

  it('rejects non-boolean ban values', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM users u')) {
        return { rows: [{ id: 1, email: 'admin@example.com', username: 'admin', role: 'admin', is_banned: 0 }] };
      }
      return { rows: [] };
    });
    const token = jwt.sign({ userId: 1, role: 'admin' }, process.env.JWT_SECRET!);

    const response = await fetch(`${baseUrl}/api/admin/users/2/ban`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_banned: 'false' }),
    });

    expect(response.status).toBe(400);
  });

  it('returns a conflict when an invite code is created concurrently', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM users u')) {
        return { rows: [{ id: 1, email: 'admin@example.com', username: 'admin', role: 'admin', is_banned: 0 }] };
      }
      if (sql.includes('INSERT INTO invite_codes')) {
        throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
      }
      return { rows: [] };
    });
    const token = jwt.sign({ userId: 1, role: 'admin' }, process.env.JWT_SECRET!);

    const response = await fetch(`${baseUrl}/api/admin/invite-codes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'new-code' }),
    });

    expect(response.status).toBe(409);
  });

  it('rejects a missing invite-code status instead of returning a server error', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM users u')) {
        return { rows: [{ id: 1, email: 'admin@example.com', username: 'admin', role: 'admin', is_banned: 0 }] };
      }
      return { rows: [] };
    });
    const token = jwt.sign({ userId: 1, role: 'admin' }, process.env.JWT_SECRET!);

    const response = await fetch(`${baseUrl}/api/admin/invite-codes/code-1`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(400);
  });
});
