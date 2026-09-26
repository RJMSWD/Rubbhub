import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from '../server/node_modules/express/index.js';
import entriesRouter from '../server/routes/entries.js';

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
  user: { userId: 1, role: 'user', username: 'alice' },
}));

vi.mock('../server/db.js', () => ({ query: mocks.query, getConnection: mocks.getConnection }));
vi.mock('../server/utils/auth.js', () => ({
  optionalAuth: (req: any, _res: any, next: () => void) => {
    req.user = mocks.user;
    next();
  },
  requireAuth: (req: any, _res: any, next: () => void) => {
    req.user = mocks.user;
    next();
  },
}));
vi.mock('../server/middleware/rateLimiter.js', () => ({
  createLimiter: (_req: any, _res: any, next: () => void) => next(),
}));
vi.mock('../server/utils/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn() },
}));
vi.mock('../server/routes/notifications.js', () => ({ createNotification: vi.fn() }));

describe('entries API safety', () => {
  let server: ReturnType<ReturnType<typeof express>['listen']>;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/entries', entriesRouter);
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
    mocks.query.mockResolvedValue({ rows: [] });
    for (const method of Object.values(mocks.connection)) method.mockReset();
    mocks.connection.execute.mockImplementation(async (sql: string, params: unknown[]) => {
      const result = await mocks.query(sql, params);
      return [result.rows];
    });
    mocks.getConnection.mockResolvedValue(mocks.connection);
  });

  it('does not allow another user to like a private entry', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM entries')) {
        return { rows: [{ id: 'private-1', author_id: 2, title: 'private', visibility: 'private' }] };
      }
      return { rows: [] };
    });

    const response = await fetch(`${baseUrl}/api/entries/private-1/like`, { method: 'POST' });

    expect(response.status).toBe(404);
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO entry_likes'))).toBe(false);
  });

  it('rejects comments on another user’s private entry', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM entries')) {
        return { rows: [{ id: 'private-1', author_id: 2, title: 'private', visibility: 'private' }] };
      }
      return { rows: [] };
    });

    const response = await fetch(`${baseUrl}/api/entries/private-1/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'hello' }),
    });

    expect(response.status).toBe(404);
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO comments'))).toBe(false);
  });

  it('rejects a parent comment from another entry', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM entries')) {
        return { rows: [{ id: 'public-1', author_id: 2, title: 'public', visibility: 'public' }] };
      }
      if (sql.includes('FROM comments') && !sql.includes('entry_id = ?')) {
        return { rows: [{ id: 'other-comment', parent_id: null, author_id: 2, author_name: 'bob' }] };
      }
      return { rows: [] };
    });

    const response = await fetch(`${baseUrl}/api/entries/public-1/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'reply', parentId: 'other-comment' }),
    });

    expect(response.status).toBe(404);
  });

  it('rejects blank comments before writing to the database', async () => {
    const response = await fetch(`${baseUrl}/api/entries/public-1/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '   ' }),
    });

    expect(response.status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('preserves the total count on an empty page', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*)')) return { rows: [{ total: 23 }] };
      return { rows: [] };
    });

    const response = await fetch(`${baseUrl}/api/entries?page=9&limit=10`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({ entries: [], total: 23, totalPages: 3 });
  });

  it('rejects invalid pagination instead of querying with a negative limit', async () => {
    const response = await fetch(`${baseUrl}/api/entries?limit=-5`);

    expect(response.status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('does not allow another user to like a comment on a private entry', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM comments c')) {
        return { rows: [{ id: 'comment-1', entry_id: 'private-1', author_id: 2, visibility: 'private' }] };
      }
      return { rows: [] };
    });

    const response = await fetch(`${baseUrl}/api/entries/comments/comment-1/like`, { method: 'POST' });

    expect(response.status).toBe(404);
  });

  it('updates entry likes inside one transaction', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM entries')) {
        return { rows: [{ id: 'public-1', author_id: 2, title: 'public', visibility: 'public' }] };
      }
      return { rows: [] };
    });

    const response = await fetch(`${baseUrl}/api/entries/public-1/like`, { method: 'POST' });

    expect(response.status).toBe(200);
    expect(mocks.connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.connection.commit).toHaveBeenCalledTimes(1);
    expect(mocks.connection.release).toHaveBeenCalledTimes(1);
  });

  it('deletes an entry and its dependent rows atomically through foreign keys', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT author_id, visibility FROM entries')) {
        return { rows: [{ author_id: 1, visibility: 'public' }] };
      }
      return { rows: [] };
    });

    const response = await fetch(`${baseUrl}/api/entries/public-1`, { method: 'DELETE' });
    const deletes = mocks.query.mock.calls
      .map(([sql]) => String(sql))
      .filter((sql) => sql.startsWith('DELETE'));

    expect(response.status).toBe(200);
    expect(deletes).toEqual(['DELETE FROM entries WHERE id = ?']);
  });

  it('rolls back deleting a main comment if the final delete fails', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT author_id, parent_id FROM comments')) {
        return { rows: [{ author_id: 1, parent_id: null }] };
      }
      if (sql.includes('DELETE FROM comments WHERE id = ?')) throw new Error('delete failed');
      return { rows: [] };
    });

    const response = await fetch(`${baseUrl}/api/entries/comments/comment-1`, { method: 'DELETE' });

    expect(response.status).toBe(500);
    expect(mocks.connection.rollback).toHaveBeenCalledTimes(1);
    expect(mocks.connection.release).toHaveBeenCalledTimes(1);
  });
});
