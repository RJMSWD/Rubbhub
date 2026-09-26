import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from '../server/node_modules/express/index.js';
import usersRouter from '../server/routes/users.js';

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
vi.mock('../server/utils/auth.js', () => ({
  optionalAuth: (req: any, _res: any, next: () => void) => {
    req.user = { userId: 1, username: 'alice' };
    next();
  },
  requireAuth: (req: any, _res: any, next: () => void) => {
    req.user = { userId: 1, username: 'alice' };
    next();
  },
}));
vi.mock('../server/routes/notifications.js', () => ({ createNotification: vi.fn() }));
vi.mock('../server/utils/logger.js', () => ({ default: { error: vi.fn(), info: vi.fn() } }));

describe('follow API consistency', () => {
  let server: ReturnType<ReturnType<typeof express>['listen']>;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/users', usersRouter);
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
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM profiles')) return { rows: [{ id: 2 }] };
      return { rows: [] };
    });
    mocks.connection.execute.mockImplementation(async (sql: string, params: unknown[]) => {
      const result = await mocks.query(sql, params);
      return [result.rows];
    });
    mocks.getConnection.mockResolvedValue(mocks.connection);
  });

  it('updates follow state inside one transaction', async () => {
    const response = await fetch(`${baseUrl}/api/users/bob/follow`, { method: 'POST' });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ following: true });
    expect(mocks.connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.connection.commit).toHaveBeenCalledTimes(1);
    expect(mocks.connection.release).toHaveBeenCalledTimes(1);
  });
});
