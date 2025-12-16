import { query } from '../db.js';

// 节流：同一用户60秒内只更新一次
const userLastUpdate = new Map(); // 内存缓存，键: userId, 值: 上次更新时间戳

// 从请求头获取真实IP（考虑反向代理）
const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '0.0.0.0';
};

/**
 * 记录用户活动（更新user_sessions.last_seen）
 * - 节流：同一用户60秒内只更新一次
 * - 可通过 ENABLE_ONLINE_TRACKING 环境变量禁用
 */
export const recordUserActivity = async (req) => {
  // 功能开关：如果没有启用或没有用户信息，直接跳过
  if (process.env.ENABLE_ONLINE_TRACKING !== 'true' || !req.user) {
    return;
  }

  const userId = req.user?.userId || req.user?.id;
  if (!userId) {
    return;
  }

  const now = Date.now();
  const lastUpdate = userLastUpdate.get(userId);

  // 60秒内已更新，跳过数据库写入（节流）
  if (lastUpdate && (now - lastUpdate) < 60000) {
    return;
  }

  try {
    const ipAddress = getClientIP(req);

    // Upsert: 插入或更新 user_sessions 表
    // 如果记录存在则更新 last_seen 和 last_ip，不存在则插入
    await query(
      `
      INSERT INTO user_sessions (user_id, last_seen, last_ip)
      VALUES (?, NOW(), ?)
      ON DUPLICATE KEY UPDATE
        last_seen = VALUES(last_seen),
        last_ip = VALUES(last_ip)
      `,
      [userId, ipAddress]
    );

    // 更新内存缓存
    userLastUpdate.set(userId, now);

    // 清理1小时前的缓存（防止内存泄漏）
    userLastUpdate.forEach((timestamp, id) => {
      if (now - timestamp > 3600000) {
        userLastUpdate.delete(id);
      }
    });
  } catch (err) {
    // 记录错误但不阻断请求
    console.error('[ActivityTracker] 更新用户活动失败:', err);
  }
};

/**
 * 活动追踪中间件 - 兼容 Express.js 中间件形式
 * @deprecated 建议直接使用 recordUserActivity 函数
 */
export const activityTracker = async (req, res, next) => {
  await recordUserActivity(req);
  next();
};

export default activityTracker;
