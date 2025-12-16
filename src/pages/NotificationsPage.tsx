import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Bell, MessageSquare, UserPlus, Heart, Check, CheckCheck } from 'lucide-react';
import { notificationsApi, NotificationData } from '../lib/api';
import { useAuth, useTheme } from '../context';

const MIN_LOADING_MS = 180;
let notificationsCache: NotificationData[] | null = null;
let notificationsCacheTs = 0;

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isChristmas } = useTheme();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    document.title = '消息通知 - Rubbish Archive';
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const now = Date.now();
    const hasFreshCache = notificationsCache && now - notificationsCacheTs < 5 * 60 * 1000;
    if (hasFreshCache && notificationsCache) {
      setNotifications(notificationsCache);
      setLoading(false);
      loadNotifications(false);
    } else {
      loadNotifications(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const loadNotifications = async (useLoading: boolean) => {
    try {
      const start = Date.now();
      if (useLoading) setLoading(true);
      else setRefreshing(true);
      const res = await notificationsApi.getAll(1, 50);
      setNotifications(res.notifications || []);
      notificationsCache = res.notifications || [];
      notificationsCacheTs = Date.now();
      const elapsed = Date.now() - start;
      const delay = Math.max(0, MIN_LOADING_MS - elapsed);
      setTimeout(() => {
        if (useLoading) setLoading(false);
        setRefreshing(false);
      }, delay);
    } catch (err) {
      console.error('加载通知失败:', err);
      setLoading(false);
      setRefreshing(false);
    } finally {
    }
  };

  const handleMarkAsRead = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      window.dispatchEvent(new Event('notification-read'));
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  };

  const handleNotificationClick = async (n: NotificationData) => {
    if (!n.is_read) {
      await notificationsApi.markAsRead(n.id);
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
      window.dispatchEvent(new Event('notification-read'));
    }
    if (n.entry_id) {
      navigate(`/entry/${n.entry_id}`);
    } else if (n.type === 'follow') {
      navigate(`/user/${n.from_username}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('notification-read'));
    } catch (err) {
      console.error('标记全部已读失败:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'comment': return <MessageSquare size={20} className="text-blue-500" />;
      case 'reply': return <MessageSquare size={20} className="text-green-500" />;
      case 'follow': return <UserPlus size={20} className="text-purple-500" />;
      case 'like': return <Heart size={20} className="text-pink-500" />;
      default: return <Bell size={20} className="text-gray-500" />;
    }
  };

  const getMessage = (n: NotificationData) => {
    switch (n.type) {
      case 'comment': return `评论了你的帖子「${n.entry_title}」`;
      case 'reply': return `回复了你的评论`;
      case 'follow': return '关注了你';
      case 'like': return `赞了你的帖子「${n.entry_title}」`;
      default: return '发送了一条通知';
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-black mb-4">请先登录</p>
          <Link to="/auth" className="underline font-bold">去登录</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-amber-50 font-sans p-6 ${isChristmas ? 'christmas-page' : ''}`}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center font-black text-black hover:-translate-x-1 transition-transform"
          >
            <div className="bg-white border-2 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mr-3 transition-all">
              <ArrowLeft size={20} />
            </div>
            返回
          </button>

          {notifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 bg-white text-black font-bold px-4 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <CheckCheck size={18} />
              全部已读
            </button>
          )}
        </div>

        <div className={`bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 ${
          isChristmas ? 'christmas-panel christmas-confetti' : ''
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <Bell size={24} className="text-black" />
            <h1 className="text-2xl font-black">消息通知</h1>
          </div>

          {loading ? (
            <div className="space-y-3" aria-label="通知加载中">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-4 border-2 border-black bg-gray-50 animate-pulse"
                >
                  <div className="w-8 h-8 bg-gray-200 border border-black"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 w-3/4"></div>
                    <div className="h-3 bg-gray-200 w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-10">
              <Bell size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="font-bold text-gray-500">暂无通知</p>
            </div>
          ) : (
            <div className="space-y-3">
              {refreshing && (
                <div className="text-xs text-gray-400 font-bold">正在刷新最新通知...</div>
              )}
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start gap-4 p-4 border-2 border-black transition-all cursor-pointer hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 ${
                    n.is_read ? 'bg-gray-50' : 'bg-yellow-50'
                  }`}
                >
                  <div className="shrink-0 mt-1">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">
                      <span
                        onClick={(e) => { e.stopPropagation(); navigate(`/user/${n.from_username}`); }}
                        className="text-blue-600 hover:underline cursor-pointer"
                      >
                        {n.from_username}
                      </span>
                      {' '}{getMessage(n)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="shrink-0 p-2 hover:bg-gray-200 transition-colors rounded"
                      title="标记已读"
                    >
                      <Check size={16} className="text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
