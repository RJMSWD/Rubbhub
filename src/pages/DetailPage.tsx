import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Lock, Globe, Leaf, Ban, Hash,
  AlertTriangle, Image as ImageIcon, MessageSquare, Send, Heart, PenSquare, Trash2, Eye, CandyCane
} from 'lucide-react';
import { useEntries, useAuth, useToast, useConfirm, useTheme } from '../context';
import { getDomainStyle } from '../utils/helpers';
import { CommentItem } from '../components/common';
import type { Entry } from '../types';

export const DetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchEntryById, toggleLike, addComment, toggleCommentLike, addReply, deleteEntry, deleteComment } = useEntries();
  const { currentUser } = useAuth();
  const { isChristmas } = useTheme();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [newComment, setNewComment] = useState('');
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const hasFetched = useRef<string | null>(null);
  const [bursts, setBursts] = useState<Array<{ id: number; dx: number; dy: number; color: string }>>([]);

  // 每次进入都从后端获取最新数据（包括最新浏览量）
  useEffect(() => {
    // 防止 StrictMode 下重复调用（用 id 跟踪，不用 cleanup 重置）
    if (hasFetched.current === id) return;
    
    if (id) {
      hasFetched.current = id;
      setLoading(true);
      setNotFound(false);
      fetchEntryById(id).then(result => {
        setEntry(result);
        if (!result) setNotFound(true);
        setLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (entry) {
      document.title = `${entry.title} - Rubbish Archive`;
    } else {
      document.title = '找不到该垃圾 - Rubbish Archive';
    }
  }, [entry]);

  const isPrivateAndUnauthorized = entry && entry.visibility === 'private' && currentUser?.username !== entry.author;

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-black mb-2">加载中...</p>
        </div>
      </div>
    );
  }

  if (!entry || isPrivateAndUnauthorized || notFound) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-black mb-4">找不到该 Rubbish</p>
          <Link to="/" className="underline font-bold">返回首页</Link>
        </div>
      </div>
    );
  }

  // 刷新帖子数据
  const refreshEntry = async () => {
    if (id) {
      const result = await fetchEntryById(id);
      if (result) setEntry(result);
    }
  };

  const handleSympathy = async () => {
    if (!currentUser) {
      showToast('请先登录', 'error');
      return;
    }
    // 点赞彩蛋
    const colors = isChristmas
      ? ['#d90429', '#2b9348', '#f6ad55', '#1a1a1a', '#ffffff']
      : ['#ec4899', '#fb7185', '#f472b6', '#fcd34d', '#111827'];
    const newBursts = Array.from({ length: 10 }, (_, idx) => ({
      id: Date.now() + idx,
      dx: (Math.random() - 0.5) * 32,
      dy: -Math.random() * 32 - 10,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setBursts((prev) => [...prev, ...newBursts]);
    newBursts.forEach((b) => {
      setTimeout(() => {
        setBursts((prev) => prev.filter((item) => item.id !== b.id));
      }, 650);
    });
    // 乐观更新本地状态
    const isLiked = (entry.likedBy || []).includes(currentUser.id);
    setEntry({
      ...entry,
      sympathy: isLiked ? entry.sympathy - 1 : entry.sympathy + 1,
      likedBy: isLiked 
        ? (entry.likedBy || []).filter(id => id !== currentUser.id)
        : [...(entry.likedBy || []), currentUser.id]
    });
    const { success, error } = await toggleLike(entry.id, currentUser.id);
    if (!success && error) {
      showToast(error, 'error');
      refreshEntry(); // 失败时刷新
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    const { success, error } = await addComment(entry.id, newComment);
    if (!success) {
      showToast(error || '发表评论失败', 'error');
      return;
    }
    setNewComment('');
    refreshEntry(); // 刷新获取新评论
  };

  const handleCommentLike = async (commentId: string) => {
    if (!currentUser) return;
    const { success, error } = await toggleCommentLike(entry.id, commentId, currentUser.id);
    if (!success && error) showToast(error, 'error');
    else refreshEntry(); // 刷新获取最新点赞状态
  };

  const handleReply = async (parentId: string, content: string) => {
    if (!currentUser) return;
    const { success, error } = await addReply(entry.id, parentId, content);
    if (!success && error) showToast(error, 'error');
    else refreshEntry(); // 刷新获取新回复
  };

  const handleDeleteEntry = async () => {
    const ok = await confirm('确定要删除这个帖子吗？');
    if (!ok) return;
    const { success, error } = await deleteEntry(entry.id);
    if (success) {
      showToast('帖子已删除', 'success');
      navigate('/');
    } else {
      showToast(error || '删除失败', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const ok = await confirm('确定要删除这条评论吗？');
    if (!ok) return;
    const { success, error } = await deleteComment(commentId);
    if (success) {
      showToast('评论已删除', 'success');
      refreshEntry(); // 刷新获取最新评论列表
    } else {
      showToast(error || '删除失败', 'error');
    }
  };

  const isEntryLiked = currentUser ? (entry.likedBy || []).includes(currentUser.id) : false;
  const isAdmin = currentUser?.role === 'admin';
  const isAuthor = currentUser?.username === entry.author;
  const canDeleteEntry = isAuthor || (isAdmin && entry.visibility === 'public');

  return (
    <div className={`min-h-screen bg-amber-50 font-sans selection:bg-pink-300 p-6 ${isChristmas ? 'christmas-page' : ''}`}>
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-300 relative">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center font-black text-black mb-6 hover:-translate-x-1 transition-transform"
        >
          <div className="bg-white border-2 border-black p-2 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mr-3 transition-all">
            <ArrowLeft size={20} />
          </div>
          返回 Rubbish 堆
        </button>

        <div className={`bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 relative overflow-hidden ${
          isChristmas ? 'christmas-panel christmas-confetti' : ''
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-300 rounded-full blur-3xl opacity-50 pointer-events-none -mr-10 -mt-10"></div>

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="font-mono font-bold text-sm bg-black text-white px-3 py-1 -rotate-2">
                    ID: {entry.id}
                  </span>
                  {entry.visibility === 'private' ? (
                    <span className="flex items-center text-sm font-bold bg-gray-200 text-black px-3 py-1 border-2 border-black">
                      <Lock size={14} className="mr-2" /> 私有 Rubbish
                    </span>
                  ) : (
                    <span className="flex items-center text-sm font-bold bg-yellow-300 text-black px-3 py-1 border-2 border-black rotate-1">
                      <Globe size={14} className="mr-2" /> 公开 Rubbish
                    </span>
                  )}
                  {entry.author ? (
                    <Link
                      to={`/user/${entry.author}`}
                      className="flex items-center text-sm font-bold bg-white text-black px-3 py-1 border-2 border-black hover:bg-gray-100 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="w-7 h-7 bg-gradient-to-br from-pink-400 to-purple-500 border border-black flex items-center justify-center text-sm font-black text-white mr-2 rounded-full">
                        {isChristmas ? '🎅' : entry.author.charAt(0).toUpperCase()}
                      </div>
                      {entry.author}
                    </Link>
                  ) : (
                    <span className="flex items-center text-sm font-bold bg-gray-100 text-gray-500 px-3 py-1 border-2 border-black">
                      匿名用户
                    </span>
                  )}
                  <span className={`flex items-center text-sm font-bold px-3 py-1 border-2 text-white border-black transform -rotate-2 ${
                    entry.wasteType === 'recyclable' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}>
                    {entry.wasteType === 'recyclable' ? (
                      <><Leaf size={14} className="mr-2" /> 可回收垃圾</>
                    ) : (
                      <><Ban size={14} className="mr-2" /> 不可回收垃圾</>
                    )}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-black leading-tight mb-2 uppercase italic">
                  {entry.title}
                </h1>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {entry.tags.map((tag, idx) => (
                      <span key={idx} className="flex items-center text-xs font-bold bg-gray-100 border border-black px-2 py-0.5">
                        <Hash size={10} className="mr-1" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-4 justify-end mb-1">
                  <span className="flex items-center gap-1 text-sm font-bold text-gray-500">
                    <Eye size={16} /> {entry.views || 0}
                  </span>
                </div>
                <div className="text-right bg-pink-100 border-2 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-2">
                  <div className="text-xs font-black uppercase mb-1">Produced On</div>
                  <div className="font-mono font-bold text-lg">
                    {new Date(entry.timestamp).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                {currentUser?.username === entry.author && (
                  <Link
                    to={`/edit/${entry.id}`}
                    className="bg-black text-white p-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(200,200,200,1)] hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 font-bold text-sm"
                  >
                    <PenSquare size={14} /> 修改 (EDIT)
                  </Link>
                )}
                {canDeleteEntry && (
                  <button
                    onClick={handleDeleteEntry}
                    className="bg-red-500 text-white p-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(200,200,200,1)] hover:bg-red-600 transition-colors flex items-center justify-center gap-2 font-bold text-sm"
                  >
                    <Trash2 size={14} /> 删除 (DELETE)
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {entry.cause && (
                <div className="p-4 bg-red-100 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <span className="text-xs font-black uppercase block mb-2">Rubbish 成因 (Cause)</span>
                  <span className="text-red-600 font-bold flex items-center text-lg">
                    <AlertTriangle size={20} className="mr-2" /> {entry.cause}
                  </span>
                </div>
              )}
              <div className="p-4 bg-blue-100 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-xs font-black uppercase block mb-2">所属领域 / 专业</span>
                <div className="flex items-center flex-wrap gap-2">
                  <span className={`inline-block px-3 py-1 text-sm font-bold ${getDomainStyle(entry.domain).replace('border-2', 'border')}`}>
                    {entry.domain}
                  </span>
                  <span className="text-black font-bold">/</span>
                  <span className="inline-block bg-white px-3 py-1 text-sm font-bold border border-black text-black">
                    {entry.major}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-black uppercase mb-3 bg-black text-white inline-block px-2 transform -skew-x-12">垃圾分解 (Decomposition)</h3>
              <p className="text-lg font-medium leading-relaxed bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(200,200,200,1)] whitespace-pre-wrap">
                {entry.content}
              </p>
            </div>

            {entry.media && entry.media.items.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-black uppercase mb-3 flex items-center">
                  <ImageIcon size={20} className="mr-2" /> 现场惨状 (Evidence)
                </h3>
                <div className="border-4 border-black p-2 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-1">
                  {entry.media.type === 'video' ? (
                    <video controls className="w-full border-2 border-black max-h-96 bg-black" src={entry.media.items[0]} />
                  ) : (
                    <div className={`grid gap-2 ${entry.media.items.length > 1 ? 'grid-cols-3' : 'grid-cols-1'}`}>
                      {entry.media.items.map((url, i) => (
                        <img key={i} src={url} alt={`Evidence ${i}`} loading="lazy" className="w-full h-32 md:h-48 object-cover border-2 border-black hover:scale-105 transition-transform" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comment Section */}
            <div className="border-t-4 border-black pt-8 mt-8">
              <h3 className="text-lg font-black uppercase mb-4 flex items-center bg-blue-300 inline-block px-2 border border-black transform rotate-1">
                <MessageSquare size={20} className="mr-2" /> 围观吐槽 (COMMENTS)
              </h3>

              <div className="space-y-6">
                {entry.comments && entry.comments.length > 0 ? (
                  <div className="space-y-4">
                    {entry.comments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        currentUser={currentUser}
                        onLike={handleCommentLike}
                        onReply={handleReply}
                        isAdmin={isAdmin}
                        onDelete={handleDeleteComment}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-gray-300">
                    <p className="text-gray-400 font-bold text-sm">暂无评论，快来抢沙发！</p>
                  </div>
                )}

                <div className="bg-white border-2 border-black p-4">
                  {currentUser ? (
                    <>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="对此发表你的高见..."
                        className="w-full bg-gray-100 border border-black p-3 font-medium text-sm h-24 resize-none focus:outline-none focus:bg-white transition-all mb-3"
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="w-full bg-black text-white font-black py-2 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={16} /> 发送吐槽 (POST COMMENT)
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 border border-black border-dashed flex flex-col items-center justify-center">
                      <p className="font-bold text-gray-500 mb-3">只有认证的拾荒者才能发表评论</p>
                      <Link
                        to="/auth"
                        className="bg-black text-white px-6 py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all font-black text-sm"
                      >
                        立即登录 (LOGIN TO COMMENT)
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t-4 border-black mt-8 pt-6 flex flex-wrap justify-between items-center gap-4">
              <div className="flex gap-4">
                <button
                  onClick={handleSympathy}
                  className={`group relative flex items-center gap-2 px-6 py-3 border-2 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all active:scale-95 ${
                    isEntryLiked ? 'bg-pink-500 text-white' : 'bg-pink-300 text-white'
                  }`}
                >
                  {bursts.map((b) => (
                    <span
                      key={b.id}
                      className="like-burst"
                      style={
                        {
                          '--dx': `${b.dx}px`,
                          '--dy': `${b.dy}px`,
                          backgroundColor: b.color,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                  {isChristmas ? (
                    <CandyCane size={20} className="group-hover:scale-125 transition-transform duration-300" />
                  ) : (
                    <Heart
                      size={20}
                      className={`group-hover:scale-125 transition-transform duration-300 ${isEntryLiked ? 'fill-white' : ''}`}
                    />
                  )}
                  <span>{entry.sympathy} 同样遭遇</span>
                </button>
              </div>
              <div className="font-mono text-xs font-bold text-gray-500">
                HASH: {entry.id.split('.').join('-')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
