// 类型定义
export interface UserData {
  id: string;
  email: string;
  username: string;
  title?: string;
  bio?: string;
  role: 'user' | 'admin';
  joinedAt: string;
}

export interface CommentData {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  likes: number;
  likedBy: string[];
  replyTo?: string | null;
  replies: CommentData[];
}

export interface EntryData {
  id: string;
  title: string;
  author: string;
  timestamp: string;
  visibility: 'public' | 'private';
  domain: string;
  major: string;
  wasteType: 'recyclable' | 'unrecyclable';
  wasteSubType?: string;
  cause: string;
  content: string;
  media: { type: 'image' | 'video'; items: string[] } | null;
  sympathy: number;
  likedBy: string[];
  tags: string[];
  views: number;
  comments: CommentData[];
}

export interface EntriesPageData {
  entries: EntryData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationData {
  id: number;
  user_id: number;
  type: 'comment' | 'reply' | 'follow' | 'like';
  from_user_id: number;
  from_username: string;
  entry_id: string | null;
  entry_title: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface CreateEntryData {
  title: string;
  domain: string;
  major: string;
  wasteType: 'recyclable' | 'unrecyclable';
  wasteSubType?: string;
  cause: string;
  content: string;
  visibility: 'public' | 'private';
  media?: { type: 'image' | 'video'; items: string[] } | null;
  tags?: string[];
}

export interface InviteCodeData {
  id: string;
  code: string;
  is_active: boolean;
  used_by: string | null;
  created_at: string;
}

export interface UserProfileData {
  id: string;
  username: string;
  role: string;
  is_banned: boolean;
  created_at: string;
}

export interface UserPublicData {
  id: string;
  username: string;
  title?: string;
  bio?: string;
  joinedAt: string;
  followingCount: number;
  followersCount: number;
  entriesCount: number;
  isFollowing: boolean;
}

export interface UserEntryData {
  id: string;
  title: string;
  author: string;
  timestamp: string;
  visibility: string;
  domain: string;
  major: string;
  wasteType: string;
  content: string;
  media: { type: 'image' | 'video'; items: string[] } | null;
  sympathy: number;
  tags: string[];
}

export interface FollowUserData {
  id: string;
  username: string;
  title?: string;
}

// API 配置
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getToken = () => localStorage.getItem('token');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    // 兼容两种错误格式: { error: string } 或 { error: { message } }
    const errorMsg = typeof data.error === 'string' 
      ? data.error 
      : data.error?.message || '请求失败';
    throw new Error(errorMsg);
  }

  return data;
}

// 认证 API
export const authApi = {
  register: (email: string, password: string, username: string, inviteCode: string) =>
    request<{ success: boolean; message?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, inviteCode }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: UserData }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<UserData>('/auth/me'),

  updateProfile: (updates: { title?: string; bio?: string }) =>
    request<{ success: boolean }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
};

// 帖子 API
export const entriesApi = {
  getAll: (page = 1, limit = 10) => request<EntriesPageData>(`/entries?page=${page}&limit=${limit}`),
  
  getOne: (id: string) => request<EntryData>(`/entries/${id}`),

  create: (data: CreateEntryData) =>
    request<{ success: boolean; id: string }>('/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateEntryData>) =>
    request<{ success: boolean }>(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/entries/${id}`, {
      method: 'DELETE',
    }),

  toggleLike: (id: string) =>
    request<{ liked: boolean }>(`/entries/${id}/like`, {
      method: 'POST',
    }),

  addComment: (entryId: string, content: string, parentId?: string) =>
    request<{ success: boolean; id: string }>(`/entries/${entryId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId }),
    }),

  deleteComment: (commentId: string) =>
    request<{ success: boolean }>(`/entries/comments/${commentId}`, {
      method: 'DELETE',
    }),

  toggleCommentLike: (commentId: string) =>
    request<{ liked: boolean }>(`/entries/comments/${commentId}/like`, {
      method: 'POST',
    }),
};

// 管理员 API
export const adminApi = {
  getInviteCodes: () => request<InviteCodeData[]>('/admin/invite-codes'),

  createInviteCode: (code: string) =>
    request<{ success: boolean }>('/admin/invite-codes', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  toggleInviteCode: (id: string, is_active: boolean) =>
    request<{ success: boolean }>(`/admin/invite-codes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active }),
    }),

  deleteInviteCode: (id: string) =>
    request<{ success: boolean }>(`/admin/invite-codes/${id}`, {
      method: 'DELETE',
    }),

  getUsers: () => request<UserProfileData[]>('/admin/users'),

  toggleBan: (userId: string, is_banned: boolean) =>
    request<{ success: boolean }>(`/admin/users/${userId}/ban`, {
      method: 'PUT',
      body: JSON.stringify({ is_banned }),
    }),

  getOnlineUsers: (windowMinutes: number = 5) =>
    request<{ data: { id: string; username: string; email: string; role: string; lastSeen: string; lastIp: string }[]; count: number; window: number }>(
      `/admin/online-users?window=${windowMinutes}`
    ),
};

// 用户 API
export const usersApi = {
  getProfile: (username: string) =>
    request<UserPublicData>(`/users/${username}`),

  getEntries: (username: string) =>
    request<UserEntryData[]>(`/users/${username}/entries`),

  toggleFollow: (username: string) =>
    request<{ following: boolean }>(`/users/${username}/follow`, {
      method: 'POST',
    }),

  getFollowers: (username: string) =>
    request<FollowUserData[]>(`/users/${username}/followers`),

  getFollowing: (username: string) =>
    request<FollowUserData[]>(`/users/${username}/following`),
};

// 通知 API
export const notificationsApi = {
  getAll: (page = 1, limit = 20) =>
    request<{ notifications: NotificationData[]; total: number; page: number; limit: number }>(
      `/notifications?page=${page}&limit=${limit}`
    ),

  getUnreadCount: () =>
    request<{ count: number }>('/notifications/unread-count'),

  markAsRead: (id: number) =>
    request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllAsRead: () =>
    request<{ success: boolean }>('/notifications/read-all', {
      method: 'PUT',
    }),
};
