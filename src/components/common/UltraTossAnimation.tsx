import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Leaf, Ban, SkipForward } from 'lucide-react';

interface UltraTossAnimationProps {
  wasteType: 'recyclable' | 'unrecyclable';
  onComplete: () => void;
}

export const UltraTossAnimation = ({ wasteType, onComplete }: UltraTossAnimationProps) => {
  const [stage, setStage] = useState<'form' | 'crumpling' | 'stickman_idle' | 'windup' | 'throw' | 'landed' | 'celebrate'>('form');
  const [confetti, setConfetti] = useState<{id: number, left: number, top: number, delay: number, color: string, rotate: number, shape: string}[]>([]);
  const [progress, setProgress] = useState(0);
  const [canSkip, setCanSkip] = useState(false);

  const totalDuration = 3500; // 3.5 seconds total

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 100));
    }, totalDuration / 50);

    // Enable skip after 1 second
    const skipTimer = setTimeout(() => setCanSkip(true), 1000);

    // Stage timings (shortened)
    const t1 = setTimeout(() => setStage('crumpling'), 200);
    const t2 = setTimeout(() => setStage('stickman_idle'), 800);
    const t3 = setTimeout(() => setStage('windup'), 1200);
    const t4 = setTimeout(() => setStage('throw'), 1600);
    const t5 = setTimeout(() => setStage('landed'), 2000);
    const t6 = setTimeout(() => {
      setStage('celebrate');
      const colors = wasteType === 'recyclable'
        ? ['#4ade80', '#22c55e', '#16a34a', '#86efac', '#facc15', '#fef08a']
        : ['#f87171', '#ef4444', '#b91c1c', '#fecaca', '#1f2937', '#e5e7eb'];
      const shapes = ['rounded-none', 'rounded-full', 'clip-triangle'];

      const newConfetti = Array.from({ length: 80 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * -30,
        delay: Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotate: Math.random() * 720 - 360,
        shape: shapes[Math.floor(Math.random() * shapes.length)]
      }));
      setConfetti(newConfetti);
    }, 2200);

    const t7 = setTimeout(onComplete, totalDuration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(skipTimer);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(t7);
    };
  }, [onComplete, wasteType]);

  // Calculate ball trajectory based on waste type
  const getBallAnimation = () => {
    if (wasteType === 'recyclable') {
      // Fly to right bin (green/recyclable)
      return 'flyToRight';
    } else {
      // Fly to left bin (red/unrecyclable)
      return 'flyToLeft';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-amber-50 flex flex-col items-center justify-center overflow-hidden font-sans">
      <style>{`
        @keyframes aggressiveCrumple {
          0% { transform: scale(1) rotate(0deg); opacity: 1; }
          25% { transform: scale(0.9) rotate(-3deg); }
          50% { transform: scale(0.6) rotate(8deg) skewX(15deg); filter: grayscale(0.5); }
          75% { transform: scale(0.3) rotate(-15deg) skewY(25deg); opacity: 0.7; }
          100% { transform: scale(0.0) rotate(540deg); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-8px, 4px); }
          50% { transform: translate(8px, -4px); }
          75% { transform: translate(-4px, -8px); }
        }
        @keyframes flyToRight {
          0% { left: 25%; top: 45%; transform: rotate(0deg) scale(1); }
          40% { left: 45%; top: 15%; transform: rotate(360deg) scale(1.3); }
          70% { left: 58%; top: 35%; transform: rotate(540deg) scale(1.1); }
          100% { left: 62%; top: 58%; transform: rotate(720deg) scale(0.6); opacity: 0.8; }
        }
        @keyframes flyToLeft {
          0% { left: 25%; top: 45%; transform: rotate(0deg) scale(1); }
          40% { left: 35%; top: 15%; transform: rotate(-360deg) scale(1.3); }
          70% { left: 38%; top: 35%; transform: rotate(-540deg) scale(1.1); }
          100% { left: 35%; top: 58%; transform: rotate(-720deg) scale(0.6); opacity: 0.8; }
        }
        @keyframes binShake {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          20% { transform: translateY(-8px) rotate(-3deg); }
          40% { transform: translateY(-4px) rotate(2deg); }
          60% { transform: translateY(-6px) rotate(-2deg); }
          80% { transform: translateY(-2px) rotate(1deg); }
        }
        @keyframes binBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes confettiPop {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes celebrateText {
          0% { transform: translate(-50%, -50%) scale(0) rotate(-10deg); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.2) rotate(5deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes armCelebrate {
          0%, 100% { transform: rotate(-60deg); }
          50% { transform: rotate(-80deg); }
        }
        .clip-triangle { clip-path: polygon(50% 0%, 0% 100%, 100% 100%); }
        .stick-arm { transform-origin: top center; }
      `}</style>

      {/* Skip Button */}
      {canSkip && stage !== 'celebrate' && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 z-[200] flex items-center gap-2 bg-black/80 text-white px-4 py-2 font-bold text-sm border-2 border-white hover:bg-black transition-colors"
        >
          <SkipForward size={16} />
          跳过
        </button>
      )}

      {/* Progress Bar */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-64 z-[150]">
        <div className="h-2 bg-black/20 border border-black">
          <div
            className="h-full bg-black transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stage 1: Form Crumpling */}
      {(stage === 'form' || stage === 'crumpling') && (
        <div className={`w-[90%] max-w-xl h-[60vh] bg-white border-4 border-black p-0 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden relative
          ${stage === 'crumpling' ? 'animate-[aggressiveCrumple_0.6s_ease-in_forwards]' : ''}
        `}>
          {stage === 'crumpling' && (
            <div className="absolute inset-0 flex items-center justify-center z-50 animate-[shake_0.15s_infinite]">
              <span className="text-5xl font-black text-red-600 bg-white border-4 border-black px-4 transform -rotate-12 shadow-lg">CRUNCH!</span>
            </div>
          )}
          <div className="h-14 border-b-4 border-black bg-yellow-300 flex items-center px-4">
            <Trash2 className="mr-3" size={24} /> <span className="font-black italic text-lg">RUBBISH.</span>
          </div>
          <div className="flex-1 p-4 space-y-3 bg-gray-50">
            <div className="h-10 w-3/4 bg-white border-2 border-black"></div>
            <div className="h-24 w-full bg-white border-2 border-black"></div>
            <div className="h-10 w-1/2 bg-black"></div>
          </div>
        </div>
      )}

      {/* Stage 2-6: Stickman & Throw Scene */}
      {(stage === 'stickman_idle' || stage === 'windup' || stage === 'throw' || stage === 'landed' || stage === 'celebrate') && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          {/* Bins */}
          <div className="absolute bottom-16 w-full flex justify-center gap-16 px-10">
            {/* Unrecyclable Bin (Left) */}
            <div className={`w-28 h-36 border-4 border-black bg-red-100 flex flex-col items-center justify-end p-2 transition-all duration-300
              ${wasteType === 'unrecyclable' && stage === 'landed' ? 'animate-[binShake_0.4s_ease-out]' : ''}
              ${wasteType === 'unrecyclable' && stage === 'celebrate' ? 'animate-[binBounce_0.5s_ease-in-out_infinite]' : ''}
            `}>
              <div className="text-red-500 mb-2"><Ban size={36} /></div>
              <div className="w-full h-2 bg-black mb-1"></div>
              <span className="text-[10px] font-black text-red-600">不可回收</span>
            </div>
            {/* Recyclable Bin (Right) */}
            <div className={`w-28 h-36 border-4 border-black bg-emerald-100 flex flex-col items-center justify-end p-2 transition-all duration-300
              ${wasteType === 'recyclable' && stage === 'landed' ? 'animate-[binShake_0.4s_ease-out]' : ''}
              ${wasteType === 'recyclable' && stage === 'celebrate' ? 'animate-[binBounce_0.5s_ease-in-out_infinite]' : ''}
            `}>
              <div className="text-emerald-500 mb-2"><Leaf size={36} /></div>
              <div className="w-full h-2 bg-black mb-1"></div>
              <span className="text-[10px] font-black text-emerald-600">可回收</span>
            </div>
          </div>

          {/* Stickman */}
          <div className="absolute bottom-16 left-[18%] w-20 h-44 flex flex-col items-center z-20">
            {/* Head */}
            <div className="w-9 h-9 rounded-full border-4 border-black bg-white z-20"></div>
            {/* Body */}
            <div className="w-1 h-16 bg-black z-10"></div>
            {/* Legs */}
            <div className="w-1 h-14 bg-black absolute bottom-0 left-1/2 origin-top transform -rotate-15 translate-x-[-2px]"></div>
            <div className="w-1 h-14 bg-black absolute bottom-0 left-1/2 origin-top transform rotate-15 translate-x-[2px]"></div>
            
            {/* Throwing Arm */}
            <div className={`w-1 h-14 bg-black absolute top-10 left-1/2 stick-arm transition-transform ease-in-out
              ${stage === 'stickman_idle' ? 'rotate-[25deg] duration-300' : ''}
              ${stage === 'windup' ? 'rotate-[140deg] duration-400' : ''}
              ${stage === 'throw' || stage === 'landed' ? 'rotate-[-50deg] duration-100' : ''}
              ${stage === 'celebrate' ? 'animate-[armCelebrate_0.3s_ease-in-out_infinite]' : ''}
            `}>
              {/* Paper Ball in Hand */}
              {(stage === 'stickman_idle' || stage === 'windup') && (
                <div className="absolute bottom-[-14px] -left-2.5 w-7 h-7 bg-white border-2 border-black rounded-full shadow flex items-center justify-center">
                  <div className="w-3 h-0.5 bg-black rotate-45"></div>
                  <div className="w-3 h-0.5 bg-black -rotate-45 absolute"></div>
                </div>
              )}
            </div>

            {/* Other Arm (celebrating) */}
            <div className={`w-1 h-14 bg-black absolute top-10 right-1/2 stick-arm transition-transform duration-300
              ${stage === 'celebrate' ? 'rotate-[-120deg]' : 'rotate-[30deg]'}
            `}></div>
          </div>

          {/* Flying Ball */}
          {(stage === 'throw' || stage === 'landed') && (
            <div
              className={`absolute w-7 h-7 bg-white border-2 border-black rounded-full z-30 shadow-md
                animate-[${getBallAnimation()}_0.4s_ease-out_forwards]
              `}
              style={{ 
                left: '25%', 
                top: '45%',
                animation: `${getBallAnimation()} 0.4s ease-out forwards`
              }}
            >
              <div className="absolute inset-0 bg-black/10 rounded-full"></div>
              <div className="w-3 h-0.5 bg-black rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
              <div className="w-3 h-0.5 bg-black -rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            </div>
          )}

          {/* Celebration Text */}
          {stage === 'celebrate' && (
            <div 
              className="absolute top-1/4 left-1/2 text-6xl md:text-7xl font-black text-white z-40"
              style={{ 
                textShadow: '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                animation: 'celebrateText 0.4s ease-out forwards'
              }}
            >
              {wasteType === 'recyclable' ? '♻️ RECYCLED!' : '🗑️ DUMPED!'}
            </div>
          )}
        </div>
      )}

      {/* Confetti */}
      {stage === 'celebrate' && confetti.map((c) => (
        <div
          key={c.id}
          className={`absolute w-3 h-3 z-50 ${c.shape}`}
          style={{
            left: `${c.left}vw`,
            top: `${c.top}vh`,
            backgroundColor: c.color,
            animation: `confettiPop 1.5s linear forwards ${c.delay}s`,
            border: '1px solid black'
          }}
        ></div>
      ))}
    </div>
  );
};
