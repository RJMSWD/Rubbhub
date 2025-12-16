import React, { useState, useMemo, useEffect } from 'react';
import { Trash2, Heart, TrendingUp, Leaf, Ban, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Layout } from '../components/layout';
import { EntryCard } from '../components/entry';
import { useEntries, useAuth, useTheme } from '../context';
import type { Entry } from '../types';

export const HomePage = () => {
  useEffect(() => {
    document.title = 'Rubbhub';
  }, []);
  const { isChristmas } = useTheme();
  const { entries, loading: entriesLoading, error, refreshEntries, hasMore, loadMore, total } = useEntries();
  const [loadingMore, setLoadingMore] = useState(false);
  const { currentUser, loading: authLoading } = useAuth();
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'recyclable' | 'unrecyclable'>('all');
  const SORT_KEY = 'home-sort-mode';
  const [sortMode, setSortMode] = useState<'newest' | 'hottest'>(() => {
    const stored = localStorage.getItem(SORT_KEY);
    return stored === 'hottest' ? 'hottest' : 'newest';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [hotSortLocked, setHotSortLocked] = useState(false);
  const [lockedOrder, setLockedOrder] = useState<string[]>([]);

  const loading = entriesLoading || authLoading;

  const resetHotLock = () => {
    setHotSortLocked(false);
    setLockedOrder([]);
  };

  const sortBySympathy = (a: Entry, b: Entry) => {
    if (b.sympathy !== a.sympathy) return b.sympathy - a.sympathy;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  };

  const updateSortMode = (mode: 'newest' | 'hottest') => {
    if (mode !== sortMode) {
      resetHotLock();
    }
    setSortMode(mode);
    localStorage.setItem(SORT_KEY, mode);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    resetHotLock();
  };

  const handleFilterChange = (mode: typeof filterMode) => {
    setFilterMode(mode);
    resetHotLock();
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    resetHotLock();
    await loadMore();
    setLoadingMore(false);
  };

  const handleRefresh = async () => {
    resetHotLock();
    await refreshEntries();
  };

  const baseFilteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = entry.title.toLowerCase().includes(query);
        const matchesContent = entry.content.toLowerCase().includes(query);
        const matchesAuthor = entry.author.toLowerCase().includes(query);
        const matchesTags = (entry.tags || []).some(tag => tag.toLowerCase().includes(query));

        if (!matchesTitle && !matchesContent && !matchesAuthor && !matchesTags) {
          return false;
        }
      }

      if (filterMode === 'mine') {
        return currentUser && entry.author === currentUser.username;
      }
      if (entry.visibility !== 'public') return false;

      if (filterMode === 'recyclable') {
        return entry.wasteType === 'recyclable';
      }
      if (filterMode === 'unrecyclable') {
        return entry.wasteType === 'unrecyclable';
      }
      return true;
    });
  }, [entries, filterMode, searchQuery, currentUser]);

  useEffect(() => {
    if (sortMode === 'hottest' && !hotSortLocked) {
      const sorted = [...baseFilteredEntries].sort(sortBySympathy);
      setLockedOrder(sorted.map(e => e.id));
      setHotSortLocked(true);
    }
    if (sortMode === 'newest' && (hotSortLocked || lockedOrder.length > 0)) {
      resetHotLock();
    }
  }, [sortMode, hotSortLocked, baseFilteredEntries, lockedOrder.length]);

  const sortedEntries = useMemo(() => {
    if (sortMode === 'newest') {
      return [...baseFilteredEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    if (hotSortLocked && lockedOrder.length > 0) {
      const orderMap = new Map<string, number>();
      lockedOrder.forEach((id, idx) => orderMap.set(id, idx));
      return [...baseFilteredEntries].sort((a, b) => {
        const ai = orderMap.has(a.id) ? orderMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
        const bi = orderMap.has(b.id) ? orderMap.get(b.id)! : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        if (orderMap.has(a.id) && orderMap.has(b.id)) return 0;
        if (orderMap.has(a.id)) return -1;
        if (orderMap.has(b.id)) return 1;
        return sortBySympathy(a, b);
      });
    }

    return [...baseFilteredEntries].sort(sortBySympathy);
  }, [baseFilteredEntries, sortMode, hotSortLocked, lockedOrder]);

  const totalRubbish = entries.filter(e => e.visibility === 'public').length;
  const totalSympathy = entries.reduce((acc, curr) => acc + (curr.visibility === 'public' ? curr.sympathy : 0), 0);
  const totalRecyclable = entries.filter(e => e.visibility === 'public' && e.wasteType === 'recyclable').length;

  if (loading) {
    return (
      <Layout onSearch={handleSearch}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Trash2 size={48} className="mx-auto mb-4 text-black animate-spin" />
            <p className="text-xl font-black">加载中...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout onSearch={handleSearch}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
            <p className="text-xl font-black mb-2">加载失败</p>
            <p className="text-gray-600 font-bold mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 bg-black text-white font-black px-6 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(253,224,71,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(253,224,71,1)] transition-all"
            >
              <RefreshCw size={16} />
              重试
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout onSearch={setSearchQuery}>
      <div className="animate-in fade-in duration-500">
        {/* Dashboard Stats */}
        <div className={`bg-gradient-to-r from-amber-50 via-white to-amber-50 text-black p-4 mb-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-wrap justify-between items-center gap-4 relative overflow-hidden ${isChristmas ? 'christmas-stats' : ''}`}>
          {isChristmas && <div className="snow-cap snow-cap-right" aria-hidden="true" />}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-100/40 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex items-center gap-6 relative z-10">
            <div className="flex items-center">
              <Trash2 className="text-yellow-600 mr-2" />
              <div>
                <div className="text-xs text-gray-500 font-bold uppercase">Rub总数</div>
                <div className="text-2xl font-black leading-none">{totalRubbish}</div>
              </div>
            </div>
            <div className="w-px h-8 bg-black/10"></div>
            <div className="flex items-center">
              <Heart className="text-pink-500 mr-2" />
              <div>
                <div className="text-xs text-gray-500 font-bold uppercase">收获共鸣</div>
                <div className="text-2xl font-black leading-none">{totalSympathy}</div>
              </div>
            </div>
            <div className="w-px h-8 bg-black/10"></div>
            <div className="flex items-center">
              <TrendingUp className="text-emerald-600 mr-2" />
              <div>
                <div className="text-xs text-gray-500 font-bold uppercase">回收率</div>
                <div className="text-2xl font-black leading-none">{totalRubbish > 0 ? Math.round((totalRecyclable / totalRubbish) * 100) : 0}%</div>
              </div>
            </div>
          </div>
          <div className="text-xs font-mono text-gray-500 relative z-10 hidden sm:block">
            SYSTEM STATUS: OVERLOADED
          </div>
        </div>

        {/* Filters Row */}
        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 pb-4 border-b-2 border-black/10 ${isChristmas ? 'christmas-filters' : ''}`}>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-6 py-2 font-black border-2 border-black text-sm uppercase tracking-wide transition-all ${isChristmas ? 'christmas-filter-btn' : ''} ${
                filterMode === 'all'
                  ? `bg-amber-200 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1 ${
                      isChristmas ? 'christmas-filter-active' : ''
                    }`
                  : 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
              }`}
            >
              全部 (All)
            </button>

            {currentUser && (
              <button
                onClick={() => handleFilterChange('mine')}
                className={`px-6 py-2 font-black border-2 border-black text-sm uppercase tracking-wide transition-all ${isChristmas ? 'christmas-filter-btn' : ''} ${
                  filterMode === 'mine'
                    ? `bg-amber-200 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1 ${
                        isChristmas ? 'christmas-filter-active mine' : ''
                      }`
                    : 'bg-white text-blue-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                }`}
              >
                我的 (Mine)
              </button>
            )}

            <div className="w-px h-8 bg-black/20 hidden md:block"></div>

            <button
              onClick={() => handleFilterChange('recyclable')}
              className={`px-6 py-2 font-black border-2 border-black text-sm uppercase tracking-wide transition-all flex items-center ${isChristmas ? 'christmas-filter-btn' : ''} ${
                filterMode === 'recyclable'
                  ? `bg-emerald-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1 ${
                      isChristmas ? 'christmas-filter-active recyclable' : ''
                    }`
                  : 'bg-white text-emerald-600 shadow-[2px_2px_0px_0px_rgba(167,243,208,1)] hover:-translate-y-1'
              }`}
            >
              <Leaf size={16} className="mr-2" /> 可回收
            </button>

            <button
              onClick={() => handleFilterChange('unrecyclable')}
              className={`px-6 py-2 font-black border-2 border-black text-sm uppercase tracking-wide transition-all flex items-center ${isChristmas ? 'christmas-filter-btn' : ''} ${
                filterMode === 'unrecyclable'
                  ? `bg-red-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1 ${
                      isChristmas ? 'christmas-filter-active unrecyclable' : ''
                    }`
                  : 'bg-white text-red-600 shadow-[2px_2px_0px_0px_rgba(254,202,202,1)] hover:-translate-y-1'
              }`}
            >
              <Ban size={16} className="mr-2" /> 不可回收
            </button>
          </div>

          <div className={`flex bg-white border-2 border-black p-1 gap-1 ${isChristmas ? 'christmas-sort' : ''}`}>
            <button
              onClick={() => updateSortMode('newest')}
              className={`px-3 py-1 text-xs font-bold transition-all ${
                sortMode === 'newest'
                  ? `bg-gray-200 text-black ${isChristmas ? 'active' : ''}`
                  : 'text-gray-400 hover:text-black'
              }`}
            >
              最新 (NEW)
            </button>
            <button
              onClick={() => updateSortMode('hottest')}
              className={`px-3 py-1 text-xs font-bold transition-all ${
                sortMode === 'hottest'
                  ? `bg-pink-100 text-pink-600 ${isChristmas ? 'active' : ''}`
                  : 'text-gray-400 hover:text-pink-600'
              }`}
            >
              最惨 (HOT)
            </button>
          </div>
        </div>

        <div className="grid gap-6">
          {sortedEntries.length === 0 ? (
            <div className="text-center py-20 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <Trash2 size={64} className="mx-auto mb-4 text-black animate-bounce" />
              <p className="text-xl font-black text-black">这里空空如也。</p>
              <p className="text-gray-500 font-bold">
                {searchQuery ? `找不到关于 "${searchQuery}" 的垃圾` : "要么是你没扔过，要么是世界太完美。"}
              </p>
            </div>
          ) : (
            sortedEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))
          )}
        </div>

        {/* 加载更多 */}
        {hasMore && !searchQuery && filterMode === 'all' && (
          <div className="text-center mt-8">
            <button
              onClick={async () => {
                await handleLoadMore();
              }}
              disabled={loadingMore}
              className={`inline-flex items-center gap-2 bg-white text-black font-black px-8 py-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 ${
                isChristmas ? 'christmas-load-more' : ''
              }`}
            >
              {loadingMore ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  加载中...
                </>
              ) : (
                <>
                  <RefreshCw size={20} />
                  加载更多 ({entries.length}/{total})
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};
