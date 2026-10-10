import React from 'react';
import {
  Home,
  Timer,
  FileCheck2,
  BookOpenCheck,
  Sparkles,
  Heart,
  Settings,
} from 'lucide-react';
import { ViewId } from '../types';

interface BottomNavProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  dueMistakesCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onNavigate,
  dueMistakesCount,
}) => {
  const items = [
    { id: 'home' as ViewId, label: 'خانه', icon: Home },
    { id: 'timer' as ViewId, label: 'تایمر', icon: Timer },
    { id: 'exams' as ViewId, label: 'آزمون‌ها', icon: FileCheck2 },
    {
      id: 'mistakes' as ViewId,
      label: 'لایتنر',
      icon: BookOpenCheck,
      badge: dueMistakesCount,
    },
    { id: 'couple' as ViewId, label: 'دونفره', icon: Heart },
    { id: 'ai' as ViewId, label: 'مشاور', icon: Sparkles },
    { id: 'settings' as ViewId, label: 'تنظیمات', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B132B]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-1 py-1.5 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.6)]">
      <div className="grid grid-cols-7 w-full max-w-lg mx-auto items-center">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = activeView === it.id;

          return (
            <button
              key={it.id}
              onClick={() => onNavigate(it.id)}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all relative cursor-pointer w-full text-center ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/80 dark:bg-blue-950/60'
                  : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-blue-600 dark:text-blue-400' : ''
                  }`}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                {!!it.badge && it.badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 min-w-3.5 h-3.5 px-0.5 bg-blue-600 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                    {it.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full block">
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
