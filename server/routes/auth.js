import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { registerRules, loginRules, profileRules, validate } from '../middleware/validator.js';
import logger from '../utils/logger.js';

const router = express.Router();

// 注册
router.post('/register', authLimiter, registerRules, validate, async (req, res) => {
  try {
    const { email, password, username, inviteCode } = req.body;

    // 验证邀请码
    const codeResult = await query(
      'SELECT * FROM invite_codes WHERE code = ? AND is_active = true',
      [inviteCode]
    );
    if (codeResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_INVITE_CODE', message: '邀请码无效或已停用' } 
      });
    }

    // 检查邮箱是否已存在
    const emailCheck = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: { code: 'EMAIL_EXISTS', message: '该邮箱已被注册' } 
      });
    }

    // 检查用户名是否已存在
    const usernameCheck = await query('SELECT id FROM profiles WHERE username = ?', [username]);
    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: { code: 'USERNAME_EXISTS', message: '该用户名已被占用' } 
      });
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const userResult = await query(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, passwordHash]
    );
    const userId = userResult.rows.insertId;

    // 创建用户资料
    await query(
      `INSERT INTO profiles (id, username, title, bio, role) 
       VALUES (?, ?, '学术难民', '这个家伙很懒，什么实验记录都没留下。', 'user')`,
      [userId, username]
    );

    logger.info(`新用户注册: ${username} (${email})`);
    res.json({ success: true, message: '注册成功' });
  } catch (err) {
    logger.error('注册错误:', err);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: '注册失败，请重试' } 
    });
  }
});

// 登录
router.post('/login', authLimiter, loginRules, validate, async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const userResult = await query(
      `SELECT u.id, u.email, u.password_hash, p.username, p.title, p.bio, p.role, p.is_banned, p.created_at
       FROM users u
       JOIN profiles p ON u.id = p.id
       WHERE u.email = ?`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'INVALID_CREDENTIALS', message: '邮箱或密码错误' } 
      });
    }

    const user = userResult.rows[0];

    // 检查是否被封禁
    if (user.is_banned) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'USER_BANNED', message: '该账号已被封禁' } 
      });
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'INVALID_CREDENTIALS', message: '邮箱或密码错误' } 
      });
    }

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info(`用户登录: ${user.username}`);
    res.json({
      success: true,
      token,
      user: {
        id: String(user.id),
        email: user.email,
        username: user.username,
        title: user.title,
        bio: user.bio,
        role: user.role,
        joinedAt: user.created_at
      }
    });
  } catch (err) {
    logger.error('登录错误:', err);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: '登录失败，请重试' } 
    });
  }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: '请先登录' } 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userResult = await query(
      `SELECT u.id, u.email, p.username, p.title, p.bio, p.role, p.created_at
       FROM users u
       JOIN profiles p ON u.id = p.id
       WHERE u.id = ?`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'USER_NOT_FOUND', message: '用户不存在' } 
      });
    }

    const user = userResult.rows[0];
    res.json({
      success: true,
      user: {
        id: String(user.id),
        email: user.email,
        username: user.username,
        title: user.title,
        bio: user.bio,
        role: user.role,
        joinedAt: user.created_at
      }
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'INVALID_TOKEN', message: 'Token 无效或已过期' } 
      });
    }
    logger.error('获取用户信息错误:', err);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: '获取用户信息失败' } 
    });
  }
});

// 更新用户资料
router.put('/profile', profileRules, validate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: '请先登录' } 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { title, bio } = req.body;

    await query(
      'UPDATE profiles SET title = COALESCE(?, title), bio = COALESCE(?, bio) WHERE id = ?',
      [title, bio, decoded.userId]
    );

    res.json({ success: true, message: '资料更新成功' });
  } catch (err) {
    logger.error('更新资料错误:', err);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: '更新失败' } 
    });
  }
});

export default router;
