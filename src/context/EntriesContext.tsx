import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { entriesApi, EntryData, CreateEntryData } from '../lib/api';
import type { Entry, NewEntryState, Comment } from '../types';
import { mapEntryData } from '../utils/entryMapper';

interface EntriesContextType {
  entries: Entry[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  refreshEntries: () => Promise<void>;
  loadMore: () => Promise<void>;
  addEntry: (data: NewEntryState) => Promise<{ success: boolean; error?: string }>;
  updateEntry: (id: string, data: Partial<NewEntryState>) => Promise<{ success: boolean; error?: string }>;
  deleteEntry: (id: string) => Promise<{ success: boolean; error?: string }>;
  getEntryById: (id: string) => Entry | undefined;
  fetchEntryById: (id: string) => Promise<Entry | null>;
  toggleLike: (entryId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  addComment: (entryId: string, content: string) => Promise<{ success: boolean; error?: string }>;
  deleteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>;
  toggleCommentLike: (entryId: string, commentId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  addReply: (entryId: string, parentCommentId: string, content: string) => Promise<{ success: boolean; error?: string }>;
  uploadMedia: (file: File) => Promise<{ url: string | null; error?: string }>;
  updateEntryViews: (entryId: string, views: number) => void;
}

const EntriesContext = createContext<EntriesContextType | null>(null);

const PAGE_SIZE = 10;

export const EntriesProvider = ({ children }: { children: ReactNode }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchEntries = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    setError(null);

    try {
      const data = await entriesApi.getAll(pageNum, PAGE_SIZE);
      const list = Array.isArray((data as any)?.entries) ? (data as any).entries : [];
      const mappedEntries: Entry[] = list.map(mapEntryData);
      
      if (append) {
        setEntries(prev => [...prev, ...mappedEntries]);
      } else {
        setEntries(mappedEntries);
      }
      
      setPage(pageNum);
      const totalCount = (data as any)?.total ?? 0;
      setTotal(totalCount);
      const totalPages = (data as any)?.totalPages;
      const pageSize = PAGE_SIZE;
      const hasNext = totalPages
        ? pageNum < totalPages
        : (typeof totalCount === 'number' && totalCount > 0
            ? pageNum * pageSize < totalCount
            : mappedEntries.length === pageSize);
      setHasMore(hasNext);
    } catch (err) {
      console.error('加载数据出错:', err);
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // 监听登录状态变化
  useEffect(() => {
    const handleAuthChange = () => {
      fetchEntries();
    };
    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [fetchEntries]);

  const refreshEntries = async () => {
    await fetchEntries(1, false);
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;
    await fetchEntries(page + 1, true);
  };

  const updateEntryViews = (entryId: string, views: number) => {
    setEntries(prev => prev.map(e => 
      e.id === entryId ? { ...e, views } : e
    ));
  };

  const uploadMedia = async (file: File): Promise<{ url: string | null; error?: string }> => {
    // 暂时禁用图片上传（需要配置阿里云 OSS）
    return { url: null, error: '图片上传功能暂未开放' };
  };

  const normalizeTags = (tags?: string | string[]) => {
    if (Array.isArray(tags)) return tags.filter(Boolean);
    if (typeof tags === 'string') {
      return tags.split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
    }
    return [];
  };

  const addEntry = async (data: NewEntryState): Promise<{ success: boolean; error?: string }> => {
    try {
      const createData: CreateEntryData = {
        title: data.title,
        domain: data.domain,
        major: data.major,
        wasteType: data.wasteType,
        wasteSubType: data.wasteSubType,
        cause: data.cause || (data.wasteType === 'recyclable' ? '可回收废料' : '不可回收废料'),
        content: data.content,
        visibility: data.visibility,
        media: data.media,
        tags: normalizeTags(data.tags)
      };

      await entriesApi.create(createData);
      await refreshEntries();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '发布失败' };
    }
  };

  const updateEntry = async (
    id: string,
    data: Partial<NewEntryState>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const updateData: Partial<CreateEntryData> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.visibility !== undefined) updateData.visibility = data.visibility;
      if (data.domain !== undefined) updateData.domain = data.domain;
      if (data.major !== undefined) updateData.major = data.major;
      if (data.wasteType !== undefined) updateData.wasteType = data.wasteType;
      if (data.wasteSubType !== undefined) updateData.wasteSubType = data.wasteSubType;
      if (data.cause !== undefined) updateData.cause = data.cause;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.media !== undefined) updateData.media = data.media;
      if (data.tags !== undefined) updateData.tags = normalizeTags(data.tags);

      await entriesApi.update(id, updateData);
      await refreshEntries();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '更新失败' };
    }
  };

  const deleteEntry = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await entriesApi.delete(id);
      await refreshEntries();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '删除失败' };
    }
  };

  const getEntryById = (id: string): Entry | undefined => {
    return entries.find(e => e.id === id);
  };

  const fetchEntryById = async (id: string): Promise<Entry | null> => {
    try {
      const data = await entriesApi.getOne(id);
      if (!data) return null;
      const entry = mapEntryData(data);
      // 更新或添加到列表
      setEntries(prev => {
        const exists = prev.find(e => e.id === id);
        if (exists) {
          return prev.map(e => e.id === id ? entry : e);
        }
        return [entry, ...prev];
      });
      return entry;
    } catch {
      return null;
    }
  };

  const toggleLike = async (entryId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
    // 保存原状态用于回滚
    const originalEntries = [...entries];
    
    // 乐观更新
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e;
      const isLiked = (e.likedBy || []).includes(userId);
      return {
        ...e,
        sympathy: isLiked ? e.sympathy - 1 : e.sympathy + 1,
        likedBy: isLiked 
          ? (e.likedBy || []).filter(id => id !== userId)
          : [...(e.likedBy || []), userId]
      };
    }));

    try {
      await entriesApi.toggleLike(entryId);
      return { success: true };
    } catch (err) {
      // 回滚
      setEntries(originalEntries);
      return { success: false, error: err instanceof Error ? err.message : '操作失败' };
    }
  };

  const addComment = async (entryId: string, content: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await entriesApi.addComment(entryId, content);
      await refreshEntries();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '发表评论失败' };
    }
  };

  const deleteComment = async (commentId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await entriesApi.deleteComment(commentId);
      await refreshEntries();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '删除评论失败' };
    }
  };

  const toggleCommentLike = async (entryId: string, commentId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
    // 保存原状态用于回滚
    const originalEntries = [...entries];

    // 递归更新评论的辅助函数
    const updateCommentLike = (comments: Comment[]): Comment[] => {
      return comments.map(c => {
        if (c.id === commentId) {
          const isLiked = (c.likedBy || []).includes(userId);
          return {
            ...c,
            likes: isLiked ? c.likes - 1 : c.likes + 1,
            likedBy: isLiked 
              ? (c.likedBy || []).filter(id => id !== userId)
              : [...(c.likedBy || []), userId]
          };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: updateCommentLike(c.replies) };
        }
        return c;
      });
    };

    // 乐观更新
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e;
      return { ...e, comments: updateCommentLike(e.comments) };
    }));

    try {
      await entriesApi.toggleCommentLike(commentId);
      return { success: true };
    } catch (err) {
      // 回滚
      setEntries(originalEntries);
      return { success: false, error: err instanceof Error ? err.message : '操作失败' };
    }
  };

  const addReply = async (entryId: string, parentCommentId: string, content: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await entriesApi.addComment(entryId, content, parentCommentId);
      await refreshEntries();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '回复失败' };
    }
  };

  return (
    <EntriesContext.Provider value={{
      entries,
      loading,
      error,
      hasMore,
      total,
      refreshEntries,
      loadMore,
      addEntry,
      updateEntry,
      deleteEntry,
      getEntryById,
      fetchEntryById,
      toggleLike,
      addComment,
      deleteComment,
      toggleCommentLike,
      addReply,
      uploadMedia,
      updateEntryViews
    }}>
      {children}
    </EntriesContext.Provider>
  );
};

export const useEntries = () => {
  const context = useContext(EntriesContext);
  if (!context) {
    throw new Error('useEntries must be used within an EntriesProvider');
  }
  return context;
};
