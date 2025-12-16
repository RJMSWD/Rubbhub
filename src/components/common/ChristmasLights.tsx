import React, { useEffect, useState } from 'react';

export const ChristmasLights = () => {
  const [count, setCount] = useState(() =>
    typeof window !== 'undefined' ? Math.max(16, Math.floor(window.innerWidth / 60)) : 24
  );

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      setCount(Math.max(16, Math.floor(window.innerWidth / 60)));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="christmas-lights" aria-hidden="true">
      {Array.from({ length: count }).map((_, idx) => (
        <span key={idx} className="christmas-light-bulb" />
      ))}
    </div>
  );
};
