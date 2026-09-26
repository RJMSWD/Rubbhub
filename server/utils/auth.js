import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { recordUserActivity } from '../middleware/activityTracker.js';

const createAuthError = (code, message, status) => {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
};

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

const isTokenError = (err) => err?.code === 'INVALID_TOKEN' ||
  ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err?.name);

const findUserById = async (userId) => {
  const result = await query(
    `SELECT u.id, u.email, p.username, p.role, p.is_banned
     FROM users u
     JOIN profiles p ON u.id = p.id
     WHERE u.id = ?`,
    [userId]
  );

  return result.rows[0] || null;
};

export const getActiveUserFromToken = async (
  token,
  { verifyToken: verifyTokenImpl = verifyToken, findUserById: findUserByIdImpl = findUserById } = {}
) => {
  const decoded = verifyTokenImpl(token);

  if (!decoded?.userId) {
    throw createAuthError('INVALID_TOKEN', 'Token 无效或已过期', 401);
  }

  const user = await findUserByIdImpl(decoded.userId);
  if (!user) {
    throw createAuthError('INVALID_TOKEN', 'Token 无效或已过期', 401);
  }

  if (user.is_banned) {
    throw createAuthError('USER_BANNED', '该账号已被封禁', 403);
  }

  return {
    userId: Number(user.id),
    email: user.email,
    role: user.role,
    username: user.username
  };
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = await getActiveUserFromToken(token);

      // 记录用户活动（非阻塞，即使失败也不影响主请求）
      if (req.user) {
        recordUserActivity(req).catch(err => {
          console.error('[OptionalAuth] 记录活动失败:', err);
        });
      }
    } catch (err) {
      if (!isTokenError(err) && err?.code !== 'USER_BANNED') return next(err);
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
    req.user = await getActiveUserFromToken(token);

    // 记录用户活动（非阻塞）
    recordUserActivity(req).catch(err => {
      console.error('[RequireAuth] 记录活动失败:', err);
    });

    next();
  } catch (err) {
    if (err?.code === 'USER_BANNED') {
      return res.status(403).json({ error: err.message });
    }
    if (isTokenError(err)) return res.status(401).json({ error: 'Token 无效' });
    next(err);
  }
};
