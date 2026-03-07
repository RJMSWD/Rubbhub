export interface CacheableNotification {
  id: number;
  is_read: boolean;
}

interface CacheEntry<T extends CacheableNotification> {
  cachedAt: number;
  items: T[];
}

export const createNotificationsCache = <T extends CacheableNotification>(ttlMs: number) => {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(userId: string, now = Date.now()) {
      const entry = store.get(userId);
      if (!entry) return null;
      if (now - entry.cachedAt > ttlMs) {
        store.delete(userId);
        return null;
      }
      return { cachedAt: entry.cachedAt, items: [...entry.items] };
    },

    set(userId: string, items: T[], now = Date.now()) {
      store.set(userId, { cachedAt: now, items: [...items] });
    },

    markAsRead(userId: string, notificationId: number) {
      const entry = store.get(userId);
      if (!entry) return;
      store.set(userId, {
        ...entry,
        items: entry.items.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        ),
      });
    },

    markAllAsRead(userId: string) {
      const entry = store.get(userId);
      if (!entry) return;
      store.set(userId, {
        ...entry,
        items: entry.items.map((item) => ({ ...item, is_read: true })),
      });
    },

    clear(userId?: string) {
      if (userId) {
        store.delete(userId);
        return;
      }
      store.clear();
    },
  };
};
