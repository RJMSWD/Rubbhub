import rateLimit from 'express-rate-limit';

// 通用 API 限流：1分钟100次
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: '请求过于频繁，请稍后再试'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 登录/注册限流：5分钟10次
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: '登录尝试过于频繁，请5分钟后再试'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 发帖限流：1分钟5次
export const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: '发布过于频繁，请稍后再试'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});
