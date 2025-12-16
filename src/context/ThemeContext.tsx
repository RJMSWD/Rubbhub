import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface ThemeContextValue {
  isChristmas: boolean;
  themeEnabled: boolean;
  enableChristmas: () => void;
  disableChristmas: () => void;
  toggleChristmas: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = 'rubbhub-theme';
const ENABLE_CHRISTMAS_THEME = true; // 改为 false 可整体关闭圣诞模式与开关

const applyBodyClass = (isChristmas: boolean) => {
  if (typeof document !== 'undefined') {
    document.body.classList.toggle('theme-christmas', isChristmas);
  }
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isChristmas, setIsChristmas] = useState<boolean>(() => {
    if (!ENABLE_CHRISTMAS_THEME) return false;
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'christmas';
  });

  useEffect(() => {
    applyBodyClass(isChristmas && ENABLE_CHRISTMAS_THEME);
    if (typeof localStorage !== 'undefined' && ENABLE_CHRISTMAS_THEME) {
      localStorage.setItem(STORAGE_KEY, isChristmas ? 'christmas' : 'default');
    }
  }, [isChristmas]);

  useEffect(() => {
    // 同步初始状态到 body，防止首次渲染闪烁
    applyBodyClass(isChristmas && ENABLE_CHRISTMAS_THEME);
  }, [isChristmas]);

  const value = useMemo(
    () => ({
      isChristmas: ENABLE_CHRISTMAS_THEME ? isChristmas : false,
      themeEnabled: ENABLE_CHRISTMAS_THEME,
      enableChristmas: () => {
        if (!ENABLE_CHRISTMAS_THEME) return;
        setIsChristmas(true);
      },
      disableChristmas: () => {
        if (!ENABLE_CHRISTMAS_THEME) return;
        setIsChristmas(false);
      },
      toggleChristmas: () => {
        if (!ENABLE_CHRISTMAS_THEME) return;
        setIsChristmas((prev) => !prev);
      },
    }),
    [isChristmas]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
};
