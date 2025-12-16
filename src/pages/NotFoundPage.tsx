import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Home } from 'lucide-react';

export const NotFoundPage = () => {
  useEffect(() => {
    document.title = '404 - Rubbish Archive';
  }, []);

  return (
    <div className="min-h-screen bg-amber-50 font-sans flex items-center justify-center p-6">
      <div className="text-center">
        <div className="bg-white border-4 border-black p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-md">
          <div className="mb-6">
            <Trash2 size={80} className="mx-auto text-black animate-bounce" />
          </div>
          
          <h1 className="text-6xl font-black text-black mb-4 uppercase italic">404</h1>
          
          <p className="text-xl font-black text-black mb-2">PAGE NOT FOUND</p>
          <p className="text-gray-600 font-bold mb-8">
            这份垃圾好像被人捡走了...
          </p>
          
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-black text-white font-black px-8 py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(253,224,71,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(253,224,71,1)] transition-all"
          >
            <Home size={20} />
            回到垃圾堆
          </Link>
        </div>
      </div>
    </div>
  );
};
