import React, { useEffect, useState } from 'react';
import {
  Search,
  Home,
  Timer,
  FileCheck2,
  BookOpenCheck,
  Hourglass,
  CalendarCheck,
  BarChart3,
  CalendarDays,
  Sparkles,
  Heart,
  Settings,
  Activity,
  Download,
  Sun,
  Moon,
  Volume2,
} from 'lucide-react';
import { ViewId } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewId) => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onExport: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onToggleTheme,
  onToggleSound,
  onExport,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: 'view-home', label: 'داشبورد اصلی', icon: Home, group: 'صفحات', run: () => onNavigate('home') },
    { id: 'view-timer', label: 'اتاق تمرکز (تایمر)', icon: Timer, group: 'صفحات', run: () => onNavigate('timer') },
    { id: 'view-exams', label: 'آزمون‌ها و درصدها', icon: FileCheck2, group: 'صفحات', run: () => onNavigate('exams') },
    { id: 'view-mistakes', label: 'دفترچه غلط (لایتنر)', icon: BookOpenCheck, group: 'صفحات', run: () => onNavigate('mistakes') },
    { id: 'view-sim', label: 'شبیه‌ساز زمان‌دار آزمون', icon: Hourglass, group: 'صفحات', run: () => onNavigate('sim') },
    { id: 'view-plan', label: 'برنامه روزانه و چک‌لیست', icon: CalendarCheck, group: 'صفحات', run: () => onNavigate('plan') },
    { id: 'view-stats', label: 'تحلیل هفتگی و سهم دروس', icon: BarChart3, group: 'صفحات', run: () => onNavigate('stats') },
    { id: 'view-monthly', label: 'گزارش ماهانه و تقویم', icon: CalendarDays, group: 'صفحات', run: () => onNavigate('monthly') },
    { id: 'view-couple', label: 'رقابت دونفره زنده', icon: Heart, group: 'صفحات', run: () => onNavigate('couple') },
    { id: 'view-ai', label: 'دستیار هوش مصنوعی و آزمون‌ساز', icon: Sparkles, group: 'صفحات', run: () => onNavigate('ai') },
    { id: 'view-settings', label: 'تنظیمات و اطلاعات پایه', icon: Settings, group: 'صفحات', run: () => onNavigate('settings') },
    { id: 'view-diag', label: 'سلامت سیستم و پایگاه داده', icon: Activity, group: 'صفحات', run: () => onNavigate('diag') },
    { id: 'act-theme', label: 'تغییر پوسته (روشن / تاریک)', icon: Sun, group: 'ابزارها', run: onToggleTheme },
    { id: 'act-sound', label: 'قطع / وصل صدا', icon: Volume2, group: 'ابزارها', run: onToggleSound },
    { id: 'act-export', label: 'تهیه نسخه پشتیبان (JSON)', icon: Download, group: 'ابزارها', run: onExport },
  ];

  const filtered = actions.filter((act) =>
    act.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در بخش‌ها، ابزارها و فرامین…"
            autoFocus
            className="w-full bg-transparent text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none text-right"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/40">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              موردی پیدا نشد
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-right group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                    {item.group}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
