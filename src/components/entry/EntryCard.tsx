import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Clock, MessageSquare, Image as ImageIcon, Eye, Leaf, Ban, CandyCane } from 'lucide-react';
import type { Entry } from '../../types';
import { getDomainStyle } from '../../utils/helpers';
import { useAuth, useEntries, useTheme } from '../../context';

interface EntryCardProps {
  entry: Entry;
}

export const EntryCard = ({ entry }: EntryCardProps) => {
  const { currentUser } = useAuth();
  const { toggleLike } = useEntries();
  const { isChristmas } = useTheme();
  const isLiked = currentUser ? (entry.likedBy || []).includes(currentUser.id) : false;
  const [bursts, setBursts] = useState<Array<{ id: number; dx: number; dy: number; color: string }>>([]);

  const spawnBurst = () => {
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
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) return;
    spawnBurst();
    await toggleLike(entry.id, currentUser.id);
  };

  return (
    <Link
      to={`/entry/${entry.id}`}
      className={`group bg-white border-2 border-black p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden block ${
        isChristmas ? 'christmas-entry-card' : ''
      }`}
    >
      {isChristmas && <div className="snow-cap snow-cap-right" aria-hidden="true" />}
      <div className={`absolute top-0 right-0 w-16 h-16 opacity-20 pointer-events-none transform rotate-45 translate-x-8 -translate-y-8 ${
        entry.visibility === 'public' ? 'bg-yellow-400' : 'bg-gray-400'
      }`}></div>

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold bg-amber-50 text-black border border-black px-3 py-1 transform -rotate-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isChristmas ? 'christmas-author-tag' : ''}`}>
            {isChristmas ? (
              <>
                <span className="mr-1">🎅</span>
                {entry.author || '匿名'}
              </>
            ) : (
              <>By {entry.author || '匿名'}</>
            )}
          </span>
          <span className={`px-2 py-0.5 text-[10px] font-bold border border-black text-white inline-flex items-center gap-1 ${
            entry.wasteType === 'recyclable' ? 'bg-emerald-500' : 'bg-rose-500'
          }`}>
            {isChristmas ? (
              entry.wasteType === 'recyclable' ? (
                <>
                  <Leaf size={14} /> 可回收
                </>
              ) : (
                <>
                  <Ban size={14} /> 不可回收
                </>
              )
            ) : (
              entry.wasteType === 'recyclable' ? '可回收' : '不可回收'
            )}
          </span>
          {currentUser?.username === entry.author && (
            <span className="bg-blue-500 text-white text-[10px] font-bold px-1 py-0.5 border border-black">MINE</span>
          )}
        </div>
        <span className={`text-xs font-bold text-gray-500 flex items-center bg-gray-100 px-2 border border-black ${isChristmas ? 'christmas-date-tag' : ''}`}>
          <Clock size={12} className="mr-1" />
          {new Date(entry.timestamp).toLocaleDateString('zh-CN')}
        </span>
      </div>

      <h3 className="text-xl font-black text-black group-hover:text-pink-600 transition-colors mb-3 uppercase italic leading-tight">
        {entry.title}
      </h3>

      <p className="text-black font-medium text-sm mb-6 line-clamp-2 border-l-4 border-gray-300 pl-3">
        {entry.content}
      </p>

      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {entry.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="text-[10px] font-bold bg-gray-100 border border-black px-1.5 py-0.5 text-gray-600">
              #{tag}
            </span>
          ))}
          {entry.tags.length > 3 && <span className="text-[10px] font-bold text-gray-400">+{entry.tags.length - 3}</span>}
        </div>
      )}

      <div className="flex justify-between items-center border-t-2 border-black pt-4">
        <div className="flex gap-2 items-center flex-wrap">
          <span className={`px-3 py-1 text-xs font-black border-2 border-black uppercase ${isChristmas ? 'christmas-visibility' : ''} ${
            entry.visibility === 'public'
              ? 'bg-yellow-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'bg-gray-200 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
          }`}>
            {entry.visibility === 'public' ? '公开' : '私有'}
          </span>
          <span className={`text-xs px-2 py-1 font-bold border-2 border-black ${isChristmas ? 'christmas-domain' : ''} ${getDomainStyle(entry.domain).split(' ')[0]}`}>
            {entry.domain}
          </span>
          {entry.major && (
            <span className="text-xs px-2 py-1 font-bold bg-white border-2 border-black">
              {entry.major}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`relative flex items-center text-xs font-black transition-colors hover:scale-110 ${
              isLiked ? 'text-pink-500' : 'text-black hover:text-pink-500'
            } ${isChristmas ? 'christmas-like-btn' : ''}`}
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
              <CandyCane size={16} strokeWidth={3} className="mr-1" />
            ) : (
              <Heart size={16} strokeWidth={3} className={`mr-1 ${isLiked ? 'fill-pink-500' : ''}`} />
            )}{' '}
            {entry.sympathy}
          </button>
          {entry.media && <ImageIcon size={16} strokeWidth={3} className="text-black" />}
          {entry.comments && entry.comments.length > 0 && (
            <span className="flex items-center text-xs font-black text-black">
              <MessageSquare size={16} strokeWidth={3} className="mr-1" /> {entry.comments.length}
            </span>
          )}
          <span className="flex items-center text-xs font-black text-gray-400">
            <Eye size={14} className="mr-1" /> {entry.views || 0}
          </span>
        </div>
      </div>
    </Link>
  );
};
