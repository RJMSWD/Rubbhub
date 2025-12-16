import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { inviteCodeRules, validate } from '../middleware/validator.js';
import logger from '../utils/logger.js';

const router = express.Router();

// 管理员验证中间件
import { recordUserActivity } from '../middleware/activityTracker.js';

const adminMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '请先登录' }
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '无管理员权限' }
      });
    }
    req.user = decoded;

    // 记录管理员活动（非阻塞，失败不影响请求）
    try {
      await recordUserActivity(req);
    } catch (activityErr) {
      // 活动记录失败不阻断主请求
      console.error('[AdminActivity] 记录活动失败:', activityErr);
    }

    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token 无效或已过期' }
    });
  }
};

// 获取所有邀请码
router.get('/invite-codes', adminMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT * FROM invite_codes ORDER BY created_at DESC', []);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error('获取邀请码错误:', err);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: '获取失败' } 
    });
  }
});

// 创建邀请码
router.post('/invite-codes', adminMiddleware, inviteCodeRules, validate, async (req, res) => {
  try {
    const { code } = req.body;
    
    // 检查邀请码是否已存在
    const existing = await query('SELECT id FROM invite_codes WHERE code = ?', [code]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: { code: 'DUPLICATE_ERROR', message: '邀请码已存在' } 
      });
    }
    
    const id = uuidv4();
    await query(
      'INSERT INTO invite_codes (id, code, is_active) VALUES (?, ?, true)',
      [id, code]
    );
    
    logger.info(`管理员 ${req.user.userId} 创建邀请码: ${code}`);
    res.json({ success: true, message: '邀请码创建成功' });
  } catch (err) {
    logger.error('创建邀请码错误:', err);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: '创建失败' } 
    });
  }
});

// 切换邀请码状态
router.put('/invite-codes/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await query('UPDATE invite_codes SET is_active = ? WHERE id = ?', [is_active, id]);
    res.json({ success: true, message: is_active ? '邀请码已启用' : '邀请码已禁用' });
  } catch (err) {
    logger.error('更新邀请码错误:', err);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: '更新失败' } 
    });
  }
});

// 删除邀请码
router.delete('/invite-codes/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM invite_codes WHERE id = ?', [id]);
    logger.info(`管理员 ${req.user.userId} 删除邀请码: ${id}`);
    res.json({ success: true, message: '邀请码已删除' });
  } catch (err) {
    logger.error('删除邀请码错误:', err);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: '删除失败' } 
    });
  }
});

// 获取所有用户
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, role, is_banned, created_at FROM profiles ORDER BY created_at DESC',
      []
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error('获取用户错误:', err);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: '获取失败' } 
    });
  }
});

// 封禁/解封用户
router.put('/users/:id/ban', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_banned } = req.body;

    // 不能封禁自己
    if (id == req.user.userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_OPERATION', message: '不能封禁自己' }
      });
    }

    // 不能封禁其他管理员
    const userResult = await query('SELECT role, username FROM profiles WHERE id = ?', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '用户不存在' }
      });
    }

    if (userResult.rows[0]?.role === 'admin') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_OPERATION', message: '不能封禁管理员' }
      });
    }

    await query('UPDATE profiles SET is_banned = ? WHERE id = ?', [is_banned, id]);

    const action = is_banned ? '封禁' : '解封';
    logger.info(`管理员 ${req.user.userId} ${action}用户: ${userResult.rows[0].username}`);
    res.json({ success: true, message: `用户已${action}` });
  } catch (err) {
    logger.error('封禁用户错误:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '操作失败' }
    });
  }
});

/**
 * @route GET /api/admin/online-users
 * @desc 获取当前在线用户列表
 * @query window - 时间窗口（分钟），默认5分钟
 * @query limit - 返回用户数量限制，默认50
 * @access 仅限管理员
 */
router.get('/online-users', adminMiddleware, async (req, res) => {
  try {
    const window = parseInt(req.query.window) || 5; // 默认5分钟

    // 查询在指定时间窗口内活跃的用户
    logger.info(`管理员 ${req.user.userId} 查询在线用户，时间窗口: ${window}分钟`);

    const result = await query(
      `
      SELECT
        p.id,
        p.username,
        u.email,
        p.role,
        s.last_seen,
        s.last_ip
      FROM user_sessions s
      LEFT JOIN profiles p ON p.id = s.user_id
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.last_seen > NOW() - INTERVAL ? MINUTE
        AND p.id IS NOT NULL
      ORDER BY s.last_seen DESC
      LIMIT 50
      `,
      [window]
    );

    const users = result.rows.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      lastSeen: user.last_seen,
      lastIp: user.last_ip
    }));

    logger.info(`在线用户查询成功: ${users.length} 人`);

    res.json({
      success: true,
      data: users,
      count: users.length,
      window
    });
  } catch (err) {
    logger.error('获取在线用户错误:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取失败', details: err.message }
    });
  }
});

export default router;
