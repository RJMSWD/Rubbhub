import React, { useEffect, useRef } from 'react';

interface SnowCanvasProps {
  enabled?: boolean;
}

export const SnowCanvas = ({ enabled = true }: SnowCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    type Particle = {
      x: number;
      y: number;
      size: number;
      speed: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
      type: 'square' | 'emoji';
      emoji?: string;
    };

    const particles: Particle[] = [];
    const emojis = ['🎅', '🔔', '🎁', '🍪', '🎄'];
    const particleCount = 70;

    // 离屏缓存，减少每帧填充/文本绘制
    const squareCache = new Map<string, HTMLCanvasElement>();
    const emojiCache = new Map<string, HTMLCanvasElement>();

    const getSquareSprite = (size: number, color: string) => {
      const key = `${size}-${color}`;
      const cached = squareCache.get(key);
      if (cached) return cached;
      const sprite = document.createElement('canvas');
      const s = Math.ceil(size + 4);
      sprite.width = s * 2;
      sprite.height = s * 2;
      const ctx2 = sprite.getContext('2d');
      if (ctx2) {
        ctx2.translate(sprite.width / 2, sprite.height / 2);
        ctx2.fillStyle = color;
        ctx2.fillRect(-size / 2, -size / 2, size, size);
        ctx2.strokeStyle = '#1A1A1A';
        ctx2.lineWidth = 2;
        ctx2.strokeRect(-size / 2, -size / 2, size, size);
      }
      squareCache.set(key, sprite);
      return sprite;
    };

    const getEmojiSprite = (emoji: string, size: number) => {
      const key = `${emoji}-${size}`;
      const cached = emojiCache.get(key);
      if (cached) return cached;
      const sprite = document.createElement('canvas');
      const s = Math.ceil(size * 2 + 8);
      sprite.width = s;
      sprite.height = s;
      const ctx2 = sprite.getContext('2d');
      if (ctx2) {
        ctx2.font = `${size + 6}px serif`;
        ctx2.textAlign = 'center';
        ctx2.textBaseline = 'middle';
        ctx2.fillText(emoji, s / 2, s / 2);
      }
      emojiCache.set(key, sprite);
      return sprite;
    };

    const resetParticle = (p: Particle) => {
      p.x = Math.random() * width;
      p.y = Math.random() * -height;
      p.size = Math.random() * 8 + 4;
      p.speed = Math.random() * 2 + 1;
      const useEmoji = Math.random() > 0.4;
      p.type = useEmoji ? 'emoji' : 'square';
      if (useEmoji) {
        p.emoji = emojis[Math.floor(Math.random() * emojis.length)];
        p.color = '#ffffff';
      } else {
        p.color = Math.random() > 0.5 ? '#D90429' : '#2B9348';
        if (Math.random() > 0.8) p.color = '#1A1A1A';
      }
      p.rotation = 0;
      p.rotationSpeed = Math.random() * 0.12 - 0.06;
    };

    for (let i = 0; i < particleCount; i++) {
      const p = {
        x: 0,
        y: 0,
        size: 0,
        speed: 0,
        color: '#fff',
        rotation: 0,
        rotationSpeed: 0,
        type: 'square' as const,
        emoji: undefined as string | undefined,
      };
      resetParticle(p);
      particles.push(p);
    }

    let animationId = 0;
    let lastTime = performance.now();
    let paused = false;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const draw = (now: number) => {
      if (paused) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const speedFactor = dt * 60; // 平滑掉帧保持速度一致

      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.y += p.speed * speedFactor;
        p.rotation += p.rotationSpeed * speedFactor;
        if (p.y > height) {
          resetParticle(p);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.type === 'emoji' && p.emoji) {
          const sprite = getEmojiSprite(p.emoji, p.size);
          const drawSize = p.size * 2;
          ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        } else {
          const sprite = getSquareSprite(p.size, p.color);
          const drawSize = p.size + 4;
          ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        }
        ctx.restore();
      });
      animationId = requestAnimationFrame(draw);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        paused = true;
        cancelAnimationFrame(animationId);
      } else {
        paused = false;
        lastTime = performance.now();
        animationId = requestAnimationFrame(draw);
      }
    };

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);
    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return <canvas ref={canvasRef} className="snow-canvas" aria-hidden="true" />;
};
