import React, { useEffect } from 'react';
import { useConfirm } from '../../context/ConfirmContext';

export const ConfirmDialog = () => {
  const { state, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.isOpen) return;
      if (e.key === 'Escape') handleCancel();
      if (e.key === 'Enter') handleConfirm();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isOpen, handleConfirm, handleCancel]);

  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm z-0"
        onClick={handleCancel}
      />
      
      {/* 对话框 */}
      <div className="relative z-10 bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full mx-4 animate-in zoom-in-95 fade-in duration-200">
        <p className="text-center font-bold text-lg mb-6">{state.message}</p>
        
        <div className="flex justify-center gap-4">
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-red-500 text-white font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            确认
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-gray-200 text-black font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
