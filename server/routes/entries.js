import express from 'express';
import { randomUUID } from 'node:crypto';
import { query, getConnection } from '../db.js';
import { createLimiter } from '../middleware/rateLimiter.js';
import { createEntryRules, commentRules, validate } from '../middleware/validator.js';
import logger from '../utils/logger.js';
import { createNotification } from './notifications.js';
import { optionalAuth } from '../utils/auth.js';
import { safeParseJSON } from '../utils/parsers.js';
import { getPagination } from '../utils/pagination.js';
import { withTransaction } from '../utils/transaction.js';

const router = express.Router();

const authMiddleware = optionalAuth;

// 生成帖子 ID
const generateEntryId = () => `RUB.${new Date().getFullYear()}.${randomUUID()}`;

// 获取帖子列表（支持分页）
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const pagination = getPagination(req.query, 10, 50);
    if (!pagination) return res.status(400).json({ error: '分页参数无效' });
    const { page, limit, offset } = pagination;

    // 查询总数
    let countResult;
    if (userId) {
      countResult = await query(
        `SELECT COUNT(*) as total FROM entries WHERE visibility = 'public' OR author_id = ?`,
        [userId]
      );
    } else {
      countResult = await query(
        `SELECT COUNT(*) as total FROM entries WHERE visibility = 'public'`,
        []
      );
    }
    const total = countResult.rows[0].total;

    // 查询帖子（公开的 + 自己的私有帖子）
    // 注意：MySQL prepared statement 不支持 LIMIT/OFFSET 作为参数，需要直接拼接
    let entriesResult;
    if (userId) {
      entriesResult = await query(
        `SELECT * FROM entries WHERE visibility = 'public' OR author_id = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        [userId]
      );
    } else {
      entriesResult = await query(
        `SELECT * FROM entries WHERE visibility = 'public' ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        []
      );
    }

    const entries = entriesResult.rows;
    if (entries.length === 0) {
      return res.json({ entries: [], total, page, limit, totalPages: Math.ceil(total / limit) });
    }

    const entryIds = entries.map(e => e.id);

    // 获取点赞
    const likesResult = await query(
      `SELECT entry_id, user_id FROM entry_likes WHERE entry_id IN (${entryIds.map(() => '?').join(',')})`,
      entryIds
    );
    const likesMap = {};
    likesResult.rows.forEach(like => {
      if (!likesMap[like.entry_id]) likesMap[like.entry_id] = [];
      likesMap[like.entry_id].push(String(like.user_id));
    });

    // 获取评论
    const commentsResult = await query(
      `SELECT * FROM comments WHERE entry_id IN (${entryIds.map(() => '?').join(',')}) ORDER BY created_at ASC`,
      entryIds
    );
    
    // 获取评论点赞
    const commentIds = commentsResult.rows.map(c => c.id);
    let commentLikesMap = {};
    if (commentIds.length > 0) {
      const commentLikesResult = await query(
        `SELECT comment_id, user_id FROM comment_likes WHERE comment_id IN (${commentIds.map(() => '?').join(',')})`,
        commentIds
      );
      commentLikesResult.rows.forEach(like => {
        if (!commentLikesMap[like.comment_id]) commentLikesMap[like.comment_id] = [];
        commentLikesMap[like.comment_id].push(String(like.user_id));
      });
    }

    // 构建评论树（2层结构：主评论 + 回复列表）
    const buildCommentsTree = (entryId) => {
      const entryComments = commentsResult.rows.filter(c => c.entry_id === entryId);
      
      // 分离主评论和回复
      const mainComments = entryComments.filter(c => !c.parent_id);
      const replies = entryComments.filter(c => c.parent_id);

      return mainComments.map(c => ({
        id: c.id,
        author: c.author_name,
        content: c.content,
        timestamp: c.created_at,
        likes: c.likes,
        likedBy: commentLikesMap[c.id] || [],
        replyTo: null,
        replies: replies
          .filter(r => r.parent_id === c.id)
          .map(r => ({
            id: r.id,
            author: r.author_name,
            content: r.content,
            timestamp: r.created_at,
            likes: r.likes,
            likedBy: commentLikesMap[r.id] || [],
            replyTo: r.reply_to,
            replies: []
          }))
      }));
    };

    // 组装数据
    const result = entries.map(e => ({
      id: e.id,
      title: e.title,
      author: e.author_name,
      timestamp: e.created_at,
      visibility: e.visibility,
      domain: e.domain,
      major: e.major,
      wasteType: e.waste_type,
      wasteSubType: e.waste_sub_type,
      cause: e.cause,
      content: e.content,
      media: safeParseJSON(e.media, null),
      sympathy: e.sympathy,
      likedBy: likesMap[e.id] || [],
      tags: safeParseJSON(e.tags, []),
      views: e.views || 0,
      comments: buildCommentsTree(e.id)
    }));

    res.json({
      entries: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    logger.error('获取帖子错误:', err);
    res.status(500).json({ error: '加载数据失败' });
  }
});

// 获取单个帖子（增加浏览量，返回完整数据）
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // 获取帖子
    const entryResult = await query('SELECT * FROM entries WHERE id = ?', [id]);
    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: '帖子不存在' });
    }

    const entry = entryResult.rows[0];

    // 检查权限（私有帖子只有作者能看）
    if (entry.visibility === 'private' && entry.author_id !== userId) {
      return res.status(404).json({ error: '帖子不存在' });
    }

    // 增加浏览量（非作者访问时）
    if (entry.author_id !== userId) {
      await query('UPDATE entries SET views = views + 1 WHERE id = ?', [id]);
      entry.views = (entry.views || 0) + 1;
    }

    // 获取点赞
    const likesResult = await query('SELECT user_id FROM entry_likes WHERE entry_id = ?', [id]);
    const likedBy = likesResult.rows.map(l => String(l.user_id));

    // 获取评论
    const commentsResult = await query('SELECT * FROM comments WHERE entry_id = ? ORDER BY created_at ASC', [id]);
    
    // 获取评论点赞
    const commentIds = commentsResult.rows.map(c => c.id);
    let commentLikesMap = {};
    if (commentIds.length > 0) {
      const commentLikesResult = await query(
        `SELECT comment_id, user_id FROM comment_likes WHERE comment_id IN (${commentIds.map(() => '?').join(',')})`,
        commentIds
      );
      commentLikesResult.rows.forEach(like => {
        if (!commentLikesMap[like.comment_id]) commentLikesMap[like.comment_id] = [];
        commentLikesMap[like.comment_id].push(String(like.user_id));
      });
    }

    // 构建评论树
    const mainComments = commentsResult.rows.filter(c => !c.parent_id);
    const replies = commentsResult.rows.filter(c => c.parent_id);
    const comments = mainComments.map(c => ({
      id: c.id,
      author: c.author_name,
      content: c.content,
      timestamp: c.created_at,
      likes: c.likes,
      likedBy: commentLikesMap[c.id] || [],
      replyTo: null,
      replies: replies.filter(r => r.parent_id === c.id).map(r => ({
        id: r.id,
        author: r.author_name,
        content: r.content,
        timestamp: r.created_at,
        likes: r.likes,
        likedBy: commentLikesMap[r.id] || [],
        replyTo: r.reply_to,
        replies: []
      }))
    }));

    res.json({
      id: entry.id,
      title: entry.title,
      author: entry.author_name,
      timestamp: entry.created_at,
      visibility: entry.visibility,
      domain: entry.domain,
      major: entry.major,
      wasteType: entry.waste_type,
      wasteSubType: entry.waste_sub_type,
      cause: entry.cause,
      content: entry.content,
      media: safeParseJSON(entry.media, null),
      sympathy: entry.sympathy,
      likedBy,
      tags: safeParseJSON(entry.tags, []),
      views: entry.views || 0,
      comments
    });
  } catch (err) {
    logger.error('获取帖子错误:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

// 创建帖子
router.post('/', authMiddleware, createLimiter, createEntryRules, validate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '请先登录' });
    }

    const { title, domain, major, wasteType, wasteSubType, cause, content, visibility, media, tags } = req.body;
    const entryId = generateEntryId();

    // 获取用户名
    const userResult = await query('SELECT username FROM profiles WHERE id = ?', [req.user.userId]);
    const authorName = userResult.rows[0]?.username || 'Unknown';

    await query(
      `INSERT INTO entries (id, title, author_id, author_name, visibility, domain, major, waste_type, waste_sub_type, cause, content, media, sympathy, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [entryId, title, req.user.userId, authorName, visibility, domain, major, wasteType, wasteSubType, cause, content, media ? JSON.stringify(media) : null, tags ? JSON.stringify(tags) : '[]']
    );

    res.json({ success: true, id: entryId });
  } catch (err) {
    logger.error('创建帖子错误:', err);
    res.status(500).json({ error: '发布失败' });
  }
});

// 更新帖子
router.put('/:id', authMiddleware, createEntryRules, validate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '请先登录' });
    }

    const { id } = req.params;
    const { title, domain, major, wasteType, wasteSubType, cause, content, visibility, media, tags } = req.body;

    // 检查权限
    const entryResult = await query('SELECT author_id FROM entries WHERE id = ?', [id]);
    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: '帖子不存在' });
    }
    if (entryResult.rows[0].author_id !== req.user.userId) {
      return res.status(403).json({ error: '无权修改此帖子' });
    }

    await query(
      `UPDATE entries SET title = ?, domain = ?, major = ?, waste_type = ?, waste_sub_type = ?, 
       cause = ?, content = ?, visibility = ?, media = ?, tags = ? WHERE id = ?`,
      [title, domain, major, wasteType, wasteSubType, cause, content, visibility, media ? JSON.stringify(media) : null, tags ? JSON.stringify(tags) : '[]', id]
    );

    res.json({ success: true });
  } catch (err) {
    logger.error('更新帖子错误:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

// 删除帖子
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '请先登录' });
    }

    const { id } = req.params;

    // 检查权限（作者或管理员）
    const entryResult = await query('SELECT author_id, visibility FROM entries WHERE id = ?', [id]);
    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: '帖子不存在' });
    }

    const isAuthor = entryResult.rows[0].author_id === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    const isPublic = entryResult.rows[0].visibility === 'public';

    if (!isAuthor && !(isAdmin && isPublic)) {
      return res.status(403).json({ error: '无权删除此帖子' });
    }

    // 外键会在同一个数据库操作中级联删除评论和点赞。
    await query('DELETE FROM entries WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (err) {
    logger.error('删除帖子错误:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

// 点赞/取消点赞
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '请先登录' });
    }

    const { id } = req.params;
    const result = await withTransaction(getConnection, async (txQuery) => {
      const entryResult = await txQuery(
        'SELECT author_id, title, visibility FROM entries WHERE id = ? FOR UPDATE',
        [id]
      );
      if (entryResult.rows.length === 0) return null;

      const entry = entryResult.rows[0];
      if (entry.visibility === 'private' && entry.author_id !== req.user.userId) return null;

      const likeResult = await txQuery(
        'SELECT id FROM entry_likes WHERE entry_id = ? AND user_id = ?',
        [id, req.user.userId]
      );
      if (likeResult.rows.length > 0) {
        await txQuery('DELETE FROM entry_likes WHERE entry_id = ? AND user_id = ?', [id, req.user.userId]);
        await txQuery('UPDATE entries SET sympathy = GREATEST(sympathy - 1, 0) WHERE id = ?', [id]);
        return { liked: false, entry };
      }

      await txQuery('INSERT INTO entry_likes (entry_id, user_id) VALUES (?, ?)', [id, req.user.userId]);
      await txQuery('UPDATE entries SET sympathy = sympathy + 1 WHERE id = ?', [id]);
      return { liked: true, entry };
    });

    if (!result) return res.status(404).json({ error: '帖子不存在' });

    if (result.liked && result.entry.author_id !== req.user.userId) {
      await createNotification(
        result.entry.author_id, 'like', req.user.userId, req.user.username,
        id, result.entry.title, null
      );
    }

    res.json({ liked: result.liked });
  } catch (err) {
    logger.error('点赞错误:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// 添加评论
router.post('/:id/comments', authMiddleware, commentRules, validate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '请先登录' });
    }

    const { id } = req.params;
    const { content, parentId } = req.body;
    const commentId = `c${randomUUID()}`;

    const result = await withTransaction(getConnection, async (txQuery) => {
      const entryResult = await txQuery('SELECT title, author_id, visibility FROM entries WHERE id = ? FOR UPDATE', [id]);
      if (entryResult.rows.length === 0) return { status: 404, error: '帖子不存在' };
      const entry = entryResult.rows[0];
      if (entry.visibility === 'private' && entry.author_id !== req.user.userId) {
        return { status: 404, error: '帖子不存在' };
      }

      let actualParentId = null;
      let replyTo = null;
      let replyToUserId = null;
      if (parentId) {
        const parentComment = await txQuery(
          'SELECT parent_id, author_id, author_name FROM comments WHERE id = ? AND entry_id = ? FOR UPDATE',
          [parentId, id]
        );
        if (parentComment.rows.length === 0) return { status: 404, error: '评论不存在' };
        actualParentId = parentComment.rows[0].parent_id || parentId;
        replyTo = parentComment.rows[0].author_name;
        replyToUserId = parentComment.rows[0].author_id;
      }

      await txQuery(
        `INSERT INTO comments (id, entry_id, parent_id, author_id, author_name, content, likes, reply_to)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [commentId, id, actualParentId, req.user.userId, req.user.username, content, replyTo]
      );
      return { entry, replyToUserId };
    });

    if (result.status) return res.status(result.status).json({ error: result.error });

    // 创建通知
    if (result.replyToUserId) {
      await createNotification(result.replyToUserId, 'reply', req.user.userId, req.user.username, id, result.entry.title, commentId);
    } else {
      await createNotification(result.entry.author_id, 'comment', req.user.userId, req.user.username, id, result.entry.title, commentId);
    }

    res.json({ success: true, id: commentId });
  } catch (err) {
    logger.error('添加评论错误:', err);
    res.status(500).json({ error: '发表评论失败' });
  }
});

// 删除评论
router.delete('/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '请先登录' });
    }

    const { commentId } = req.params;

    const result = await withTransaction(getConnection, async (txQuery) => {
      const commentResult = await txQuery('SELECT author_id, parent_id FROM comments WHERE id = ? FOR UPDATE', [commentId]);
      if (commentResult.rows.length === 0) return { status: 404, error: '评论不存在' };

      const isAuthor = commentResult.rows[0].author_id === req.user.userId;
      if (!isAuthor && req.user.role !== 'admin') return { status: 403, error: '无权删除此评论' };

      if (!commentResult.rows[0].parent_id) {
        await txQuery('DELETE FROM comments WHERE parent_id = ?', [commentId]);
      }
      // 评论点赞由外键级联删除。
      await txQuery('DELETE FROM comments WHERE id = ?', [commentId]);
      return { success: true };
    });

    if (result.status) return res.status(result.status).json({ error: result.error });

    res.json({ success: true });
  } catch (err) {
    logger.error('删除评论错误:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

// 评论点赞
router.post('/comments/:commentId/like', authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '请先登录' });
    }

    const { commentId } = req.params;

    const liked = await withTransaction(getConnection, async (txQuery) => {
      const commentResult = await txQuery(
        `SELECT c.id, e.author_id, e.visibility FROM comments c
         JOIN entries e ON e.id = c.entry_id WHERE c.id = ? FOR UPDATE`,
        [commentId]
      );
      if (commentResult.rows.length === 0) return null;

      const entry = commentResult.rows[0];
      if (entry.visibility === 'private' && entry.author_id !== req.user.userId) return null;

      const likeResult = await txQuery(
        'SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?',
        [commentId, req.user.userId]
      );
      if (likeResult.rows.length > 0) {
        await txQuery('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, req.user.userId]);
        await txQuery('UPDATE comments SET likes = GREATEST(likes - 1, 0) WHERE id = ?', [commentId]);
        return false;
      }

      await txQuery('INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)', [commentId, req.user.userId]);
      await txQuery('UPDATE comments SET likes = likes + 1 WHERE id = ?', [commentId]);
      return true;
    });

    if (liked === null) return res.status(404).json({ error: '评论不存在' });
    res.json({ liked });
  } catch (err) {
    logger.error('评论点赞错误:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

export default router;
