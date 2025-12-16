import { body, param, validationResult } from 'express-validator';

// 验证结果处理中间件
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数错误',
        details: errors.array().map(e => ({
          field: e.path,
          message: e.msg
        }))
      }
    });
  }
  next();
};

// 注册验证
export const registerRules = [
  body('email')
    .isEmail().withMessage('邮箱格式不正确')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('密码至少6个字符')
    .matches(/^[a-zA-Z0-9!@#$%^&*]+$/).withMessage('密码只能包含字母、数字和特殊字符'),
  body('username')
    .trim()
    .isLength({ min: 2, max: 20 }).withMessage('用户名需要2-20个字符')
    .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/).withMessage('用户名只能包含字母、数字、下划线和中文'),
  body('inviteCode')
    .trim()
    .notEmpty().withMessage('邀请码不能为空')
];

// 登录验证
export const loginRules = [
  body('email')
    .isEmail().withMessage('邮箱格式不正确'),
  body('password')
    .notEmpty().withMessage('密码不能为空')
];

// 更新资料验证
export const profileRules = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('头衔最多50个字符'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('简介最多500个字符')
];

// 创建帖子验证
export const createEntryRules = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('标题需要1-100个字符'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 10000 }).withMessage('内容最多10000个字符'),
  body('visibility')
    .isIn(['public', 'private']).withMessage('可见性必须是 public 或 private'),
  body('domain')
    .trim()
    .notEmpty().withMessage('学科领域不能为空'),
  body('wasteType')
    .isIn(['recyclable', 'unrecyclable']).withMessage('废料类型无效')
];

// 评论验证
export const commentRules = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 }).withMessage('评论内容需要1-1000个字符')
];

// ID 参数验证
export const idParamRule = [
  param('id')
    .notEmpty().withMessage('ID 不能为空')
];

// 用户名参数验证
export const usernameParamRule = [
  param('username')
    .trim()
    .notEmpty().withMessage('用户名不能为空')
];

// 邀请码验证
export const inviteCodeRules = [
  body('code')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('邀请码需要2-50个字符')
];
