import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  Target,
  FileCheck2,
  CalendarCheck,
  TrendingUp,
} from 'lucide-react';
import { Exam, Session } from '../../types';
import {
  daysInJMonth,
  faNum,
  fmtHM,
  fmtPercent,
  isoFromJalali,
  jalaliMonthKey,
  jalaliPartsFromIso,
  studyDayKey,
} from '../../lib/jalali';

interface MonthlyViewProps {
  sessions: Session[];
  exams: Exam[];
}

export const MonthlyView: React.FC<MonthlyViewProps> = ({ sessions, exams }) => {
  const today = studyDayKey();
  const todayJp = jalaliPartsFromIso(today) || [1405, 1, 1];
  const [curJy, curJm] = todayJp;

  const currentMonthKey = `${curJy}-${String(curJm).padStart(2, '0')}`;
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);

  // Group all sessions by Jalali month
  const monthBuckets: Record<string, { sessions: Session[]; exams: Exam[] }> = {};

  sessions
    .filter((s) => !s.deleted_at)
    .forEach((s) => {
      const mk = jalaliMonthKey(s.day);
      if (!mk) return;
      if (!monthBuckets[mk]) monthBuckets[mk] = { sessions: [], exams: [] };
      monthBuckets[mk].sessions.push(s);
    });

  exams
    .filter((e) => !e.deleted_at)
    .forEach((e) => {
      const mk = jalaliMonthKey(e.day);
      if (!mk) return;
      if (!monthBuckets[mk]) monthBuckets[mk] = { sessions: [], exams: [] };
      monthBuckets[mk].exams.push(e);
    });

  const availableMonthKeys = Array.from(
    new Set([currentMonthKey, ...Object.keys(monthBuckets)])
  ).sort().reverse();

  // Selected month metrics
  const selectedBucket = monthBuckets[selectedMonthKey] || { sessions: [], exams: [] };
  const monthSeconds = selectedBucket.sessions.reduce((sum, s) => sum + s.seconds, 0);
  const monthMinutes = Math.round(monthSeconds / 60);

  const monthTests = selectedBucket.sessions.reduce(
    (sum, s) => sum + s.correct + s.wrong + s.blank,
    0
  );

  const monthExams = selectedBucket.exams;
  const avgExamScore =
    monthExams.length > 0
      ? monthExams.reduce((sum, e) => sum + e.percent, 0) / monthExams.length
      : null;

  const activeDays = new Set(selectedBucket.sessions.map((s) => s.day)).size;

  // Breakdown by days in the month
  const [mYear, mMonth] = selectedMonthKey.split('-').map(Number);
  const totalDaysInMonth = daysInJMonth(mYear, mMonth);

  const dailyMinutes: number[] = [];
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const iso = isoFromJalali(mYear, mMonth, d);
    const daySec = selectedBucket.sessions
      .filter((s) => s.day === iso)
      .reduce((sum, s) => sum + s.seconds, 0);
    dailyMinutes.push(Math.round(daySec / 60));
  }

  const maxMonthDayMins = Math.max(...dailyMinutes, 60);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            گزارش ماهانه و روند تداوم
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            بررسی ماه به ماه ساعات مطالعه، تست‌ها و روند آزمون‌های دوره‌ای
          </p>
        </div>

        {/* Month Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">انتخاب ماه:</label>
          <select
            value={selectedMonthKey}
            onChange={(e) => setSelectedMonthKey(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            {availableMonthKeys.map((mk) => {
              const [y, m] = mk.split('-').map(Number);
              const months = [
                'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
              ];
              return (
                <option key={mk} value={mk}>
                  {months[m - 1]} {faNum(y)}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* 4 Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">مجموع مطالعه ماه</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white" dir="ltr">
            {fmtHM(monthMinutes)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {faNum(Math.round(monthMinutes / 60))} ساعت
          </span>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">تعداد تست‌های ماه</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {faNum(monthTests)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            میانگین: {faNum(activeDays > 0 ? Math.round(monthTests / activeDays) : 0)} تست در روز
          </span>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">میانگین آزمون‌ها</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {avgExamScore !== null ? fmtPercent(avgExamScore) : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {faNum(monthExams.length)} آزمون ثبت‌شده
          </span>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">روزهای فعال</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {faNum(activeDays)} روز
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            از {faNum(totalDaysInMonth)} روز این ماه
          </span>
        </div>
      </div>

      {/* Month Days Bar Chart */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              نمودار روز به روز مطالعه در طول ماه
            </h3>
          </div>
          <span className="text-xs text-slate-400">به دقیقه</span>
        </div>

        <div className="flex items-end justify-between gap-1 sm:gap-2 h-44 pt-6 pb-2 px-1 overflow-x-auto">
          {dailyMinutes.map((mins, idx) => {
            const dayNum = idx + 1;
            const heightPct = Math.max(4, Math.round((mins / maxMonthDayMins) * 100));

            return (
              <div
                key={dayNum}
                className="flex-1 min-w-4 flex flex-col items-center justify-end h-full gap-1 group"
                title={`روز ${dayNum}: ${mins} دقیقه`}
              >
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg h-full flex items-end p-0.5">
                  <div
                    className="w-full rounded-md bg-blue-600 group-hover:bg-blue-500 transition-colors"
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-400 group-hover:text-blue-600">
                  {faNum(dayNum)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
