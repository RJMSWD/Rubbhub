import React, { useState, useRef, useEffect, ChangeEvent, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, X, Leaf, Ban, Upload, Video, Loader2 } from 'lucide-react';
import { useEntries, useAuth, useToast, useTheme } from '../context';
import { UltraTossAnimation } from '../components/common';
import type { Entry, NewEntryState } from '../types';

const buildEntryState = (existingEntry?: Entry | null): NewEntryState => ({
  title: existingEntry?.title || '',
  domain: existingEntry?.domain || '工学',
  major: existingEntry?.major || '',
  wasteType: existingEntry?.wasteType || 'recyclable',
  wasteSubType: existingEntry?.wasteSubType || 'general',
  cause: existingEntry?.cause || '',
  content: existingEntry?.content || '',
  visibility: existingEntry?.visibility || 'public',
  media: existingEntry?.media || null,
  tags: existingEntry?.tags?.join(' ') || ''
});

export const CreatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentUser, loading: authLoading } = useAuth();
  const { isChristmas } = useTheme();
  const { addEntry, getEntryById, fetchEntryById, updateEntry, uploadMedia } = useEntries();
  const { showToast } = useToast();

  const cachedEntry = id ? getEntryById(id) : null;
  const isEditing = !!id;

  useEffect(() => {
    document.title = isEditing ? '编辑垃圾 - Rubbish Archive' : '扔垃圾 - Rubbish Archive';
  }, [isEditing]);

  const [newEntry, setNewEntry] = useState<NewEntryState>(buildEntryState(cachedEntry));
  const [showAnimation, setShowAnimation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingEntry, setLoadingEntry] = useState(isEditing && !cachedEntry);

  useEffect(() => {
    if (!id) return;
    const existing = getEntryById(id);
    if (existing) {
      setNewEntry(buildEntryState(existing));
      setLoadingEntry(false);
      return;
    }
    setLoadingEntry(true);
    fetchEntryById(id).then((entryData) => {
      if (entryData) {
        setNewEntry(buildEntryState(entryData));
      } else {
        showToast('找不到该帖子，无法编辑', 'error');
        navigate('/', { replace: true });
      }
    }).finally(() => setLoadingEntry(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/auth', { replace: true });
    }
  }, [authLoading, currentUser, navigate]);

  if (authLoading || (isEditing && loadingEntry)) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-xl font-black">加载中...</div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const handleMediaUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > 3) {
      showToast('最多上传3张图片', 'error');
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const validImages = files.filter(f => f.type.startsWith('image/'));
    if (validImages.length !== files.length) {
      showToast('请只上传图片', 'error');
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    const urls: string[] = [];
    const failed: string[] = [];
    for (const file of validImages) {
      const { url, error } = await uploadMedia(file);
      if (url) {
        urls.push(url);
      } else {
        failed.push(file.name);
        if (error) {
          console.warn('Image upload failed', file.name, error);
        }
      }
    }
    setUploading(false);

    if (failed.length > 0) {
      showToast(`以下图片上传失败：${failed.join('，')}`, 'error');
    }

    if (urls.length > 0) {
      setNewEntry({
        ...newEntry,
        media: { type: 'image', items: urls }
      });
    } else {
      showToast('上传失败，请重试', 'error');
    }
  };

  const handleDeposit = () => {
    if (!newEntry.title) {
      showToast('请至少写个标题吧', 'error');
      return;
    }
    setShowAnimation(true);
  };

  const handleAnimationComplete = useCallback(async () => {
    setSubmitting(true);
    let result;
    if (isEditing && id) {
      result = await updateEntry(id, newEntry);
    } else {
      result = await addEntry(newEntry);
    }
    setSubmitting(false);
    
    if (result.success) {
      navigate('/');
    } else {
      setShowAnimation(false);
      showToast(result.error || '操作失败，请重试', 'error');
    }
  }, [isEditing, id, newEntry, updateEntry, addEntry, navigate, showToast]);

  if (showAnimation) {
    return <UltraTossAnimation wasteType={newEntry.wasteType} onComplete={handleAnimationComplete} />;
  }

  return (
    <div className={`min-h-screen bg-amber-50 font-sans p-6 ${isChristmas ? 'christmas-page' : ''}`}>
      <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-200">
        <button
          onClick={() => navigate('/')}
          className="group flex items-center font-black text-black mb-6 hover:-translate-x-1 transition-transform"
        >
          <div className="bg-white border-2 border-black p-2 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mr-3 transition-all">
            <X size={20} />
          </div>
          {isEditing ? '修改 RUBBISH' : '算了，不扔了'}
        </button>

        <div className={`bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative transition-colors duration-500 ${
          newEntry.wasteType === 'unrecyclable' ? 'border-red-600 shadow-red-900' : ''
        } ${isChristmas ? 'christmas-panel christmas-confetti' : ''}`}>
          <h2 className="text-3xl font-black mb-8 flex items-center uppercase italic transform -rotate-1">
            <Trash2 className="mr-4 text-black w-10 h-10" strokeWidth={3} />
            <span className="bg-yellow-300 px-2">{isEditing ? '修改 RUBBISH' : '扔掉一份 RUBBISH'}</span>
          </h2>

          <div className="space-y-6">
            {/* Waste Type Selector */}
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => setNewEntry({...newEntry, wasteType: 'recyclable'})}
                className={`cursor-pointer border-2 p-4 text-center transition-all ${
                  newEntry.wasteType === 'recyclable'
                    ? 'bg-emerald-100 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                <Leaf className={`mx-auto mb-2 ${newEntry.wasteType === 'recyclable' ? 'text-emerald-600' : ''}`} />
                <div className="font-black text-sm uppercase">可回收垃圾</div>
                <div className="text-xs mt-1">对他人有参考价值的失败</div>
              </div>
              <div
                onClick={() => setNewEntry({...newEntry, wasteType: 'unrecyclable'})}
                className={`cursor-pointer border-2 p-4 text-center transition-all ${
                  newEntry.wasteType === 'unrecyclable'
                    ? 'bg-red-100 border-red-600 text-red-600 shadow-[4px_4px_0px_0px_rgba(153,27,27,1)]'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                <Ban className="mx-auto mb-2" />
                <div className="font-black text-sm uppercase">不可回收垃圾</div>
                <div className="text-xs mt-1">纯粹的情绪宣泄/无意义代码</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-black uppercase mb-2">Rubbish 标题</label>
              <input
                type="text"
                className="w-full bg-gray-50 border-2 border-black p-4 text-lg font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-white transition-all placeholder:font-normal"
                placeholder={newEntry.wasteType === 'recyclable' ? "例如：那个让我通宵三天的 Bug" : "例如：隔壁组居然一个月能发1000？！"}
                value={newEntry.title}
                onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-black uppercase mb-2">学科门类</label>
                <select
                  className="w-full bg-white border-2 border-black p-4 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                  value={newEntry.domain}
                  onChange={(e) => setNewEntry({...newEntry, domain: e.target.value})}
                >
                  <option>理学</option>
                  <option>工学</option>
                  <option>医学</option>
                  <option>农学</option>
                  <option>文学</option>
                  <option>历史学</option>
                  <option>哲学</option>
                  <option>经济学</option>
                  <option>管理学</option>
                  <option>法学</option>
                  <option>教育学</option>
                  <option>艺术学</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-black uppercase mb-2">具体专业</label>
                <input
                  type="text"
                  className="w-full bg-white border-2 border-black p-4 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:font-normal"
                  placeholder="例如：计算机科学"
                  value={newEntry.major}
                  onChange={(e) => setNewEntry({...newEntry, major: e.target.value})}
                />
              </div>
            </div>

            {newEntry.wasteType === 'recyclable' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-black uppercase mb-2 text-emerald-700">致废原因 (Cause of Failure)</label>
                <input
                  type="text"
                  className="w-full bg-emerald-50 border-2 border-black p-4 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-white transition-all placeholder:font-normal placeholder:text-emerald-700/50"
                  placeholder="例如：OOM / 导师说没创新 / 试剂污染 / 我怎么知道"
                  value={newEntry.cause}
                  onChange={(e) => setNewEntry({...newEntry, cause: e.target.value})}
                />
              </div>
            )}

            <div>
              <label className={`block text-sm font-black uppercase mb-2 ${newEntry.wasteType === 'unrecyclable' ? 'text-red-600' : 'text-emerald-700'}`}>
                {newEntry.wasteType === 'recyclable' ? '垃圾分解 (Trash Decomposition)' : '吐槽内容 (Rant)'}
              </label>
              <textarea
                className={`w-full border-2 border-black p-4 font-medium h-40 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-white transition-all resize-none ${
                  newEntry.wasteType === 'recyclable' ? 'bg-emerald-50 placeholder:text-emerald-700/50' : 'bg-red-50 placeholder:text-red-700/50'
                }`}
                placeholder={newEntry.wasteType === 'recyclable' ? "为了验证...我进行了...结果..." : "尽情发泄你的怒火，这里没人会评判你..."}
                value={newEntry.content}
                onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-black uppercase mb-2">上传惨状 (图片)</label>
              <div className="border-2 border-black border-dashed bg-gray-100 p-6 text-center cursor-not-allowed">
                <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                <span className="font-bold text-gray-500">图片/视频功能暂未上线</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-blue-100 p-4 border-2 border-black">
              <div>
                <span className="block font-black text-sm uppercase">Rubbish 权限</span>
                <span className="text-xs font-bold text-gray-600">公开供人回收，私有仅作填埋。</span>
              </div>
              <div className="flex bg-white border-2 border-black p-1 gap-1">
                <button
                  onClick={() => setNewEntry({...newEntry, visibility: 'public'})}
                  className={`px-4 py-1 text-sm font-black border-2 transition-all ${newEntry.visibility === 'public' ? 'bg-yellow-300 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent border-transparent text-gray-400'}`}
                >
                  公开
                </button>
                <button
                  onClick={() => setNewEntry({...newEntry, visibility: 'private'})}
                  className={`px-4 py-1 text-sm font-black border-2 transition-all ${newEntry.visibility === 'private' ? 'bg-gray-300 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent border-transparent text-gray-400'}`}
                >
                  私有
                </button>
              </div>
            </div>

            <button
              onClick={handleDeposit}
              disabled={submitting}
              className="w-full bg-black text-white font-black text-xl py-4 border-2 border-black shadow-[6px_6px_0px_0px_rgba(255,200,0,1)] hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_rgba(255,200,0,1)] transition-all active:bg-gray-900 disabled:opacity-50"
            >
              {isEditing ? '保存修改 (UPDATE)' : '确认扔掉 (DEPOSIT)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
