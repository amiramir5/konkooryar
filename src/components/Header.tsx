import React from 'react';
import {
  Flame,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Command,
  Heart,
  Sparkles,
} from 'lucide-react';
import { formatPersianDate, studyDayKey, faNum } from '../lib/jalali';
import { playSound } from '../lib/audio';
import { AppSettings, ViewId } from '../types';

interface HeaderProps {
  settings: AppSettings;
  streak: number;
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onOpenCommandPalette: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  streak,
  activeView,
  onNavigate,
  onToggleTheme,
  onToggleSound,
  onOpenCommandPalette,
}) => {
  const today = studyDayKey();
  const dateFormatted = formatPersianDate(today, 'weekday');
  const isDark = settings.theme === 'dark';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#0B132B]/90 glass border-b border-slate-200/60 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Date */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 text-right focus:outline-none group cursor-pointer"
          >
            {/* Custom Modern KonkoorYar Emblem */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-blue-600/25 ring-1 ring-white/20 group-hover:scale-105 group-hover:shadow-blue-600/40 transition-all duration-200 shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-white stroke-[2.2] fill-none stroke-current drop-shadow-xs"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Stylized Open Book & Upward Growth / Summit Peak */}
                <path d="M2 6c3-1.5 6-1 10 1v13c-4-2-7-2-10-1V6z" />
                <path d="M22 6c-3-1.5-6-1-10 1v13c4-2 7-2 10-1V6z" />
                <circle cx="12" cy="4" r="1.5" className="fill-cyan-300 stroke-cyan-300" />
                <path d="M12 7v4" className="stroke-cyan-300" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  کنکوریار
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  ۲.۰
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {dateFormatted}
              </p>
            </div>
          </button>
        </div>

        {/* Center / Fast Actions */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          <button
            onClick={() => onNavigate('couple')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeView === 'couple'
                ? 'neu-raised text-blue-700 dark:text-blue-300 font-extrabold'
                : 'neu-raised-sm text-slate-600 dark:text-slate-400 hover:text-blue-600'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
            <span>رقابت دونفره</span>
          </button>

          <button
            onClick={() => onNavigate('ai')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeView === 'ai'
                ? 'neu-raised text-blue-700 dark:text-blue-300 font-extrabold'
                : 'neu-raised-sm text-slate-600 dark:text-slate-400 hover:text-blue-600'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>مشاور هوشمند</span>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Streak indicator */}
          <div
            title={`تداوم مطالعه: ${streak} روز پیوسته`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl neu-raised-sm text-blue-700 dark:text-blue-300 text-xs font-bold"
          >
            <Flame className="w-4 h-4 fill-blue-500 text-blue-500" />
            <span>{faNum(streak)} روز</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              playSound('click', !settings.soundEnabled);
            }}
            title={settings.soundEnabled ? 'صدا فعال است' : 'صدا غیرفعال است'}
            className="p-2 rounded-xl neu-raised-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
            aria-label="تغییر وضعیت صدا"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Theme Toggle: Daylight (Light Mode) / Dark Mode */}
          <button
            onClick={onToggleTheme}
            title={isDark ? 'تغییر به حالت دیلایت' : 'تغییر به حالت شب'}
            className="p-2 px-3 rounded-xl neu-raised-sm flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-200"
            aria-label="تغییر پوسته روشنایی"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            ) : (
              <Moon className="w-4 h-4 text-blue-700" />
            )}
            <span className="text-[11px] font-bold hidden sm:inline">
              {isDark ? 'حالت شب' : 'دیلایت'}
            </span>
          </button>

          {/* Command Palette Button */}
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl neu-inset text-slate-600 dark:text-slate-400 text-xs font-mono transition-colors cursor-pointer"
            title="جستجوی سریع و ناوبری (Ctrl+K)"
          >
            <span className="text-[11px] font-sans font-medium text-slate-500 dark:text-slate-400">
              Ctrl+K
            </span>
            <Command className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
