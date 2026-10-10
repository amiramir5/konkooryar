import React from 'react';
import {
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
} from 'lucide-react';
import { ViewId } from '../types';

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  dueMistakesCount: number;
  dueTasksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  dueMistakesCount,
  dueTasksCount,
}) => {
  const navItems = [
    { id: 'home' as ViewId, label: 'داشبورد اصلی', icon: Home },
    { id: 'timer' as ViewId, label: 'اتاق تمرکز (تایمر)', icon: Timer, hot: true },
    { id: 'exams' as ViewId, label: 'آزمون‌ها و درصدها', icon: FileCheck2 },
    {
      id: 'mistakes' as ViewId,
      label: 'دفترچه غلط (لایتنر)',
      icon: BookOpenCheck,
      badge: dueMistakesCount > 0 ? dueMistakesCount : undefined,
    },
    { id: 'sim' as ViewId, label: 'شبیه‌ساز آزمون', icon: Hourglass },
    {
      id: 'plan' as ViewId,
      label: 'برنامه روزانه',
      icon: CalendarCheck,
      badge: dueTasksCount > 0 ? dueTasksCount : undefined,
    },
    { id: 'stats' as ViewId, label: 'تحلیل هفتگی', icon: BarChart3 },
    { id: 'monthly' as ViewId, label: 'گزارش ماهانه', icon: CalendarDays },
    { id: 'couple' as ViewId, label: 'رقابت دونفره زنده', icon: Heart, ping: true },
    { id: 'ai' as ViewId, label: 'دستیار هوش مصنوعی', icon: Sparkles, highlight: true },
    { id: 'settings' as ViewId, label: 'تنظیمات و خروجی', icon: Settings },
    { id: 'diag' as ViewId, label: 'سلامت سیستم', icon: Activity },
  ];

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col border-l border-slate-200/60 dark:border-slate-800/80 bg-white/90 dark:bg-[#0B132B]/90 glass p-3 gap-1 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400">
        فهرست بخش‌ها
      </div>

      <nav className="flex flex-col gap-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 group text-right cursor-pointer ${
                isActive
                  ? 'neu-btn-primary font-bold shadow-md'
                  : 'neu-raised-sm hover:border-blue-400 dark:hover:border-blue-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive
                      ? 'text-white'
                      : item.highlight
                      ? 'text-blue-500'
                      : item.ping
                      ? 'text-blue-600 fill-blue-600'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                  strokeWidth={2}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.hot && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                )}
                {item.ping && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Study Duo Quick Badge on Sidebar footer */}
      <div className="p-3 rounded-2xl neu-inset mt-auto space-y-1 text-center">
        <div className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-black">
          <Heart className="w-3.5 h-3.5 fill-blue-600 text-blue-600" />
          <span>مطالعه همزمان من و همسرم</span>
        </div>
        <span className="text-[10px] text-slate-400 block">رقابت زنده و پیشرفت مشترک</span>
      </div>
    </aside>
  );
};
