-- Rubbish Archive 数据库初始化脚本 (MySQL 版本)
-- 在阿里云 RDS MySQL 中执行

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户资料表
CREATE TABLE IF NOT EXISTS profiles (
  id INT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(100) DEFAULT '学术难民',
  bio TEXT,
  role VARCHAR(20) DEFAULT 'user',
  is_banned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- 邀请码表
CREATE TABLE IF NOT EXISTS invite_codes (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  used_by INT,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (used_by) REFERENCES users(id)
);

-- 帖子表
CREATE TABLE IF NOT EXISTS entries (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author_id INT,
  author_name VARCHAR(50),
  visibility VARCHAR(20) DEFAULT 'public',
  domain VARCHAR(50),
  major VARCHAR(100),
  waste_type VARCHAR(20),
  waste_sub_type VARCHAR(50),
  cause TEXT,
  content TEXT,
  media JSON,
  sympathy INT DEFAULT 0,
  views INT DEFAULT 0,
  tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entries_visibility (visibility),
  INDEX idx_entries_created (created_at DESC),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- 帖子点赞表
CREATE TABLE IF NOT EXISTS entry_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id VARCHAR(50),
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_entry_like (entry_id, user_id),
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR(50) PRIMARY KEY,
  entry_id VARCHAR(50),
  parent_id VARCHAR(50),
  author_id INT,
  author_name VARCHAR(50),
  content TEXT NOT NULL,
  likes INT DEFAULT 0,
  reply_to VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comments_parent (parent_id),
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- 评论点赞表
CREATE TABLE IF NOT EXISTS comment_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comment_id VARCHAR(50),
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_comment_like (comment_id, user_id),
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(20) NOT NULL,
  from_user_id INT,
  from_username VARCHAR(50),
  entry_id VARCHAR(50),
  entry_title VARCHAR(255),
  comment_id VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user_created (user_id, created_at DESC),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 关注关系表
CREATE TABLE IF NOT EXISTS follows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  follower_id INT NOT NULL,
  following_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_follow (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 在线状态表
CREATE TABLE IF NOT EXISTS user_sessions (
  user_id INT PRIMARY KEY,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_ip VARCHAR(64) DEFAULT NULL,
  INDEX idx_user_sessions_last_seen (last_seen DESC),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 插入默认邀请码
INSERT IGNORE INTO invite_codes (id, code, is_active) VALUES (UUID(), 'Rubbish', true);

SELECT '数据库初始化完成!' as message;
