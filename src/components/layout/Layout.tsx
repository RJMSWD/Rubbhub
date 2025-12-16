import React, { ReactNode } from 'react';
import { Header } from './Header';
import { SnowCanvas } from '../common';
import { useTheme } from '../../context';

interface LayoutProps {
  children: ReactNode;
  onSearch?: (query: string) => void;
}

export const Layout = ({ children, onSearch }: LayoutProps) => {
  const { isChristmas } = useTheme();

  return (
    <div
      className={`min-h-screen bg-amber-50 font-sans selection:bg-pink-300 ${
        isChristmas ? 'christmas-layout relative' : ''
      }`}
    >
      {isChristmas && <SnowCanvas enabled={isChristmas} />}
      <Header onSearch={onSearch} />
      <main className="max-w-6xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  );
};
