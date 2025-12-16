import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Fingerprint, Edit3, Save, Check, LogOut, Mail } from 'lucide-react';
import { useAuth, useTheme } from '../../context';

export const ProfileView = () => {
  const navigate = useNavigate();
  const { currentUser, updateProfile, logout, loading } = useAuth();
  const { isChristmas } = useTheme();

  useEffect(() => {
    document.title = '个人资料 - Rubbish Archive';
  }, []);

  // 未登录时重定向
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/auth', { replace: true });
    }
  }, [loading, currentUser, navigate]);

  const [formData, setFormData] = useState({
    title: currentUser?.title || '',
    bio: currentUser?.bio || ''
  });
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 font-sans p-6 pt-24">
        <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300 space-y-4">
          <div className="h-10 w-32 bg-gray-200 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse" />
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 space-y-4">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-6 w-40 bg-gray-200 animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 animate-pulse" />
              </div>
              <div className="w-20 h-20 bg-gray-200 border-4 border-black animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-12 bg-gray-100 border-2 border-dashed border-black animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const { error: updateError } = await updateProfile(formData);
    if (updateError) {
      setError(updateError);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className={`min-h-screen bg-amber-50 font-sans p-6 pt-24 ${isChristmas ? 'christmas-page' : ''}`}>
      <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center font-black text-black mb-6 hover:-translate-x-1 transition-transform"
        >
          <div className="bg-white border-2 border-black p-2 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mr-3 transition-all">
            <ArrowLeft size={20} />
          </div>
          返回
        </button>

        <div className={`bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 relative overflow-hidden ${
          isChristmas ? 'christmas-panel christmas-confetti' : ''
        }`}>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-300 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <h2 className="text-3xl font-black uppercase italic mb-2">个人档案 (ID CARD)</h2>
              <div className="inline-block bg-black text-white px-2 py-1 font-mono text-xs transform -rotate-2">
                MEMBER SINCE: {new Date(currentUser.joinedAt || Date.now()).getFullYear()}
              </div>
            </div>
            <div className="w-20 h-20 bg-blue-500 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-4xl font-black text-white">
              {(currentUser.username || '用户').charAt(0).toUpperCase()}
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-black p-3 text-red-600 font-bold text-sm mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black uppercase mb-1 flex items-center">
                  <Fingerprint size={14} className="mr-1" /> 用户名 (不可修改)
                </label>
                <div className="w-full bg-gray-200 border-2 border-black border-dashed p-3 font-bold text-gray-500 cursor-not-allowed">
                  {currentUser.username || '用户'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1 flex items-center">
                  <Mail size={14} className="mr-1" /> 邮箱 (不可修改)
                </label>
                <div className="w-full bg-gray-200 border-2 border-black border-dashed p-3 font-bold text-gray-500 cursor-not-allowed text-sm">
                  {currentUser.email}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1 flex items-center">
                <Edit3 size={14} className="mr-1" /> 头衔 / 称号
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full bg-white border-2 border-black p-3 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                placeholder="例如：高级炼丹师"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1">个性签名 (Bio)</label>
              <textarea
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-white border-2 border-black p-3 font-medium h-24 resize-none focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                placeholder="写点什么..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-green-400 text-black border-2 border-black py-3 font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-2 active:bg-green-500 disabled:opacity-50"
              >
                {success ? <Check size={20} /> : <Save size={20} />}
                {saving ? '保存中...' : (success ? '已保存 (SAVED)' : '保存修改 (SAVE)')}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-400 text-black border-2 border-black py-3 font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-2 active:bg-red-500"
              >
                <LogOut size={20} />
                退出登录
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
