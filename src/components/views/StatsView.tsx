import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Clock,
  Flame,
  FileCheck2,
  Percent,
  PieChart,
  Sparkles,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { Exam, Session } from '../../types';
import { SUBJECTS } from '../../lib/constants';
import { Subject3DIcon } from '../common/Subject3DIcon';
import {
  calcKonkoorPercent,
  faNum,
  fmtHM,
  fmtPercent,
  getWeekDays,
  studyDayKey,
} from '../../lib/jalali';
import { getPerformanceInsights } from '../../lib/ai';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

interface StatsViewProps {
  sessions: Session[];
  exams: Exam[];
  streak: number;
}

interface InsightsData {
  status: string;
  strengths: string[];
  weaknesses: string[];
  actionItems: string[];
  summary: string;
}

export const StatsView: React.FC<StatsViewProps> = ({ sessions, exams, streak }) => {
  const today = studyDayKey();
  const weekDays = getWeekDays(today);
  const weekIsoSet = new Set(weekDays.map((w) => w.iso));

  const validSessions = sessions.filter((s) => !s.deleted_at);
  const weekSessions = validSessions.filter((s) => weekIsoSet.has(s.day));

  const weekSeconds = weekSessions.reduce((sum, s) => sum + s.seconds, 0);
  const weekMinutes = Math.round(weekSeconds / 60);

  const weekCorrect = weekSessions.reduce((sum, s) => sum + s.correct, 0);
  const weekWrong = weekSessions.reduce((sum, s) => sum + s.wrong, 0);
  const weekBlank = weekSessions.reduce((sum, s) => sum + s.blank, 0);
  const weekPercent = calcKonkoorPercent(weekCorrect, weekWrong, weekBlank);

  // Exams average
  const validExams = exams.filter((e) => !e.deleted_at);
  const avgExamPercent =
    validExams.length > 0
      ? Math.round(validExams.reduce((sum, e) => sum + e.percent, 0) / validExams.length)
      : null;

  // By Day Bars
  const byDayMinutes: Record<string, number> = {};
  weekDays.forEach((wd) => {
    byDayMinutes[wd.iso] = Math.round(
      weekSessions
        .filter((s) => s.day === wd.iso)
        .reduce((sum, s) => sum + s.seconds, 0) / 60
    );
  });
  const maxDayMinutes = Math.max(...Object.values(byDayMinutes), 60);

  // Subject Minutes Map
  const subjectMinutesMap: Record<string, number> = {};
  SUBJECTS.forEach((s) => {
    subjectMinutesMap[s.id] = 0;
  });
  validSessions.forEach((s) => {
    subjectMinutesMap[s.subject] =
      (subjectMinutesMap[s.subject] || 0) + Math.round(s.seconds / 60);
  });

  const totalAllMinutes = Object.values(subjectMinutesMap).reduce((a, b) => a + b, 0);

  // Donut stops without shiny gradient
  let donutGradient = 'conic-gradient(#e2e8f0 0% 100%)';
  let accumulatedPct = 0;
  const stops: string[] = [];

  if (totalAllMinutes > 0) {
    SUBJECTS.forEach((s) => {
      const mins = subjectMinutesMap[s.id] || 0;
      if (mins <= 0) return;
      const pct = (mins / totalAllMinutes) * 100;
      stops.push(
        `${s.color} ${accumulatedPct.toFixed(2)}% ${(accumulatedPct + pct).toFixed(2)}%`
      );
      accumulatedPct += pct;
    });
    if (stops.length > 0) {
      donutGradient = `conic-gradient(${stops.join(', ')})`;
    }
  }

  // Active days count in this week
  const activeDaysThisWeek = weekDays.filter(
    (wd) => (byDayMinutes[wd.iso] || 0) > 0
  ).length;
  const dailyAverage = activeDaysThisWeek > 0 ? Math.round(weekMinutes / activeDaysThisWeek) : 0;

  // Performance Insights AI State
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');

  const fetchInsights = async () => {
    setIsInsightsLoading(true);
    setInsightsError('');
    try {
      const data = await getPerformanceInsights({
        weekMinutes,
        totalMinutes: totalAllMinutes,
        streak,
        testsCount: validSessions.reduce((s, it) => s + it.correct + it.wrong + it.blank, 0) + validExams.length,
        avgExamPercent,
        subjectMinutes: subjectMinutesMap,
      });
      setInsights(data);
    } catch (err: any) {
      setInsightsError(err.message || 'خطا در دریافت تحلیل عملکرد هوش مصنوعی');
    } finally {
      setIsInsightsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if sessions or exams exist and not loaded yet
    if (!insights && (validSessions.length > 0 || validExams.length > 0)) {
      fetchInsights();
    }
  }, []);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          تحلیل عملکرد و آمار هفتگی
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          گزارش مقایسه‌ای شنبه تا جمعه با تفکیک سهم دروس و میانگین تستی
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="neu-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">مطالعه هفته</span>
            <div className="p-2 rounded-xl neu-inset text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white" dir="ltr">
            {fmtHM(weekMinutes)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            میانگین روزانه: {fmtHM(dailyAverage)}
          </span>
        </div>

        <div className="neu-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">تداوم پیوسته</span>
            <div className="p-2 rounded-xl neu-inset text-blue-600 dark:text-blue-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {faNum(streak)} روز
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {activeDaysThisWeek} روز فعال در این هفته
          </span>
        </div>

        <div className="neu-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">تعداد آزمون‌ها</span>
            <div className="p-2 rounded-xl neu-inset text-blue-600 dark:text-blue-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {faNum(validExams.length)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            کل آزمون‌های کارنامه
          </span>
        </div>

        <div className="neu-card p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">میانگین آزمون‌ها</span>
            <div className="p-2 rounded-xl neu-inset text-blue-600 dark:text-blue-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {avgExamPercent !== null ? fmtPercent(avgExamPercent) : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            تراز و درصد کلی
          </span>
        </div>
      </div>

      {/* Performance Insights Card (Powered by Gemini) */}
      <div className="neu-card p-5 space-y-4 border-r-4 border-r-blue-600">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl neu-inset text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>تحلیل هوشمند عملکرد و بازدهی</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                  هوش مصنوعی Gemini
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                استخراج نقاط قوت، چالش‌ها و راهکارهای ارتقای تراز بر اساس داده‌های واقعی شما
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchInsights}
            disabled={isInsightsLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl neu-raised-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isInsightsLoading ? 'animate-spin' : ''}`} />
            <span>بروزرسانی تحلیل</span>
          </button>
        </div>

        {isInsightsLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>در حال واکاوی داده‌های مطالعه و تستی با هوش مصنوعی...</span>
          </div>
        ) : insightsError ? (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 flex items-center justify-between">
            <span>{insightsError}</span>
            <button
              onClick={fetchInsights}
              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
            >
              تلاش مجدد
            </button>
          </div>
        ) : insights ? (
          <div className="space-y-4">
            {/* Status & Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="block text-[11px] font-bold text-slate-400">ارزیابی کلی وضعیت:</span>
                <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 inline-block">
                  {insights.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 sm:max-w-md leading-relaxed">
                {insights.summary}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Strengths */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>نقاط قوت مستند</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {insights.strengths?.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>نقاط نیازمند توجه</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {insights.weaknesses?.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Items */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>برنامه اقدام پیشنهادی</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {insights.actionItems?.map((a, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            هنوز جلسات کافی ثبت نشده است. پس از چند جلسه مطالعه، تحلیل هوشمند به‌صورت خودکار نمایان خواهد شد.
          </div>
        )}
      </div>

      {/* Week Activity Bar Chart (Recharts Weekly Analysis Widget) */}
      <div className="neu-card p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg neu-inset text-blue-600 dark:text-blue-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                ویجت تحلیل هفتگی و روند مطالعه
              </h3>
              <p className="text-[11px] text-slate-400">
                نمودار میله‌ای مقایسه‌ای روزهای شنبه تا جمعه با ابزار تحلیلی Recharts
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-400">
            مجموع: {fmtHM(weekMinutes)}
          </span>
        </div>

        <div className="w-full h-56 pt-2" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weekDays.map((wd) => ({
                day: wd.weekdayName,
                minutes: byDayMinutes[wd.iso] || 0,
                hoursFormatted: fmtHM(byDayMinutes[wd.iso] || 0),
                isToday: wd.iso === today,
              }))}
              margin={{ top: 15, right: 22, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val}د`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as any;
                    return (
                      <div
                        dir="rtl"
                        className="bg-slate-900/95 text-white text-xs p-2.5 rounded-xl shadow-lg border border-slate-700 space-y-1"
                      >
                        <span className="font-bold block text-blue-300">{data.day}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300">میزان مطالعه:</span>
                          <span className="font-mono font-bold text-white">
                            {data.hoursFormatted} ({faNum(data.minutes)} دقیقه)
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="minutes" radius={[8, 8, 0, 0]} maxBarSize={38}>
                {weekDays.map((wd, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={wd.iso === today ? '#2563eb' : '#94a3b8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut Chart: Subject Share */}
      <div className="neu-card p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
          <PieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            سهم دروس در کل سوابق مطالعه
          </h3>
        </div>

        {totalAllMinutes === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            داده‌ای برای محاسبه سهم دروس وجود ندارد.
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center justify-around gap-6">
            {/* Donut Circle */}
            <div
              className="relative w-44 h-44 rounded-full shadow-xs shrink-0 flex items-center justify-center"
              style={{ background: donutGradient }}
            >
              <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-900 shadow-inner flex flex-col items-center justify-center text-center">
                <span className="font-mono font-black text-xl text-slate-900 dark:text-white leading-none">
                  {faNum(Math.round(totalAllMinutes / 60))}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">ساعت کل</span>
              </div>
            </div>

            {/* Legend list */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5 text-xs flex-1 w-full">
              {SUBJECTS.filter((s) => (subjectMinutesMap[s.id] || 0) > 0).map((s) => {
                const mins = subjectMinutesMap[s.id] || 0;
                const pct = ((mins / totalAllMinutes) * 100).toFixed(1);

                return (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <Subject3DIcon subject={s} size="xs" />
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                        {s.name}
                      </span>
                    </div>
                    <span className="font-mono text-slate-400 text-[11px]" dir="ltr">
                      {fmtPercent(Number(pct))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
