import express from 'express';
import { query } from '../db.js';
import logger from '../utils/logger.js';
import { createNotification } from './notifications.js';
import { optionalAuth, requireAuth } from '../utils/auth.js';
import { safeParseJSON } from '../utils/parsers.js';

const router = express.Router();

// 获取用户公开信息
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;

    // 获取用户基本信息
    const userResult = await query(
      `SELECT p.id, p.username, p.title, p.bio, p.created_at
       FROM profiles p WHERE p.username = ?`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = userResult.rows[0];

    // 获取关注数
    const followingResult = await query(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
      [user.id]
    );

    // 获取粉丝数
    const followersResult = await query(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
      [user.id]
    );

    // 获取帖子数（本人看所有，他人只看公开）
    const isOwnProfile = req.user && req.user.userId === user.id;
    const entriesResult = isOwnProfile
      ? await query('SELECT COUNT(*) as count FROM entries WHERE author_id = ?', [user.id])
      : await query(`SELECT COUNT(*) as count FROM entries WHERE author_id = ? AND visibility = 'public'`, [user.id]);

    // 检查当前用户是否已关注
    let isFollowing = false;
    if (req.user) {
      const followCheck = await query(
        'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?',
        [req.user.userId, user.id]
      );
      isFollowing = followCheck.rows.length > 0;
    }

    res.json({
      id: String(user.id),
      username: user.username,
      title: user.title,
      bio: user.bio,
      joinedAt: user.created_at,
      followingCount: Number(followingResult.rows[0].count),
      followersCount: Number(followersResult.rows[0].count),
      entriesCount: Number(entriesResult.rows[0].count),
      isFollowing
    });
  } catch (err) {
    logger.error('获取用户信息错误:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 获取用户帖子（本人可见私有，他人只能看公开）
router.get('/:username/entries', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;

    // 获取用户 ID
    const userResult = await query(
      'SELECT id FROM profiles WHERE username = ?',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const userId = userResult.rows[0].id;
    const isOwnProfile = req.user && req.user.userId === userId;

    // 本人可以看所有帖子，其他人只能看公开帖子
    const entriesResult = isOwnProfile
      ? await query('SELECT * FROM entries WHERE author_id = ? ORDER BY created_at DESC', [userId])
      : await query(`SELECT * FROM entries WHERE author_id = ? AND visibility = 'public' ORDER BY created_at DESC`, [userId]);

    const entries = entriesResult.rows;
    if (entries.length === 0) {
      return res.json([]);
    }

    const result = entries.map(e => ({
      id: e.id,
      title: e.title,
      author: e.author_name,
      timestamp: e.created_at,
      visibility: e.visibility,
      domain: e.domain,
      major: e.major,
      wasteType: e.waste_type,
      content: e.content,
      media: safeParseJSON(e.media, null),
      sympathy: e.sympathy,
      tags: safeParseJSON(e.tags, [])
    }));

    res.json(result);
  } catch (err) {
    logger.error('获取用户帖子错误:', err);
    res.status(500).json({ error: '获取帖子失败' });
  }
});

// 获取粉丝列表
router.get('/:username/followers', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;

    // 获取用户 ID
    const userResult = await query('SELECT id FROM profiles WHERE username = ?', [username]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    const userId = userResult.rows[0].id;

    // 获取粉丝列表
    const followersResult = await query(
      `SELECT p.id, p.username, p.title 
       FROM follows f 
       JOIN profiles p ON f.follower_id = p.id 
       WHERE f.following_id = ? 
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json(followersResult.rows.map(u => ({
      id: String(u.id),
      username: u.username,
      title: u.title
    })));
  } catch (err) {
    logger.error('获取粉丝列表错误:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

// 获取关注列表
router.get('/:username/following', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;

    // 获取用户 ID
    const userResult = await query('SELECT id FROM profiles WHERE username = ?', [username]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    const userId = userResult.rows[0].id;

    // 获取关注列表
    const followingResult = await query(
      `SELECT p.id, p.username, p.title 
       FROM follows f 
       JOIN profiles p ON f.following_id = p.id 
       WHERE f.follower_id = ? 
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json(followingResult.rows.map(u => ({
      id: String(u.id),
      username: u.username,
      title: u.title
    })));
  } catch (err) {
    logger.error('获取关注列表错误:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

// 关注/取消关注
router.post('/:username/follow', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;

    // 获取目标用户
    const targetResult = await query(
      'SELECT id FROM profiles WHERE username = ?',
      [username]
    );

    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const targetId = targetResult.rows[0].id;

    // 不能关注自己
    if (targetId === req.user.userId) {
      return res.status(400).json({ error: '不能关注自己' });
    }

    // 检查是否已关注
    const followCheck = await query(
      'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?',
      [req.user.userId, targetId]
    );

    if (followCheck.rows.length > 0) {
      // 取消关注
      await query(
        'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
        [req.user.userId, targetId]
      );
      res.json({ following: false });
    } else {
      // 关注
      await query(
        'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
        [req.user.userId, targetId]
      );
      
      // 发送关注通知
      const followerResult = await query('SELECT username FROM profiles WHERE id = ?', [req.user.userId]);
      const followerName = followerResult.rows[0]?.username || 'Unknown';
      await createNotification(targetId, 'follow', req.user.userId, followerName);
      
      res.json({ following: true });
    }
  } catch (err) {
    logger.error('关注操作错误:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

export default router;
