import React from 'react';
import { TopStats } from './TopStats';

interface HeaderProps {
  stats: Array<{ label: string; value: string; }>;
  onPageChange: (page: 'feed' | 'daily-report') => void;
}

export const Header: React.FC<HeaderProps> = ({ stats, onPageChange }) => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TopStats stats={stats} onPageChange={onPageChange} />
      </div>
    </header>
  );
};