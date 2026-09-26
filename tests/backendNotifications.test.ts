import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from '../server/node_modules/express/index.js';
import notificationsRouter from '../server/routes/notifications.js';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('../server/db.js', () => ({ query: mocks.query }));
vi.mock('../server/utils/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: () => void) => {
    req.user = { userId: 1 };
    next();
  },
}));
vi.mock('../server/utils/logger.js', () => ({ default: { error: vi.fn(), info: vi.fn() } }));

describe('notification pagination', () => {
  let server: ReturnType<ReturnType<typeof express>['listen']>;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use('/api/notifications', notificationsRouter);
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
    mocks.query.mockResolvedValue({ rows: [] });
  });

  it('rejects negative limits before querying', async () => {
    const response = await fetch(`${baseUrl}/api/notifications?limit=-5`);

    expect(response.status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('rejects oversized limits before querying', async () => {
    const response = await fetch(`${baseUrl}/api/notifications?limit=1000000`);

    expect(response.status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
