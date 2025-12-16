import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Search, Plus, Shield, Bell } from 'lucide-react';
import { useAuth, useTheme } from '../../context';
import { notificationsApi } from '../../lib/api';
import { ChristmasLights, ThemeToggle } from '../common';

let notificationsPrefetched = false;
let profilePrefetched = false;

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export const Header = ({ onSearch }: HeaderProps) => {
  const { currentUser } = useAuth();
  const { isChristmas } = useTheme();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const userInitial = currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : '?';
  const userProfilePath = currentUser?.username ? `/user/${currentUser.username}` : '/profile';
  const userTitle = currentUser?.title || 'ROOKIE';

  const refreshUnreadCount = () => {
    if (currentUser) {
      notificationsApi.getUnreadCount().then(res => {
        setUnreadCount(res.count);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    refreshUnreadCount();
  }, [currentUser]);

  // 监听通知已读事件
  useEffect(() => {
    const handleNotificationRead = () => refreshUnreadCount();
    window.addEventListener('notification-read', handleNotificationRead);
    return () => window.removeEventListener('notification-read', handleNotificationRead);
  }, [currentUser]);

  // 进入后预取个人资料/通知页面，减少首次点击等待
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentUser) {
        prefetchProfile();
        prefetchNotifications();
      }
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchInput);
    }
  };

  const handleCreateClick = () => {
    if (currentUser) {
      navigate('/create');
    } else {
      navigate('/auth');
    }
  };

  const prefetchNotifications = () => {
    if (notificationsPrefetched) return;
    notificationsPrefetched = true;
    import('../../pages/NotificationsPage').catch(() => {});
  };

  const prefetchProfile = () => {
    if (profilePrefetched) return;
    profilePrefetched = true;
    import('../auth/ProfileView').catch(() => {});
  };

  return (
    <nav className={`border-b-4 border-black bg-white sticky top-0 z-30 relative ${isChristmas ? 'christmas-nav' : ''}`}>
      {isChristmas && <ChristmasLights />}
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between relative z-10">
        <Link to="/" className="flex items-center space-x-3 cursor-pointer group">
          <div className={`bg-black text-yellow-300 border-2 border-black p-2 shadow-[4px_4px_0px_0px_rgba(253,224,71,1)] group-hover:rotate-12 transition-transform logo-tile ${isChristmas ? 'christmas-logo-tile' : ''}`}>
            <Trash2 size={28} strokeWidth={2.5} />
          </div>
          <span className={`text-2xl font-black text-black tracking-tighter leading-none italic uppercase brand-text ${isChristmas ? 'christmas-brand-text' : ''}`}>Rubbhub</span>
        </Link>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <div className={`hidden md:flex transition-all focus-within:translate-y-1 focus-within:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isChristmas ? 'christmas-search' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
            <input
              className="bg-white border-2 border-r-0 border-black px-3 py-2 text-sm font-bold w-64 outline-none placeholder:text-gray-400"
              placeholder="搜索标题/作者/内容..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="bg-black text-white border-2 border-black px-3 py-2 flex items-center justify-center hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <Search size={18} strokeWidth={3} />
            </button>
          </div>

          <button
            onClick={handleCreateClick}
            className={`bg-pink-500 hover:bg-pink-400 text-white border-2 border-black px-6 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center ${
              isChristmas ? 'christmas-primary-btn' : ''
            }`}
          >
            <Plus size={20} strokeWidth={3} className="mr-2" /> 扔个垃圾
          </button>

          {currentUser ? (
            <div className="flex items-center gap-3">
              <Link
                to="/notifications"
                className={`relative bg-white text-black p-2 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all ${isChristmas ? 'christmas-icon-btn' : ''}`}
                title="消息通知"
                onMouseEnter={prefetchNotifications}
                onFocus={prefetchNotifications}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-5 h-5 flex items-center justify-center border border-black">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              {currentUser.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`bg-red-500 text-white p-2 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all ${isChristmas ? 'christmas-icon-btn' : ''}`}
                  title="管理后台"
                >
                  <Shield size={20} />
                </Link>
              )}
              <Link
                to={userProfilePath}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onMouseEnter={prefetchProfile}
                onFocus={prefetchProfile}
              >
                <div className="w-10 h-10 bg-blue-500 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-black text-white">
                  {userInitial}
                </div>
                <div className="hidden md:block leading-tight">
                  <div className="font-bold text-sm">{currentUser.username || '用户'}</div>
                  <div className="text-[10px] uppercase font-bold text-gray-500 bg-gray-200 px-1 w-fit">{userTitle}</div>
                </div>
              </Link>
            </div>
          ) : (
            <Link
              to="/auth"
              className="font-black text-sm hover:underline decoration-2 underline-offset-4"
            >
              LOGIN
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
