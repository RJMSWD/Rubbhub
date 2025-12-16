import express from 'express';
import { query } from '../db.js';
import logger from '../utils/logger.js';
import { requireAuth } from '../utils/auth.js';

const router = express.Router();

// 创建通知（内部使用）
export const createNotification = async (userId, type, fromUserId, fromUsername, entryId = null, entryTitle = null, commentId = null) => {
  // 不给自己发通知
  if (userId === fromUserId) return;
  
  try {
    await query(
      `INSERT INTO notifications (user_id, type, from_user_id, from_username, entry_id, entry_title, comment_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, type, fromUserId, fromUsername, entryId, entryTitle, commentId]
    );
  } catch (err) {
    logger.error('创建通知失败:', err);
  }
};

// 获取通知列表
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      [req.user.userId]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM notifications WHERE user_id = ?`,
      [req.user.userId]
    );

    res.json({
      notifications: result.rows,
      total: countResult.rows[0].total,
      page,
      limit
    });
  } catch (err) {
    logger.error('获取通知错误:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

// 获取未读数
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = false`,
      [req.user.userId]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    logger.error('获取未读数错误:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

// 标记单个已读
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('标记已读错误:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// 标记全部已读
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET is_read = true WHERE user_id = ?`,
      [req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('标记全部已读错误:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

export default router;
