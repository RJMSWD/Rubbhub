import React from 'react';
import { Gift, Snowflake } from 'lucide-react';
import { useTheme } from '../../context';

export const ThemeToggle = () => {
  const { isChristmas, toggleChristmas, themeEnabled } = useTheme();

  if (!themeEnabled) return null;

  return (
    <button
      type="button"
      onClick={toggleChristmas}
      className={`christmas-toggle btn-press px-3 py-2 text-xs font-black uppercase tracking-wide flex items-center gap-2 transition-all ${
        isChristmas ? 'active' : ''
      }`}
      title={isChristmas ? '关闭圣诞模式' : '开启圣诞模式'}
    >
      {isChristmas ? <Snowflake size={16} /> : <Gift size={16} />}
      {isChristmas ? '圣诞模式' : '默认模式'}
    </button>
  );
};
