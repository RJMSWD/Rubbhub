import logger from '../utils/logger.js';

// 错误码定义
export const ErrorCodes = {
  UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED', message: '请先登录' },
  INVALID_TOKEN: { status: 401, code: 'INVALID_TOKEN', message: 'Token 无效或已过期' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN', message: '无权限执行此操作' },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: '资源不存在' },
  VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR', message: '请求参数错误' },
  DUPLICATE_ERROR: { status: 409, code: 'DUPLICATE_ERROR', message: '数据已存在' },
  RATE_LIMIT: { status: 429, code: 'RATE_LIMIT', message: '请求过于频繁，请稍后再试' },
  INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR', message: '服务器内部错误' }
};

// 自定义错误类
export class AppError extends Error {
  constructor(errorCode, details = null) {
    super(errorCode.message);
    this.status = errorCode.status;
    this.code = errorCode.code;
    this.details = details;
  }
}

// 错误处理中间件
export const errorHandler = (err, req, res, next) => {
  // 记录错误日志
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { 
    stack: err.stack,
    body: req.body,
    user: req.user?.userId 
  });

  // AppError（已知错误）
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }

  // express-validator 错误
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数错误',
        details: err.array()
      }
    });
  }

  // 未知错误
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : err.message
    }
  });
};

// 404 处理
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `路由 ${req.method} ${req.originalUrl} 不存在`
    }
  });
};
