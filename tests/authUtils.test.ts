import { describe, expect, it } from 'vitest';
import { getActiveUserFromToken } from '../server/utils/auth.js';

describe('getActiveUserFromToken', () => {
  it('returns an active user payload when the backing user is still allowed', async () => {
    const user = await getActiveUserFromToken('token', {
      verifyToken: () => ({ userId: 7, email: 'user@example.com', role: 'user' }),
      findUserById: async (id: number) => ({
        id,
        email: 'user@example.com',
        username: 'alice',
        role: 'user',
        is_banned: 0,
      }),
    });

    expect(user).toEqual({
      userId: 7,
      email: 'user@example.com',
      role: 'user',
      username: 'alice',
    });
  });

  it('rejects banned users even when the token itself is still valid', async () => {
    await expect(
      getActiveUserFromToken('token', {
        verifyToken: () => ({ userId: 7, email: 'user@example.com', role: 'user' }),
        findUserById: async () => ({
          id: 7,
          email: 'user@example.com',
          username: 'alice',
          role: 'user',
          is_banned: 1,
        }),
      })
    ).rejects.toMatchObject({ code: 'USER_BANNED' });
  });
});
