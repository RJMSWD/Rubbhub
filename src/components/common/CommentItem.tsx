import React, { useState } from 'react';
import { ThumbsUp, CornerDownRight, Trash2 } from 'lucide-react';
import type { Comment } from '../../types';
import type { UserProfile } from '../../context';

interface CommentItemProps {
  comment: Comment;
  currentUser: UserProfile | null;
  onLike: (id: string) => void;
  onReply: (parentId: string, content: string) => void;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  isReply?: boolean;
}

export const CommentItem = ({ comment, currentUser, onLike, onReply, isAdmin, onDelete, isReply = false }: CommentItemProps) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const liked = currentUser ? (comment.likedBy || []).includes(currentUser.id) : false;

  const handleReplySubmit = () => {
    if (!replyContent.trim()) return;
    onReply(comment.id, replyContent);
    setReplyContent('');
    setIsReplying(false);
  };

  return (
    <div className={`${isReply ? 'ml-8 mt-2' : 'mt-4'}`}>
      <div className={`bg-white border border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isReply ? 'bg-gray-50' : ''}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm bg-black text-white px-2 py-0.5 transform -rotate-1">{comment.author}</span>
            {comment.replyTo && (
              <span className="text-xs text-gray-500">
                回复 <span className="font-bold text-pink-600">@{comment.replyTo}</span>
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-gray-500">{new Date(comment.timestamp).toLocaleDateString()}</span>
        </div>
        <p className="font-medium text-sm mb-3">{comment.content}</p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-black transition-colors"
          >
            <CornerDownRight size={12} />
            <span>回复</span>
          </button>
          <button
            onClick={() => onLike(comment.id)}
            disabled={!currentUser}
            className={`flex items-center gap-1.5 text-xs font-bold transition-colors border border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none ${
              liked ? 'bg-pink-100 text-pink-600' : 'bg-white text-gray-500 hover:text-black'
            }`}
          >
            <ThumbsUp size={12} className={liked ? 'fill-current' : ''} />
            <span>{comment.likes || 0}</span>
          </button>
          {onDelete && (isAdmin || currentUser?.username === comment.author) && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 transition-colors border border-red-500 px-2 py-1 bg-red-50 hover:bg-red-100"
            >
              <Trash2 size={12} />
              <span>删除</span>
            </button>
          )}
        </div>

        {isReplying && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2">
            {currentUser ? (
              <>
                <textarea
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  className="w-full bg-gray-100 border border-black p-2 text-sm mb-2 focus:outline-none focus:bg-white"
                  placeholder={`回复 @${comment.author}...`}
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsReplying(false)} className="text-xs font-bold text-gray-500 hover:underline">取消</button>
                  <button onClick={handleReplySubmit} className="bg-black text-white text-xs font-bold px-3 py-1">发送</button>
                </div>
              </>
            ) : (
              <div className="text-xs font-bold text-red-500">请登录后回复</div>
            )}
          </div>
        )}
      </div>

      {/* 回复列表（不再递归嵌套，只显示1层） */}
      {!isReply && comment.replies && comment.replies.length > 0 && (
        <div className="border-l-2 border-gray-300 pl-2">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              onLike={onLike}
              onReply={onReply}
              isAdmin={isAdmin}
              onDelete={onDelete}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};
