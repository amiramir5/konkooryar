import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Flame,
  Percent,
  Play,
  Settings as SettingsIcon,
  Target,
  BookOpenCheck,
  CalendarCheck,
  Sparkles,
  Heart,
  Hourglass,
  ChevronDown,
  ChevronUp,
  Archive,
  History,
} from 'lucide-react';
import { AppSettings, Exam, MistakeCard, Session, ViewId } from '../../types';
import {
  calcDaysLeft,
  calcKonkoorPercent,
  daysInJMonth,
  faNum,
  formatPersianDate,
  fmtHM,
  fmtPercent,
  isoFromJalali,
  jalaliMonthKey,
  jalaliPartsFromIso,
  parseIso,
  studyDayKey,
} from '../../lib/jalali';
import { getSubject } from '../../lib/constants';
import { Subject3DIcon } from '../common/Subject3DIcon';
import { getStoredPartnerState, getCoupleSettings } from '../../lib/coupleSync';

interface HomeViewProps {
  sessions: Session[];
  exams?: Exam[];
  mistakes?: MistakeCard[];
  settings: AppSettings;
  streak?: number;
  liveTimerSeconds: number;
  isTimerRunning: boolean;
  activeTimerSubject?: string;
  onNavigate: (view: ViewId) => void;
  onEditExamDate: () => void;
  onOpenQuickSessionModal: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  sessions,
  exams = [],
  mistakes = [],
  settings,
  streak: propStreak,
  liveTimerSeconds,
  isTimerRunning,
  activeTimerSubject,
  onNavigate,
  onEditExamDate,
  onOpenQuickSessionModal,
}) => {
  const [showPastArchive, setShowPastArchive] = useState(false);
  const today = studyDayKey();
  const daysLeft = calcDaysLeft(settings.examDate);

  const coupleConfig = getCoupleSettings();
  const partnerLive = getStoredPartnerState();
  const partnerTodayMins = Math.round(partnerLive.todaySeconds / 60);

  // Today study calculations
  const todaySessions = (sessions || []).filter(
    (s) => s && !s.deleted_at && s.day === today
  );

  const todayStaticSeconds = todaySessions.reduce(
    (sum, s) => sum + (s.seconds || 0),
    0
  );
  const totalTodaySeconds = todayStaticSeconds + (liveTimerSeconds || 0);
  const currentMinutes = Math.round(totalTodaySeconds / 60);

  const todayTests = todaySessions.reduce(
    (sum, s) => sum + (s.correct || 0) + (s.wrong || 0) + (s.blank || 0),
    0
  );
  const todayCorrect = todaySessions.reduce(
    (sum, s) => sum + (s.correct || 0),
    0
  );
  const todayWrong = todaySessions.reduce((sum, s) => sum + (s.wrong || 0), 0);
  const todayBlank = todaySessions.reduce((sum, s) => sum + (s.blank || 0), 0);

  const todayPercent =
    todayTests > 0
      ? calcKonkoorPercent(todayCorrect, todayWrong, todayBlank)
      : 0;

  // Goals
  const targetMinutes = settings.dailyGoalMinutes || 600;
  const targetTests = settings.dailyGoalTests || 100;
  const goalPercent = Math.min(
    100,
    Math.round((currentMinutes / targetMinutes) * 100)
  );

  // Streak
  const uniqueDays = Array.from(
    new Set((sessions || []).filter((s) => s && !s.deleted_at).map((s) => s.day))
  ).sort();
  let computedStreak = 0;
  if (uniqueDays.length > 0) {
    let checkDay = today;
    if (uniqueDays.includes(checkDay)) {
      while (uniqueDays.includes(checkDay)) {
        computedStreak++;
        const p = parseIso(checkDay);
        if (!p) break;
        const d = new Date(p[0], p[1] - 1, p[2]);
        d.setDate(d.getDate() - 1);
        checkDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
  }
  const streak = propStreak !== undefined ? propStreak : computedStreak;

  // Last 7 days chart data
  const weekDays: Array<{ iso: string; weekdayName: string }> = [];
  for (let i = 6; i >= 0; i--) {
    const p = parseIso(today);
    if (p) {
      const d = new Date(p[0], p[1] - 1, p[2]);
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      weekDays.push({
        iso,
        weekdayName: formatPersianDate(iso, 'weekday').split(' ')[0],
      });
    }
  }

  const byDayMinutes: Record<string, number> = {};
  (sessions || [])
    .filter((s) => s && !s.deleted_at)
    .forEach((s) => {
      byDayMinutes[s.day] =
        (byDayMinutes[s.day] || 0) + Math.round((s.seconds || 0) / 60);
    });
  byDayMinutes[today] =
    (byDayMinutes[today] || 0) + Math.round((liveTimerSeconds || 0) / 60);

  const maxWeekMinutes = Math.max(
    targetMinutes,
    ...weekDays.map((w) => byDayMinutes[w.iso] || 0)
  );

  // Heatmap: Current Jalali Month
  const todayJp = jalaliPartsFromIso(today) || [1405, 1, 1];
  const [curJy, curJm] = todayJp;
  const curMonthDays = Math.max(28, Math.min(31, daysInJMonth(curJy, curJm) || 30));
  const firstDayOfMonthIso = isoFromJalali(curJy, curJm, 1);
  const firstDayP = parseIso(firstDayOfMonthIso);
  const firstDayDt = firstDayP ? new Date(firstDayP[0], firstDayP[1] - 1, firstDayP[2]) : new Date();
  const firstDayJsDay = Number.isFinite(firstDayDt.getDay()) ? firstDayDt.getDay() : 0;
  const startOffset = Math.max(0, Math.min(6, (firstDayJsDay + 1) % 7)); // 0 for شنبه

  // Map of daily minutes for the month
  const monthDayMap: Record<string, number> = {};
  (sessions || [])
    .filter((s) => s && !s.deleted_at && jalaliMonthKey(s.day) === `${curJy}-${String(curJm).padStart(2, '0')}`)
    .forEach((s) => {
      monthDayMap[s.day] = (monthDayMap[s.day] || 0) + Math.round((s.seconds || 0) / 60);
    });
  if (jalaliMonthKey(today) === `${curJy}-${String(curJm).padStart(2, '0')}`) {
    monthDayMap[today] = (monthDayMap[today] || 0) + Math.round((liveTimerSeconds || 0) / 60);
  }

  const getHeatLevel = (mins: number) => {
    if (!mins || mins <= 0) return 0; // ۰ ساعت: بی‌رنگ
    if (mins < 240) return 1;          // ۱ دقیقه تا ۴ ساعت: آبی کمرنگ
    if (mins < 420) return 2;          // ۴ ساعت تا ۷ ساعت: آبی کمی غلیظ‌تر
    if (mins < 540) return 3;          // ۷ تا ۹ ساعت: یکم غلیظ‌تر
    if (mins <= 720) return 4;         // ۹ تا ۱۲ ساعت: غلیظ‌تر
    return 5;                          // بالای ۱۲ ساعت: غلیظ‌ترین
  };

  const heatBgClasses = [
    'bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-800/60',
    'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200 border border-blue-200 dark:border-blue-900/60',
    'bg-blue-200 text-blue-900 dark:bg-blue-900/80 dark:text-blue-100 border border-blue-300 dark:border-blue-800/80',
    'bg-blue-400 text-white dark:bg-blue-700 dark:text-blue-50 border border-blue-500 dark:border-blue-600',
    'bg-blue-600 text-white font-bold dark:bg-blue-500 dark:text-white shadow-xs',
    'bg-blue-950 text-white font-black dark:bg-sky-400 dark:text-slate-950 shadow-sm ring-1 ring-blue-900/30 dark:ring-sky-200/50',
  ];

  const pastSessions = [...(sessions || [])]
    .filter((s) => s && !s.deleted_at && s.day !== today)
    .sort((a, b) => b.created_at - a.created_at);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Hero: Compact Sleek Blue Exam Countdown */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 p-4 sm:p-5 text-white shadow-md border border-blue-500/30">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 min-w-0">
            {/* Number and Label side-by-side (Clean Text, No Halo Box) */}
            <div className="flex items-baseline gap-2 shrink-0">
              <span className="font-black text-3xl sm:text-4xl tracking-tight font-mono leading-none text-white drop-shadow-xs">
                {faNum(daysLeft)}
              </span>
              <span className="text-xs sm:text-sm font-bold text-blue-100">
                روز تا کنکور
              </span>
            </div>

            <div className="space-y-0.5 min-w-0">
              <h2 className="text-sm sm:text-base font-black tracking-tight truncate text-white">
                {settings.examTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-blue-100 font-medium">
                <span>هدف‌گذاری: {formatPersianDate(settings.examDate, 'long')}</span>
                <span>·</span>
                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white">
                  {formatPersianDate(today, 'weekday')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onEditExamDate}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>تغییر تاریخ</span>
            </button>
            <button
              onClick={() => onNavigate('timer')}
              className="px-3.5 py-1.5 rounded-xl bg-white text-blue-900 text-xs font-black shadow-xs hover:bg-blue-50 transition-colors flex items-center gap-1.5 group cursor-pointer shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-blue-900 transition-transform group-hover:scale-110" />
              <span>شروع پارت مطالعه</span>
            </button>
          </div>
        </div>
      </div>

      {/* Goal Progress Bar */}
      <div className="neu-card p-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>هدف‌گذاری مطالعه امروز</span>
          </div>
          <span className="font-mono text-blue-600 dark:text-blue-400 font-black">
            {fmtPercent(goalPercent)}
          </span>
        </div>

        <div className="w-full h-3 rounded-full neu-inset p-0.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-blue-600"
            style={{ width: `${goalPercent}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <span>
            مطالعه:{' '}
            <b className="font-mono text-slate-800 dark:text-slate-200">
              {fmtHM(currentMinutes)}
            </b>{' '}
            از {fmtHM(targetMinutes)}
          </span>
          <span>
            تست:{' '}
            <b className="font-mono text-slate-800 dark:text-slate-200">
              {faNum(todayTests)}
            </b>{' '}
            از {faNum(targetTests)}
          </span>
        </div>
      </div>

      {/* Couple Study Duo Live Banner (رقابت زنده من و همسرم) */}
      <div className="neu-card p-5 space-y-3.5 border-r-4 border-r-blue-600">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800 gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Heart className="w-4 h-4 fill-blue-600 text-blue-600 shrink-0" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              هم‌مسیر کنکور من: {coupleConfig.partnerName}
            </h3>
            <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 shrink-0">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>{partnerLive.isStudying ? `در حال مطالعه ${partnerLive.subjectName}` : 'آنلاین و آماده پارت'}</span>
            </span>
          </div>

          <button
            onClick={() => onNavigate('couple')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <span>مشاهده رقابت زنده</span>
            <span className="text-sm">←</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded-2xl neu-inset">
            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">مطالعه امروز {coupleConfig.myName}</span>
            <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
              {fmtHM(currentMinutes)}
            </span>
          </div>
          <div className="p-3 rounded-2xl neu-inset">
            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">مطالعه امروز {coupleConfig.partnerName}</span>
            <span className="text-xl font-black font-mono text-sky-500">
              {fmtHM(partnerTodayMins)}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Core KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Study Time */}
        <div className="neu-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">مطالعه امروز</span>
            <div className="p-2 rounded-xl neu-inset text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono" dir="ltr">
            {fmtHM(currentMinutes)}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
            {isTimerRunning && (
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping mr-1" />
            )}
            <span>{isTimerRunning ? 'تایمر فعال' : 'ساعت:دقیقه'}</span>
          </div>
        </div>

        {/* Tests Count */}
        <div className="neu-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">تست‌های امروز</span>
            <div className="p-2 rounded-xl neu-inset text-blue-600 dark:text-blue-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {faNum(todayTests)}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            درست {faNum(todayCorrect)} · غلط {faNum(todayWrong)}
          </div>
        </div>

        {/* Mastery Percent */}
        <div className="neu-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">درصد تسلط امروز</span>
            <div className="p-2 rounded-xl neu-inset text-blue-600 dark:text-blue-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {todayTests > 0 ? fmtPercent(todayPercent) : '—'}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            با احتساب نمره منفی سنجش
          </div>
        </div>

        {/* Streak */}
        <div className="neu-card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">تداوم پیوسته</span>
            <div className="p-2 rounded-xl neu-inset text-blue-600 dark:text-blue-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {faNum(streak)} روز
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            بدون توقف در مدار رتبه برتر
          </div>
        </div>
      </div>

      {/* 7-Day Chart & Yeolpumta Heatmap (Grid Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 7-Day Activity Chart */}
        <div className="rounded-2xl bg-white dark:bg-[#0a1628] border border-blue-100 dark:border-blue-900/50 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                نمودار مطالعه ۷ روز اخیر
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">به دقیقه</span>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 h-44 pt-4 pb-1 w-full overflow-hidden">
            {weekDays.map((wd) => {
              const mins = byDayMinutes[wd.iso] || 0;
              const heightPct = Math.max(4, Math.round((mins / maxWeekMinutes) * 100));
              const isToday = wd.iso === today;

              return (
                <div
                  key={wd.iso}
                  className="flex flex-col items-center justify-end h-full gap-1.5 group min-w-0"
                >
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {faNum(mins)}
                  </span>
                  <div className="w-full max-w-6 sm:max-w-7 bg-slate-100 dark:bg-slate-800 rounded-xl h-full flex items-end p-0.5">
                    <div
                      className={`w-full rounded-lg transition-all duration-200 ${
                        isToday
                          ? 'bg-blue-600 shadow-xs'
                          : 'bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-500'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span
                    title={wd.weekdayName}
                    className={`text-[10px] sm:text-xs font-bold truncate max-w-full block text-center ${
                      isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
                    }`}
                  >
                    {wd.weekdayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Yeolpumta Heatmap */}
        <div className="rounded-2xl bg-white dark:bg-[#0a1628] border border-blue-100 dark:border-blue-900/50 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              نقشه حرارتی مطالعه ماه (Heatmap)
            </h3>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {formatPersianDate(today, 'month-year')}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-slate-400 mb-1">
            <span>ش</span>
            <span>ی</span>
            <span>د</span>
            <span>س</span>
            <span>چ</span>
            <span>پ</span>
            <span>ج</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: startOffset }, (_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {Array.from({ length: curMonthDays }, (_, i) => {
              const dayNum = i + 1;
              const cellIso = isoFromJalali(curJy, curJm, dayNum);
              const mins = monthDayMap[cellIso] || 0;
              const level = getHeatLevel(mins);
              const isToday = cellIso === today;

              return (
                <div
                  key={cellIso}
                  title={`${dayNum} ${formatPersianDate(cellIso, 'month-year')} — ${mins} دقیقه`}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-bold transition-transform hover:scale-110 cursor-pointer relative ${
                    heatBgClasses[level]
                  } ${isToday ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
                >
                  <span className="font-mono">{faNum(dayNum)}</span>
                </div>
              );
            })}
          </div>

          {/* Compact Heatmap Scale Guide */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span>راهنمای رنگ ساعات:</span>
              <span className="font-mono text-[9px] text-blue-600 dark:text-blue-400">۰ تا ۱۲+ ساعت</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-[9px]">
              <div className="flex items-center gap-1 p-1 rounded-md bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className={`w-2.5 h-2.5 rounded-xs shrink-0 ${heatBgClasses[0]}`} />
                <span className="text-slate-500 truncate">۰ ساعت</span>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-md bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className={`w-2.5 h-2.5 rounded-xs shrink-0 ${heatBgClasses[1]}`} />
                <span className="text-slate-700 dark:text-slate-300 truncate">۱د تا ۴س</span>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-md bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className={`w-2.5 h-2.5 rounded-xs shrink-0 ${heatBgClasses[2]}`} />
                <span className="text-slate-700 dark:text-slate-300 truncate">۴ تا ۷س</span>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-md bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className={`w-2.5 h-2.5 rounded-xs shrink-0 ${heatBgClasses[3]}`} />
                <span className="text-slate-700 dark:text-slate-300 truncate">۷ تا ۹س</span>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-md bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className={`w-2.5 h-2.5 rounded-xs shrink-0 ${heatBgClasses[4]}`} />
                <span className="text-slate-700 dark:text-slate-300 truncate">۹ تا ۱۲س</span>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-md bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className={`w-2.5 h-2.5 rounded-xs shrink-0 ${heatBgClasses[5]}`} />
                <span className="text-blue-900 dark:text-sky-300 font-extrabold truncate">+۱۲س</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Tiles */}
      <div className="rounded-2xl bg-white dark:bg-[#0a1628] border border-blue-100 dark:border-blue-900/50 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
          دسترسی سریع به ابزارهای کلیدی
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigate('timer')}
            className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-slate-200/80 dark:border-blue-900/40 hover:border-blue-400 bg-white dark:bg-[#0a1628] transition-all group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              اتاق تمرکز
            </span>
          </button>

          <button
            onClick={() => onNavigate('mistakes')}
            className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-slate-200/80 dark:border-blue-900/40 hover:border-blue-400 bg-white dark:bg-[#0a1628] transition-all group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              دفترچه غلط
            </span>
          </button>

          <button
            onClick={() => onNavigate('plan')}
            className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-slate-200/80 dark:border-blue-900/40 hover:border-blue-400 bg-white dark:bg-[#0a1628] transition-all group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              برنامه روزانه
            </span>
          </button>

          <button
            onClick={() => onNavigate('ai')}
            className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-slate-200/80 dark:border-blue-900/40 hover:border-blue-400 bg-white dark:bg-[#0a1628] transition-all group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              دستیار هوشمند
            </span>
          </button>

          <button
            onClick={() => onNavigate('couple')}
            className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-slate-200/80 dark:border-blue-900/40 hover:border-blue-400 bg-white dark:bg-[#0a1628] transition-all group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Heart className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              رقابت دونفره
            </span>
          </button>

          <button
            onClick={() => onNavigate('sim')}
            className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-slate-200/80 dark:border-blue-900/40 hover:border-blue-400 bg-white dark:bg-[#0a1628] transition-all group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Hourglass className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              شبیه‌ساز آزمون
            </span>
          </button>
        </div>
      </div>

      {/* Today's Study Sessions */}
      <div className="rounded-2xl bg-white dark:bg-[#0a1628] border border-blue-100 dark:border-blue-900/50 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              پارت‌های مطالعه امروز
            </h3>
            {todaySessions.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                {faNum(todaySessions.length)} جلسه
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenQuickSessionModal}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              + ثبت جلسه جدید
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button
              onClick={() => onNavigate('timer')}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
            >
              ورود به تایمر
            </button>
          </div>
        </div>

        {todaySessions.length === 0 ? (
          <div className="text-center py-7 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <p>هنوز پارتی برای امروز ثبت نشده است. اولین پارت را با تایمر شروع کن یا دستی ثبت نما!</p>
            <button
              onClick={onOpenQuickSessionModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-100 transition-colors cursor-pointer text-xs"
            >
              + ثبت دستی پارت امروز
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {todaySessions.map((s) => {
              const subj = getSubject(s.subject);
              const mins = Math.round(s.seconds / 60);

              return (
                <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Subject3DIcon subject={subj} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                          {subj.name} {s.chapter ? `— ${s.chapter}` : ''}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                            subj.category === 'konkoor'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {subj.categoryLabel || 'درس'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {formatPersianDate(s.day, 'short')} · {s.type}
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="font-mono text-xs font-black text-slate-900 dark:text-slate-100 block" dir="ltr">
                      {fmtHM(mins)}
                    </span>
                    {(s.correct > 0 || s.wrong > 0) && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono block">
                        درست: {faNum(s.correct)} / غلط: {faNum(s.wrong)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Collapsible Archive: Past Days' Study Sessions */}
      {pastSessions.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#0a1628] border border-blue-100 dark:border-blue-900/50 p-4 shadow-xs">
          <button
            onClick={() => setShowPastArchive(!showPastArchive)}
            className="w-full flex items-center justify-between gap-3 text-right cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <Archive className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    آرشیو جلسات مطالعه روزهای گذشته
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {faNum(pastSessions.length)} جلسه
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {showPastArchive ? 'کلیک کنید تا آرشیو پنهان شود' : 'پارت‌های روزهای قبل به صورت تفکیک‌شده و آرشیو نگهداری می‌شوند'}
                </p>
              </div>
            </div>

            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0">
              {showPastArchive ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {showPastArchive && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-200">
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto pr-1">
                {pastSessions.slice(0, 20).map((s) => {
                  const subj = getSubject(s.subject);
                  const mins = Math.round(s.seconds / 60);

                  return (
                    <div key={s.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Subject3DIcon subject={subj} size="xs" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 dark:text-slate-200 truncate text-xs">
                            {subj.name} {s.chapter ? `— ${s.chapter}` : ''}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {formatPersianDate(s.day, 'long')} · {s.type}
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block" dir="ltr">
                          {fmtHM(mins)}
                        </span>
                        {(s.correct > 0 || s.wrong > 0) && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono block">
                            درست: {faNum(s.correct)} / غلط: {faNum(s.wrong)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => onNavigate('stats')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>مشاهده تحلیل و سابقه کامل در بخش آمار</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
