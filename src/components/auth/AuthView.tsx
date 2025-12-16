import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, KeyRound, AlertTriangle, Ticket, Mail, User } from 'lucide-react';
import { useAuth, useTheme } from '../../context';

export const AuthView = () => {
  useEffect(() => {
    document.title = '登录/注册 - Rubbish Archive';
  }, []);
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { isChristmas } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError("邮箱和密码不能为空");
      return;
    }

    if (isRegister && !username) {
      setError("用户名不能为空");
      return;
    }

    if (isRegister && !inviteCode) {
      setError("请输入邀请码");
      return;
    }

    setLoading(true);

    if (isRegister) {
      const { error: regError } = await register(email, password, username, inviteCode);
      if (regError) {
        setError(regError);
      } else {
        setSuccess('注册成功！请登录。');
        setIsRegister(false);
        setEmail('');
        setPassword('');
        setUsername('');
        setInviteCode('');
      }
    } else {
      const { error: loginError } = await login(email, password);
      if (loginError) {
        setError(loginError === 'Invalid login credentials' ? '邮箱或密码错误' : loginError);
      } else {
        navigate('/');
      }
    }

    setLoading(false);
  };

  return (
    <div className={`min-h-screen bg-amber-50 font-sans p-6 ${isChristmas ? 'christmas-page' : ''}`}>
      <div className="max-w-md mx-auto animate-in fade-in zoom-in-95 duration-300 mt-10">
        <div className={`bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative ${isChristmas ? 'christmas-panel' : ''}`}>
          <button onClick={() => navigate('/')} className="absolute top-4 right-4 hover:scale-110 transition-transform">
            <X size={24} strokeWidth={3} />
          </button>

          <div className="text-center mb-8">
            <div className="inline-block bg-black text-yellow-300 p-3 mb-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(253,224,71,1)]">
              <KeyRound size={32} />
            </div>
            <h2 className="text-3xl font-black uppercase italic">{isRegister ? '加入组织' : '身份验证'}</h2>
            <p className="font-bold text-gray-500 text-xs mt-2">ACCESS CONTROL FOR RUBBISH ARCHIVE</p>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="bg-red-100 border-2 border-black p-3 text-red-600 font-bold text-sm flex items-center animate-pulse">
                <AlertTriangle size={16} className="mr-2" />
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 border-2 border-black p-3 text-green-600 font-bold text-sm">
                {success}
              </div>
            )}

            <div>
              <label className="block text-sm font-black uppercase mb-2 flex items-center">
                <Mail size={14} className="mr-1" /> 邮箱
              </label>
              <input
                type="email"
                className="w-full bg-gray-50 border-2 border-black p-3 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            {isRegister && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-black uppercase mb-2 flex items-center">
                  <User size={14} className="mr-1" /> 用户名
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border-2 border-black p-3 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Unique Username"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-black uppercase mb-2">密码</label>
              <input
                type="password"
                className="w-full bg-gray-50 border-2 border-black p-3 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isRegister ? "至少 6 个字符" : ""}
              />
            </div>

            {isRegister && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-black uppercase mb-2 flex items-center">
                  <Ticket size={16} className="mr-1" />
                  内测邀请码 (Invite Code)
                </label>
                <input
                  type="text"
                  placeholder="请输入邀请码..."
                  className="w-full bg-amber-50 border-2 border-black p-3 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:font-normal placeholder:text-gray-400"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                />
                <p className="text-xs font-bold text-gray-500 mt-1">* 目前仅限持有邀请码的科研废料生产者注册</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-black text-white font-black text-lg py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all active:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : (isRegister ? '立即注册 (SIGN UP)' : '登录 (LOGIN)')}
            </button>

            <div className="text-center">
              <button
                onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}
                className="text-sm font-bold underline decoration-2 underline-offset-4 hover:text-pink-600 hover:decoration-pink-600 transition-colors"
              >
                {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
