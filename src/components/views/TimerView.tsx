import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Sun,
  PlusCircle,
  ShieldCheck,
  BookOpen,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { SUBJECTS, SUBJECT_CHAPTERS, getSubject, getGoftarsForChapter } from '../../lib/constants';
import { fmtClock, faNum } from '../../lib/jalali';
import { playSound, triggerHaptic } from '../../lib/audio';
import { Subject3DIcon } from '../common/Subject3DIcon';

interface TimerViewProps {
  elapsedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  activeSubject: string;
  activeChapter?: string;
  activeGoftar?: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  onSelectSubject: (subjId: string) => void;
  onSelectChapter?: (chapter: string) => void;
  onSelectGoftar?: (goftar: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onFinish: () => void;
  onOpenManualModal: () => void;
}

export const TimerView: React.FC<TimerViewProps> = ({
  elapsedSeconds,
  isRunning,
  isPaused,
  activeSubject,
  activeChapter = '',
  activeGoftar = '',
  soundEnabled,
  vibrationEnabled,
  onSelectSubject,
  onSelectChapter,
  onSelectGoftar,
  onStart,
  onPause,
  onResume,
  onReset,
  onFinish,
  onOpenManualModal,
}) => {
  const [isZenMode, setIsZenMode] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockObj, setWakeLockObj] = useState<any>(null);
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'konkoor' | 'final'>('all');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const currentSubj = getSubject(activeSubject);
  const subjectChapters = SUBJECT_CHAPTERS[activeSubject] || [];
  const subjectGoftars = activeSubject === 'bio' && activeChapter ? getGoftarsForChapter(activeChapter) : [];

  const displayedSubjects = SUBJECTS.filter((s) => {
    if (categoryFilter === 'konkoor') return s.category === 'konkoor';
    if (categoryFilter === 'final') return s.category === 'final';
    return true;
  });

  useEffect(() => {
    setWakeLockSupported('wakeLock' in navigator);
  }, []);

  // Request or Release screen wake lock safely
  const releaseWakeLock = async () => {
    if (wakeLockObj) {
      try {
        await wakeLockObj.release();
      } catch (_) {}
      setWakeLockObj(null);
    }
    setWakeLockActive(false);
  };

  const acquireWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await (navigator as any).wakeLock.request('screen');
        setWakeLockObj(lock);
        setWakeLockActive(true);
        lock.addEventListener('release', () => {
          setWakeLockActive(false);
          setWakeLockObj(null);
        });
        return true;
      } catch (err) {
        // Do not display a false "active" status when the platform rejects the lock.
        setWakeLockActive(false);
        return false;
      }
    } else {
      setWakeLockActive(false);
      return false;
    }
  };

  // Auto WakeLock when timer is active + re-acquire on visibility change
  useEffect(() => {
    if (isRunning) {
      acquireWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockObj) {
        try {
          wakeLockObj.release();
        } catch (_) {}
      }
    };
  }, [isRunning]);

  // Manual Wake lock toggle (allows user to turn ON and OFF at any time)
  const toggleWakeLock = async () => {
    if (wakeLockActive) {
      await releaseWakeLock();
    } else {
      await acquireWakeLock();
    }
  };

  const handleToggleZen = () => {
    if (!isZenMode) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsZenMode(true);
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsZenMode(false);
    }
  };

  // Stopwatch circular calculation
  const totalCircleSeconds = 3600; // 1 hour per circle turn
  const progressFraction = (elapsedSeconds % totalCircleSeconds) / totalCircleSeconds;
  const radius = 96;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressFraction);

  return (
    <div
      className={`transition-all duration-300 ${
        isZenMode
          ? 'fixed inset-0 z-50 bg-[#050b14] text-white flex flex-col items-center justify-center p-4'
          : 'space-y-6 pb-12 animate-in fade-in duration-200'
      }`}
    >
      {/* Zen Mode Exit & Controls Bar */}
      {isZenMode && (
        <div className="absolute top-5 inset-x-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-2.5">
            <Subject3DIcon subject={currentSubj} size="sm" />
            <div>
              <span className="text-sm font-bold text-blue-200 block leading-tight">{currentSubj.name}</span>
              <span className="text-[10px] text-blue-300/80">{currentSubj.categoryLabel || 'درس'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleWakeLock}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                wakeLockActive
                  ? 'bg-blue-950/80 border-blue-500 text-blue-300'
                  : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{wakeLockActive ? 'صفحه روشن است' : wakeLockSupported ? 'روشن نگه‌داشتن صفحه' : 'قفل صفحه پشتیبانی نمی‌شود'}</span>
            </button>

            <button
              onClick={handleToggleZen}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors cursor-pointer"
              title="خروج از حالت تمرکز"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Normal Mode Header */}
      {!isZenMode && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              اتاق تمرکز (Study Room)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              زمان‌سنج حرفه‌ای با تم آبی، مقاوم به قفل صفحه و خروج از برنامه
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={toggleWakeLock}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                wakeLockActive
                  ? 'border-blue-400 dark:border-blue-700 bg-blue-100/80 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
              title="روشن یا خاموش کردن قفل روشن ماندن صفحه"
            >
              <Sun className={`w-3.5 h-3.5 ${wakeLockActive ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
              <span>{wakeLockActive ? 'صفحه روشن (فعال)' : wakeLockSupported ? 'روشن نگه‌داشتن صفحه' : 'قفل صفحه پشتیبانی نمی‌شود'}</span>
            </button>

            <button
              onClick={handleToggleZen}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40 text-xs font-bold text-blue-800 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>حالت تمام‌صفحه (Zen)</span>
            </button>

            <button
              onClick={onOpenManualModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>ثبت دستی جلسه</span>
            </button>
          </div>
        </div>
      )}

      {/* Subject Selector Bar with Tabs (hidden in Zen Mode) */}
      {!isZenMode && (
        <div className="space-y-2.5">
          {/* Category Tabs: Konkoor vs Final */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                همه ({faNum(SUBJECTS.length)})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('konkoor')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  categoryFilter === 'konkoor'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <span>اختصاصی کنکور (۴ تخصصی + زمین)</span>
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('final')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  categoryFilter === 'final'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <span>عمومی نهایی</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 hidden sm:inline">
              درس مورد نظر را برای شروع مطالعه لمس کنید
            </span>
          </div>

          {/* Chips Bar with 3D Icons */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {displayedSubjects.map((s) => {
              const isSelected = activeSubject === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    if (isRunning) return;
                    onSelectSubject(s.id);
                    playSound('click', soundEnabled);
                    triggerHaptic(15, vibrationEnabled);
                  }}
                  disabled={isRunning}
                  className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all border cursor-pointer ${
                    isSelected
                      ? 'border-transparent text-white shadow-md ring-2 ring-blue-500/30'
                      : 'border-slate-200/80 dark:border-blue-900/40 bg-white dark:bg-[#0a1628] text-slate-700 dark:text-slate-300 hover:border-blue-400'
                  } ${isRunning && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                  style={{
                    backgroundColor: isSelected ? s.color : undefined,
                    boxShadow: isSelected ? `0 4px 14px -2px ${s.color}60` : undefined,
                  }}
                >
                  <Subject3DIcon subject={s} size="xs" />
                  <span className="font-extrabold">{s.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-md ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : s.category === 'konkoor'
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {s.category === 'konkoor' ? 'کنکور' : 'نهایی'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Chapter & Goftar Selector Row (Topic Chooser) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl bg-white/70 dark:bg-[#0a1628]/70 border border-slate-200/80 dark:border-blue-900/40 text-xs">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <select
                value={activeChapter}
                onChange={(e) => {
                  onSelectChapter?.(e.target.value);
                  onSelectGoftar?.('');
                }}
                disabled={isRunning}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:border-blue-500 disabled:opacity-60"
              >
                <option value="">— انتخاب فصل کتاب درسی ({currentSubj.name}) —</option>
                {subjectChapters.map((ch, idx) => (
                  <option key={idx} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            {activeSubject === 'bio' ? (
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <select
                  value={activeGoftar}
                  onChange={(e) => onSelectGoftar?.(e.target.value)}
                  disabled={isRunning || !activeChapter}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:border-blue-500 disabled:opacity-60"
                >
                  <option value="">— انتخاب گفتار زیست‌شناسی —</option>
                  {subjectGoftars.map((g, idx) => (
                    <option key={idx} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 text-[11px] px-1">
                <span>مبحث انتخابی در گزارش و تحلیل‌های هوشمند ذخیره خواهد شد.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Circular Stopwatch Stage (Neumorphic Style) */}
      <div
        className={`rounded-3xl transition-all ${
          isZenMode
            ? 'border-transparent bg-transparent my-auto'
            : 'neu-card p-8 sm:p-12 flex flex-col items-center justify-center'
        }`}
      >
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center p-4 rounded-full neu-inset">
          {/* SVG Ring */}
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 220 220">
            {/* Background Circle */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              className="text-slate-200/60 dark:text-blue-950/40"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Progress Animated Circle */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke={currentSubj.color || '#2563eb'}
              fill="transparent"
              className="transition-all duration-500 ease-linear"
              style={{
                filter: isRunning ? `drop-shadow(0 0 10px ${currentSubj.color || '#2563eb'}90)` : undefined,
              }}
            />
          </svg>

          {/* Time & State Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none px-4">
            <span
              className={`font-black tracking-tight leading-none ${
                isZenMode ? 'text-5xl sm:text-6xl text-white' : 'text-4xl sm:text-5xl text-slate-900 dark:text-white'
              }`}
              dir="ltr"
            >
              {fmtClock(elapsedSeconds)}
            </span>

            <div
              className="flex items-center gap-2 mt-3 px-3 py-1 rounded-full neu-raised-sm bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 max-w-full"
            >
              <Subject3DIcon subject={currentSubj} size="xs" />
              <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">
                {currentSubj.name}
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold shrink-0">
                ({currentSubj.categoryLabel || 'درس'})
              </span>
            </div>

            {/* Display active chapter and goftar */}
            {(activeChapter || activeGoftar) && (
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 mt-1 max-w-[200px] truncate" title={`${activeChapter} ${activeGoftar ? `— ${activeGoftar}` : ''}`}>
                {activeChapter} {activeGoftar ? `— ${activeGoftar}` : ''}
              </span>
            )}

            <span className="text-[11px] text-slate-400 dark:text-slate-400 mt-1">
              {isRunning
                ? 'در حال تمرکز عمیق…'
                : isPaused
                ? 'جلسه متوقف شده'
                : 'آماده شروع مطالعه'}
            </span>
          </div>
        </div>

        {/* Stopwatch Controls */}
        <div className="flex items-center gap-3 mt-8">
          {/* Reset / Cancel button */}
          {(isRunning || isPaused || elapsedSeconds > 0) && (
            <button
              onClick={() => {
                if (elapsedSeconds >= 10) {
                  setConfirmResetOpen(true);
                } else {
                  onReset();
                  playSound('click', soundEnabled);
                  triggerHaptic(20, vibrationEnabled);
                }
              }}
              title="صفر کردن تایمر"
              className="p-3.5 rounded-2xl neu-raised-sm text-slate-500 hover:text-rose-600 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}

          {/* Start / Pause / Resume Button */}
          {!isRunning ? (
            <button
              onClick={() => {
                if (isPaused) onResume();
                else onStart();
                playSound('start', soundEnabled);
                triggerHaptic(30, vibrationEnabled);
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl neu-btn-primary font-bold text-xs cursor-pointer shadow-md"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isPaused ? 'ادامه مطالعه' : 'شروع پارت'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onPause();
                playSound('pause', soundEnabled);
                triggerHaptic([20, 40, 20], vibrationEnabled);
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
            >
              <Pause className="w-4 h-4 fill-white" />
              <span>توقف موقت (استراحت)</span>
            </button>
          )}

          {/* Finish & Save Session (Always visible when study time has started) */}
          {elapsedSeconds >= 5 && (
            <button
              onClick={() => {
                onFinish();
                playSound('finish', soundEnabled);
                triggerHaptic([30, 60, 30], vibrationEnabled);
              }}
              title="پایان و ثبت جلسه در گزارش روز"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-md transition-all cursor-pointer ring-2 ring-blue-400/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>پایان و ثبت پارت</span>
            </button>
          )}
        </div>

        {/* Paused Session Prompt to Record Topic */}
        {isPaused && elapsedSeconds >= 5 && (
          <div className="mt-5 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between gap-3 text-xs max-w-sm w-full animate-in fade-in">
            <span className="font-bold text-blue-800 dark:text-blue-300">
              پارت متوقف است ({faNum(Math.max(1, Math.round(elapsedSeconds / 60)))} دقیقه)؛ مایلید مبحث را ثبت کنید؟
            </span>
            <button
              onClick={() => {
                onFinish();
                playSound('finish', soundEnabled);
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black cursor-pointer shadow-xs shrink-0"
            >
              ثبت مبحث
            </button>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {confirmResetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs">
              <div className="flex items-center gap-2.5 text-amber-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  تعیین وضعیت پارت فعلی
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                شما مدت <b>{faNum(Math.max(1, Math.round(elapsedSeconds / 60)))} دقیقه</b> مطالعه داشته‌اید. آیا می‌خواهید این زمان همراه با مبحث ثبت شود یا بدون ذخیره صفر گردد؟
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setConfirmResetOpen(false);
                    onFinish();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black cursor-pointer shadow-sm"
                >
                  ثبت مبحث و پارت
                </button>
                <button
                  onClick={() => {
                    setConfirmResetOpen(false);
                    onReset();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  صفر کردن
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WakeLock status badge */}
        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleWakeLock}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              wakeLockActive
                ? 'neu-raised text-blue-700 dark:text-blue-300 font-extrabold'
                : 'neu-inset text-slate-500'
            }`}
          >
            <Sun className={`w-3.5 h-3.5 ${wakeLockActive ? 'text-amber-500' : ''}`} />
            <span>{wakeLockActive ? 'روشن ماندن صفحه فعال است' : wakeLockSupported ? 'روشن نگه‌داشتن صفحه (خاموش)' : 'قفل صفحه پشتیبانی نمی‌شود'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
