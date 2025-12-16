import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Users, UserPlus, UserMinus, Heart, Clock, X } from 'lucide-react';
import { usersApi, UserPublicData, UserEntryData, FollowUserData } from '../lib/api';
import { useAuth, useToast, useTheme } from '../context';
import { getDomainStyle } from '../utils/helpers';

export const UserPage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { isChristmas } = useTheme();

  const [user, setUser] = useState<UserPublicData | null>(null);
  const [entries, setEntries] = useState<UserEntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  
  // 粉丝/关注列表模态框
  const [showModal, setShowModal] = useState<'followers' | 'following' | null>(null);
  const [modalList, setModalList] = useState<FollowUserData[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  
  // 帖子筛选
  const [entryFilter, setEntryFilter] = useState<'all' | 'public' | 'private'>('all');

  useEffect(() => {
    if (!username) {
      navigate('/profile', { replace: true });
      return;
    }
    document.title = `${username} - Rubbish Archive`;
    loadUserData();
  }, [username, navigate]);

  const loadUserData = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);

    try {
      const [profileData, entriesData] = await Promise.all([
        usersApi.getProfile(username),
        usersApi.getEntries(username)
      ]);
      setUser(profileData);
      setEntries(entriesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      showToast('请先登录', 'error');
      return;
    }
    if (!username || !user) return;

    setFollowLoading(true);
    try {
      const { following } = await usersApi.toggleFollow(username);
      setUser({
        ...user,
        isFollowing: following,
        followersCount: following ? user.followersCount + 1 : user.followersCount - 1
      });
      showToast(following ? '关注成功' : '已取消关注', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShowFollowers = async () => {
    if (!username) return;
    setShowModal('followers');
    setModalLoading(true);
    try {
      const list = await usersApi.getFollowers(username);
      setModalList(list);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', 'error');
      setShowModal(null);
    } finally {
      setModalLoading(false);
    }
  };

  const handleShowFollowing = async () => {
    if (!username) return;
    setShowModal('following');
    setModalLoading(true);
    try {
      const list = await usersApi.getFollowing(username);
      setModalList(list);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', 'error');
      setShowModal(null);
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-10 w-32 bg-gray-200 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse" />
          <div className="bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-gray-200 border-4 border-black animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-6 w-40 bg-gray-200 animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-10 bg-gray-100 border border-black animate-pulse" />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-20 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-amber-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center font-black mb-6 hover:-translate-x-1 transition-transform">
            <ArrowLeft className="mr-2" /> 返回
          </button>
          <div className="bg-white border-4 border-black p-8 text-center">
            <p className="text-xl font-black text-red-500">{error || '用户不存在'}</p>
          </div>
        </div>
      </div>
    );
  }

  const safeUsername = user.username || '用户';
  const userInitial = safeUsername.charAt(0).toUpperCase();
  const isOwnProfile = currentUser?.username === user.username;

  // 筛选后的帖子列表
  const filteredEntries = entries.filter(e => {
    if (entryFilter === 'public') return e.visibility === 'public';
    if (entryFilter === 'private') return e.visibility === 'private';
    return true;
  });
  const publicCount = entries.filter(e => e.visibility === 'public').length;
  const privateCount = entries.filter(e => e.visibility === 'private').length;

  return (
    <div className={`min-h-screen bg-amber-50 p-6 ${isChristmas ? 'christmas-page' : ''}`}>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="group flex items-center font-black mb-6 hover:-translate-x-1 transition-transform">
          <div className="bg-white border-2 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mr-3 transition-all">
            <ArrowLeft size={20} />
          </div>
          返回
        </button>

        {/* 用户信息卡片 */}
        <div className={`bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 mb-8 ${
          isChristmas ? 'christmas-panel christmas-confetti' : ''
        }`}>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* 头像 */}
            <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-purple-500 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-4xl font-black text-white shrink-0">
              {userInitial}
            </div>

            {/* 信息 */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-black uppercase">{safeUsername}</h1>
                {user.title && (
                  <span className="bg-yellow-300 border-2 border-black px-2 py-0.5 text-sm font-bold transform -rotate-2">
                    {user.title}
                  </span>
                )}
              </div>

              {user.bio && (
                <p className="text-gray-600 font-medium mb-4 border-l-4 border-gray-300 pl-3">
                  {user.bio}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm font-bold mb-4">
                <span className="flex items-center gap-1 bg-gray-100 px-3 py-1 border border-black">
                  <FileText size={14} /> {user.entriesCount} 帖子
                </span>
                {isOwnProfile ? (
                  <button
                    onClick={handleShowFollowers}
                    className="flex items-center gap-1 bg-gray-100 px-3 py-1 border border-black hover:bg-gray-200 cursor-pointer transition-colors"
                  >
                    <Users size={14} /> {user.followersCount} 粉丝
                  </button>
                ) : (
                  <span className="flex items-center gap-1 bg-gray-100 px-3 py-1 border border-black">
                    <Users size={14} /> {user.followersCount} 粉丝
                  </span>
                )}
                {isOwnProfile ? (
                  <button
                    onClick={handleShowFollowing}
                    className="flex items-center gap-1 bg-gray-100 px-3 py-1 border border-black hover:bg-gray-200 cursor-pointer transition-colors"
                  >
                    <UserPlus size={14} /> {user.followingCount} 关注
                  </button>
                ) : (
                  <span className="flex items-center gap-1 bg-gray-100 px-3 py-1 border border-black">
                    <UserPlus size={14} /> {user.followingCount} 关注
                  </span>
                )}
                <span className="flex items-center gap-1 bg-gray-100 px-3 py-1 border border-black">
                  <Calendar size={14} /> {new Date(user.joinedAt || Date.now()).toLocaleDateString('zh-CN')} 加入
                </span>
              </div>

              {/* 操作按钮 */}
              {!isOwnProfile && currentUser && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-2 px-6 py-2 border-2 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all ${
                    user.isFollowing
                      ? 'bg-gray-200 text-black'
                      : 'bg-pink-400 text-white'
                  }`}
                >
                  {user.isFollowing ? (
                    <><UserMinus size={18} /> 取消关注</>
                  ) : (
                    <><UserPlus size={18} /> 关注</>
                  )}
                </button>
              )}
              {isOwnProfile && (
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 px-6 py-2 border-2 border-black font-black bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all"
                >
                  编辑资料
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 帖子列表 */}
        {isOwnProfile ? (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setEntryFilter('all')}
              className={`px-4 py-2 font-black text-sm border-2 border-black transition-all ${
                entryFilter === 'all'
                  ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1'
                  : 'bg-white text-black hover:-translate-y-1'
              }`}
            >
              我的Rub ({entries.length})
            </button>
            <button
              onClick={() => setEntryFilter('public')}
              className={`px-4 py-2 font-black text-sm border-2 border-black transition-all ${
                entryFilter === 'public'
                  ? 'bg-emerald-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1'
                  : 'bg-white text-emerald-600 hover:-translate-y-1'
              }`}
            >
              公开Rub ({publicCount})
            </button>
            <button
              onClick={() => setEntryFilter('private')}
              className={`px-4 py-2 font-black text-sm border-2 border-black transition-all ${
                entryFilter === 'private'
                  ? 'bg-gray-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1'
                  : 'bg-white text-gray-600 hover:-translate-y-1'
              }`}
            >
              私有Rub ({privateCount})
            </button>
          </div>
        ) : (
          <div className="bg-black text-white px-4 py-2 font-black text-lg mb-4 inline-block">
            公开帖子 ({entries.length})
          </div>
        )}

        {filteredEntries.length === 0 ? (
          <div className="bg-white border-4 border-black p-8 text-center">
            <p className="text-gray-500 font-bold">
              {isOwnProfile 
                ? (entryFilter === 'private' ? '暂无私有帖子' : entryFilter === 'public' ? '暂无公开帖子' : '暂无帖子')
                : '暂无公开帖子'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map(entry => (
              <Link
                key={entry.id}
                to={`/entry/${entry.id}`}
                className="block bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-black text-white px-2 py-0.5">{entry.id}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 border border-black text-white ${
                      entry.wasteType === 'recyclable' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}>
                      {entry.wasteType === 'recyclable' ? '可回收' : '不可回收'}
                    </span>
                    {entry.visibility === 'private' && (
                      <span className="text-xs font-bold bg-gray-400 text-white px-2 py-0.5 border border-black">
                        私有
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-500 flex items-center">
                    <Clock size={12} className="mr-1" />
                    {new Date(entry.timestamp || Date.now()).toLocaleDateString('zh-CN')}
                  </span>
                </div>

                <h3 className="text-xl font-black uppercase italic mb-2 hover:text-pink-600 transition-colors">
                  {entry.title || '未命名垃圾'}
                </h3>

                <p className="text-gray-600 font-medium text-sm line-clamp-2 mb-4">
                  {entry.content || ''}
                </p>

                <div className="flex justify-between items-center">
                  <span className={`text-xs px-2 py-1 font-bold border border-black ${getDomainStyle(entry.domain).split(' ')[0]}`}>
                    {entry.domain}
                  </span>
                  <span className="flex items-center text-sm font-bold text-pink-500">
                    <Heart size={14} className="mr-1" /> {entry.sympathy}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 粉丝/关注列表模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(null)}>
          <div 
            className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b-2 border-black">
              <h3 className="text-xl font-black">
                {showModal === 'followers' ? '粉丝列表' : '关注列表'}
              </h3>
              <button 
                onClick={() => setShowModal(null)}
                className="p-1 hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {modalLoading ? (
                <div className="text-center py-8 font-bold">加载中...</div>
              ) : modalList.length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-bold">
                  {showModal === 'followers' ? '暂无粉丝' : '暂无关注'}
                </div>
              ) : (
                <div className="space-y-3">
                  {modalList.map(u => (
                    <Link
                      key={u.id}
                      to={`/user/${u.username}`}
                      onClick={() => setShowModal(null)}
                      className="flex items-center gap-3 p-3 border-2 border-black hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 border-2 border-black flex items-center justify-center text-lg font-black text-white shrink-0">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black truncate">{u.username}</div>
                        {u.title && (
                          <div className="text-xs text-gray-500 truncate">{u.title}</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
