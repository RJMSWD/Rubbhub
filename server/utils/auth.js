import jwt from 'jsonwebtoken';
import { recordUserActivity } from '../middleware/activityTracker.js';

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET);

      // 记录用户活动（非阻塞，即使失败也不影响主请求）
      if (req.user) {
        recordUserActivity(req).catch(err => {
          console.error('[OptionalAuth] 记录活动失败:', err);
        });
      }
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' });
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);

    // 记录用户活动（非阻塞）
    recordUserActivity(req).catch(err => {
      console.error('[RequireAuth] 记录活动失败:', err);
    });

    next();
  } catch {
    res.status(401).json({ error: 'Token 无效' });
  }
};
