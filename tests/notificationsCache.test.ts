import { describe, expect, it } from 'vitest';
import { createNotificationsCache } from '../src/utils/notificationsCache';

describe('createNotificationsCache', () => {
  it('keeps notifications isolated per user', () => {
    const cache = createNotificationsCache(5 * 60 * 1000);

    cache.set('user-a', [{ id: 1, is_read: false }], 1000);
    cache.set('user-b', [{ id: 2, is_read: false }], 1000);

    expect(cache.get('user-a', 1001)?.items).toEqual([{ id: 1, is_read: false }]);
    expect(cache.get('user-b', 1001)?.items).toEqual([{ id: 2, is_read: false }]);
  });

  it('updates cached unread state after mark-as-read operations', () => {
    const cache = createNotificationsCache(5 * 60 * 1000);

    cache.set('user-a', [
      { id: 1, is_read: false },
      { id: 2, is_read: false },
    ], 1000);

    cache.markAsRead('user-a', 1);
    expect(cache.get('user-a', 1001)?.items).toEqual([
      { id: 1, is_read: true },
      { id: 2, is_read: false },
    ]);

    cache.markAllAsRead('user-a');
    expect(cache.get('user-a', 1001)?.items.every((item) => item.is_read)).toBe(true);
  });
});
