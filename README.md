# Rubbish Archive v3.0

> 科研废料收容所 - 一个供科研人员分享和记录"失败"实验、项目的社区平台

## 项目简介

Rubbish Archive 是一个独特的社区平台，让科研人员可以分享那些被废弃的实验、失败的项目、放弃的论文等"学术垃圾"。这些看似无用的经历往往蕴含着宝贵的经验教训，通过分享，可以帮助其他研究者避免重复踩坑。

### 核心理念

- **可回收垃圾**：有潜在价值的废弃项目，可能对他人有参考意义
- **不可回收垃圾**：纯粹的失败经历，但分享出来可以让大家吐槽共情

## 功能特性

### 用户系统
- ✅ 邀请码注册（无限次使用）
- ✅ 邮箱密码登录
- ✅ JWT Token 认证（7天有效期）
- ✅ 个人资料编辑（头衔、简介）
- ✅ 用户主页（点击头像进入）
- ✅ 关注/取消关注用户
- ✅ 用户统计（帖子数、粉丝、关注）

### 帖子系统
- ✅ 发布帖子（支持公开/私有）
- ✅ 帖子分类（可回收/不可回收）
- ✅ 学科领域分类（工学、理学、医学等）
- ✅ 编辑/删除自己的帖子
- ✅ 点赞功能（乐观更新，无闪烁）
- ✅ 发布动画效果

### 评论系统（YouTube 风格）
- ✅ 发表评论
- ✅ 回复评论（2层结构）
- ✅ 回复的回复自动显示 `@用户名`
- ✅ 评论点赞（乐观更新）
- ✅ 删除评论（作者和管理员）
- ✅ 删除主评论时同时删除所有回复

### 管理员功能
- ✅ 邀请码管理（创建、启用/禁用、删除）
- ✅ 用户管理（查看、封禁/解封）
- ✅ 删除公开帖子
- ✅ 删除任意评论

### 权限控制
| 操作 | 普通用户 | 管理员 |
|-----|---------|--------|
| 删除自己的帖子 | ✅ | ✅ |
| 删除他人公开帖子 | ❌ | ✅ |
| 查看他人私有帖子 | ❌ | ❌ |
| 删除自己的评论 | ✅ | ✅ |
| 删除他人的评论 | ❌ | ✅ |

### 交互优化（v3.0 新增）
- ✅ 自定义确认对话框（美观的删除确认）
- ✅ 乐观更新（点赞无页面闪烁）
- ✅ 头像点击跳转用户主页
- ✅ 圣诞主题开关（雪花/彩灯/节日配色，可一键开关，不影响默认逻辑）

### 技术架构（v3.0 新增）
- ✅ 统一错误处理（标准化错误码）
- ✅ 输入验证（防止非法参数）
- ✅ API 限流（防止恶意请求）
- ✅ 日志系统（请求日志 + 错误追踪）

## 节日主题（圣诞模式）

- 开关位置：顶部导航右侧的“圣诞模式/默认模式”按钮（`ThemeToggle`），点击即可开关。
- 状态记忆：`localStorage` 键 `rubbhub-theme`，值为 `christmas` 或 `default`，刷新后自动恢复上次选择。
- 作用范围：仅覆盖样式与装饰（雪花 Canvas、彩灯条、圣诞配色/阴影/贴纸感），业务逻辑与数据流不变。
- 作用域控制：样式全部挂在 `body.theme-christmas` 选择器下，关闭开关或清理本地存储即可回到默认界面。
- 主要文件：`src/context/ThemeContext.tsx`（主题状态）、`src/components/common/ThemeToggle.tsx`、`src/components/common/SnowCanvas.tsx`、`src/components/common/ChristmasLights.tsx`、`src/styles/theme-christmas.css`。

## 技术栈

### 前端
| 技术 | 版本 | 用途 |
|-----|------|-----|
| React | 19.x | UI 框架 |
| TypeScript | 5.8 | 类型安全 |
| Vite | 6.x | 构建工具 |
| React Router | 7.x | 路由管理 |
| Tailwind CSS | 3.4 | 样式框架 |
| Lucide React | 0.555 | 图标库 |

### 后端
| 技术 | 版本 | 用途 |
|-----|------|-----|
| Node.js | 18+ | 运行时 |
| Express | 4.18 | Web 框架 |
| MySQL | 8.0 | 数据库 |
| mysql2 | 3.6 | 数据库驱动 |
| JWT | 9.0 | 身份认证 |
| bcryptjs | 2.4 | 密码加密 |
| express-validator | 7.3 | 输入验证 |
| express-rate-limit | 8.2 | API 限流 |
| winston | 3.19 | 日志系统 |

## 部署与运维提示

- 数据库：当前使用阿里云 MySQL，剩余有效期约 1 个月；后续可按需迁移到腾讯云等同类型实例，迁移时注意同步用户、权限、参数组和时区设置，提前准备数据导出/导入脚本与连接串环境变量。
- 服务器：现有服务器还有 6 个月有效期，公网 IP 有效期 1 年。到期前请规划续费或切换，避免 DNS/备案变更带来的中断。
- 代码冗余检查：当前版本未发现明显无用文件或重复逻辑，若后续有新功能合并，请保持定期清理未使用的组件/样式。

## 项目结构

```
Rubbish_main/
├── src/                          # 前端源码
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthView.tsx      # 登录/注册
│   │   │   └── ProfileView.tsx   # 个人资料
│   │   ├── common/
│   │   │   ├── CommentItem.tsx   # 评论组件
│   │   │   ├── ConfirmDialog.tsx # 确认对话框 (v3)
│   │   │   ├── Toast.tsx         # 提示组件
│   │   │   ├── SnowCanvas.tsx    # 圣诞模式雪花层
│   │   │   ├── ChristmasLights.tsx # 圣诞模式彩灯
│   │   │   ├── ThemeToggle.tsx   # 圣诞模式开关
│   │   │   └── UltraTossAnimation.tsx
│   │   ├── entry/
│   │   │   └── EntryCard.tsx     # 帖子卡片
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Layout.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── ConfirmContext.tsx    # 确认对话框状态 (v3)
│   │   ├── EntriesContext.tsx
│   │   ├── ToastContext.tsx
│   │   └── ThemeContext.tsx      # 主题状态（圣诞模式）
│   ├── lib/
│   │   └── api.ts                # API 客户端
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── DetailPage.tsx
│   │   ├── CreatePage.tsx
│   │   ├── UserPage.tsx
│   │   ├── AdminPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── styles/
│   │   └── theme-christmas.css   # 圣诞主题样式（作用于 body.theme-christmas）
│   ├── types/index.ts
│   ├── utils/helpers.ts
│   ├── App.tsx
│   └── main.tsx
├── server/                       # 后端源码
│   ├── middleware/               # 中间件 (v3)
│   │   ├── errorHandler.js       # 统一错误处理
│   │   ├── rateLimiter.js        # API 限流
│   │   └── validator.js          # 输入验证
│   ├── utils/                    # 工具 (v3)
│   │   └── logger.js             # 日志系统
│   ├── routes/
│   │   ├── auth.js
│   │   ├── entries.js
│   │   ├── users.js
│   │   └── admin.js
│   ├── logs/                     # 日志文件 (v3)
│   ├── db.js
│   ├── index.js
│   ├── init.sql
│   └── .env
├── dist/
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## API 限流配置

| 接口类型 | 限制 | 说明 |
|---------|------|------|
| 全局 API | 100次/分钟 | 防止恶意爬取 |
| 登录/注册 | 10次/5分钟 | 防止暴力破解 |
| 发帖 | 5次/分钟 | 防止刷帖 |

## 错误码说明

| 错误码 | HTTP状态 | 说明 |
|--------|---------|------|
| UNAUTHORIZED | 401 | 未登录 |
| INVALID_TOKEN | 401 | Token 无效或过期 |
| FORBIDDEN | 403 | 无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 参数错误 |
| DUPLICATE_ERROR | 409 | 数据重复 |
| RATE_LIMIT | 429 | 请求过于频繁 |
| INTERNAL_ERROR | 500 | 服务器错误 |

## 数据库设计

```
┌─────────────────┐     ┌─────────────────┐
│     users       │     │    profiles     │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │◄───►│ id (PK, FK)     │
│ email           │     │ username        │
│ password_hash   │     │ title           │
│ created_at      │     │ bio             │
└─────────────────┘     │ role            │
                        │ is_banned       │
                        └─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│    entries      │     │    follows      │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │
│ title           │     │ follower_id     │
│ author_id (FK)  │     │ following_id    │
│ author_name     │     │ created_at      │
│ visibility      │     └─────────────────┘
│ domain          │
│ major           │     ┌─────────────────┐
│ waste_type      │     │  invite_codes   │
│ content         │     ├─────────────────┤
│ media (JSON)    │     │ id (PK)         │
│ sympathy        │     │ code            │
│ tags (JSON)     │     │ is_active       │
│ created_at      │     │ created_at      │
└─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│   comments      │     │  entry_likes    │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ entry_id (FK)   │
│ entry_id (FK)   │     │ user_id (FK)    │
│ parent_id       │     │ created_at      │
│ author_id (FK)  │     └─────────────────┘
│ author_name     │
│ content         │     ┌─────────────────┐
│ likes           │     │ comment_likes   │
│ reply_to        │     ├─────────────────┤
│ created_at      │     │ comment_id (FK) │
└─────────────────┘     │ user_id (FK)    │
                        │ created_at      │
                        └─────────────────┘
```

## 快速开始

### 环境要求
- Node.js 18+
- MySQL 8.0+

### 1. 安装依赖
```bash
# 前端
npm install

# 后端
cd server && npm install
```

### 2. 配置数据库

创建 `server/.env`：
```env
DB_HOST=your-database-host
DB_PORT=3306
DB_NAME=rubbhub
DB_USER=your-username
DB_PASSWORD=your-password
JWT_SECRET=your-jwt-secret
PORT=3001
```

### 3. 初始化数据库
```sql
-- 执行 server/init.sql
-- 添加 reply_to 字段
ALTER TABLE comments ADD COLUMN reply_to VARCHAR(50) DEFAULT NULL;
```

### 4. 启动服务
```bash
# 后端
cd server && npm start

# 前端
npm run dev
```

### 5. 访问应用
http://localhost:3000

## 默认配置

- 邀请码：`Rubbish`
- 设置管理员：`UPDATE profiles SET role = 'admin' WHERE username = 'xxx';`

## 版本历史

### v3.0 (2025-12-08)
- 🏗️ 后端架构升级
  - 统一错误处理和错误码
  - 输入验证（express-validator）
  - API 限流（express-rate-limit）
  - 日志系统（winston）
- ✨ 交互优化
  - 自定义确认对话框
  - 乐观更新（点赞无闪烁）
  - 头像点击跳转用户主页
- 🐛 Bug 修复
  - 编辑资料页返回按钮

### v2.0 (2025-12-08)
- 🔄 评论系统重构为 YouTube 风格
- ✨ 回复自动显示 `@用户名`
- 🔐 用户可删除自己的评论
- 🧹 代码清理

### v1.0 (2025-12-08)
- 🎉 初始版本
- ✅ 用户认证系统
- ✅ 帖子 CRUD
- ✅ 评论和点赞
- ✅ 用户主页和关注
- ✅ 管理员后台

## 未来计划

- [ ] 图片上传（阿里云 OSS）
- [ ] 消息通知系统
- [ ] 私信功能
- [ ] 头像上传
- [ ] 暗色模式

## 许可证

MIT License

---

**Rubbish Archive** - 让失败也有价值 🗑️
