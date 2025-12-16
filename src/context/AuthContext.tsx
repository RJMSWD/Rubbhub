import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, UserData } from '../lib/api';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  joinedAt: string;
  title?: string;
  bio?: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
  register: (email: string, password: string, username: string, inviteCode: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: { title?: string; bio?: string }) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化：检查本地存储的 token
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authApi.getMe() as any;
          // 后端返回 { success, user } 格式，需要解构
          const user = response.user || response;
          const safeUsername = user?.username || (user?.email ? user.email.split('@')[0] : '用户');
          setCurrentUser({
            id: user.id,
            email: user.email,
            username: safeUsername,
            joinedAt: user.joinedAt,
            title: user.title,
            bio: user.bio,
            role: user.role
          });
        } catch {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const response = await authApi.login(email, password) as any;
      const token = response.token;
      const user = response.user;
      localStorage.setItem('token', token);
      const safeUsername = user?.username || (user?.email ? user.email.split('@')[0] : '用户');
      setCurrentUser({
        id: user.id,
        email: user.email,
        username: safeUsername,
        joinedAt: user.joinedAt,
        title: user.title,
        bio: user.bio,
        role: user.role
      });
      // 触发自定义事件通知数据刷新
      window.dispatchEvent(new Event('auth-change'));
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : '登录失败' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    // 通知依赖登录状态的上下文刷新数据
    window.dispatchEvent(new Event('auth-change'));
  };

  const register = async (
    email: string,
    password: string,
    username: string,
    inviteCode: string
  ): Promise<{ error: string | null }> => {
    try {
      await authApi.register(email, password, username, inviteCode);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : '注册失败' };
    }
  };

  const updateProfile = async (updates: { title?: string; bio?: string }): Promise<{ error: string | null }> => {
    if (!currentUser) return { error: '未登录' };

    try {
      await authApi.updateProfile(updates);
      setCurrentUser({ ...currentUser, ...updates });
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : '更新失败' };
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      login,
      logout,
      register,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
