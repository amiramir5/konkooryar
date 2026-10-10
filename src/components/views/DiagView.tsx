import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  HardDrive,
  Cpu,
  RefreshCw,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { AppSettings, Exam, MistakeCard, Session } from '../../types';
import { faNum, studyDayKey } from '../../lib/jalali';

interface DiagViewProps {
  settings: AppSettings;
  sessions: Session[];
  exams: Exam[];
  mistakes: MistakeCard[];
  onRefresh: () => void;
}

export const DiagView: React.FC<DiagViewProps> = ({
  settings,
  sessions,
  exams,
  mistakes,
  onRefresh,
}) => {
  const [persisted, setPersisted] = useState(false);
  const [approximateSize, setApproximateSize] = useState('0');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const totalStr =
          JSON.stringify(sessions) +
          JSON.stringify(exams) +
          JSON.stringify(mistakes) +
          JSON.stringify(settings);
        const kb = (totalStr.length / 1024).toFixed(1);
        setApproximateSize(kb);
      } catch (_) {}

      if (navigator.storage && navigator.storage.persisted) {
        navigator.storage.persisted().then(setPersisted).catch(() => {});
      }
    }
  }, [sessions, exams, mistakes, settings]);

  const hasWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const hasVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  const hasAudioContext =
    typeof window !== 'undefined' &&
    ('AudioContext' in window || 'webkitAudioContext' in window);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span>سلامت و عیب‌یابی سیستم (System Diagnostics)</span>
          <span className="p-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <Activity className="w-4 h-4" />
          </span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          وضعیت پایداری داده‌های آفلاین، قابلیت‌های مرورگر و سوابق حافظه محلی
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="block text-xs font-bold text-slate-400 mb-1">جلسات ثبت‌شده</span>
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {faNum(sessions.length)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="block text-xs font-bold text-slate-400 mb-1">کارنامه‌ها</span>
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {faNum(exams.length)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="block text-xs font-bold text-slate-400 mb-1">کارت‌های لایتنر</span>
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {faNum(mistakes.length)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="block text-xs font-bold text-slate-400 mb-1">حجم حافظه محلی</span>
          <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
            {faNum(approximateSize)} KB
          </span>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            پشتیبانی از فناوری‌های مرورگر
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              روشن نگه‌داشتن صفحه (Wake Lock)
            </span>
            <span
              className={`font-bold ${
                hasWakeLock ? 'text-blue-600' : 'text-amber-600'
              }`}
            >
              {hasWakeLock ? 'پشتیبانی می‌شود' : 'پشتیبانی نمی‌شود'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              موتور صوتی Web Audio API
            </span>
            <span
              className={`font-bold ${
                hasAudioContext ? 'text-blue-600' : 'text-amber-600'
              }`}
            >
              {hasAudioContext ? 'پشتیبانی می‌شود' : 'پشتیبانی نمی‌شود'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              موتور لرزش لمسی (Vibration)
            </span>
            <span
              className={`font-bold ${
                hasVibration ? 'text-blue-600' : 'text-amber-600'
              }`}
            >
              {hasVibration ? 'پشتیبانی می‌شود' : 'غیرفعال در دسکتاپ'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              مرز محاسباتی شبانه‌روز (ساعت ۵ صبح)
            </span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {studyDayKey()}
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-mono">
            Device ID: {settings.deviceId.slice(0, 16)}…
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>بازخوانی مجدد حافظه</span>
          </button>
        </div>
      </div>
    </div>
  );
};
