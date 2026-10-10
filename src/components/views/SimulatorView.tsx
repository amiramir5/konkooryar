import React, { useState, useEffect } from 'react';
import {
  Hourglass,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { SUBJECTS, getSubject, KONKOOR_SUBJECTS, FINAL_SUBJECTS } from '../../lib/constants';
import { calcKonkoorPercent, faNum, fmtClock, fmtPercent, studyDayKey, toInt } from '../../lib/jalali';
import { Exam, Session } from '../../types';
import { uid } from '../../lib/storage';
import { playSound, triggerHaptic } from '../../lib/audio';
import { Subject3DIcon } from '../common/Subject3DIcon';

interface SimulatorViewProps {
  onSaveExam: (exam: Exam, session: Session) => void;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  onSaveExam,
  soundEnabled,
  vibrationEnabled,
}) => {
  const [subject, setSubject] = useState('bio');
  const [questionCount, setQuestionCount] = useState(30);
  const [allocatedMinutes, setAllocatedMinutes] = useState(35);

  // Active Sim State
  const [isActive, setIsActive] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [blank, setBlank] = useState(30);
  const [isFinished, setIsFinished] = useState(false);
  const [finishedExam, setFinishedExam] = useState<Exam | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (isActive && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            handleCompleteSimulation(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, remainingSeconds]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const totalSecs = Math.max(1, allocatedMinutes * 60);
    setRemainingSeconds(totalSecs);
    setCorrect(0);
    setWrong(0);
    setBlank(questionCount);
    setIsActive(true);
    setIsFinished(false);
    setFinishedExam(null);
    playSound('start', soundEnabled);
    triggerHaptic(30, vibrationEnabled);
  };

  const currentPercent = calcKonkoorPercent(correct, wrong, blank);

  const handleCompleteSimulation = (autoDueToTime = false) => {
    setIsActive(false);
    setIsFinished(true);

    const now = Date.now();
    const day = studyDayKey();
    const durationMins = Math.max(1, Math.round((allocatedMinutes * 60 - remainingSeconds) / 60));

    const exam: Exam = {
      id: uid(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      device_id: 'client',
      subject,
      day,
      correct,
      wrong,
      blank,
      duration: durationMins,
      percent: currentPercent,
      note: `شبیه‌ساز زمان‌دار کنکور (${questionCount} سوال)`,
    };

    const session: Session = {
      id: uid(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      device_id: 'client',
      subject,
      seconds: durationMins * 60,
      correct,
      wrong,
      blank,
      note: `آزمون شبیه‌ساز ${questionCount} تستی`,
      day,
      type: 'تست سنجشی و زمان‌دار',
    };

    setFinishedExam(exam);
    onSaveExam(exam, session);

    if (autoDueToTime) {
      playSound('wrong', soundEnabled);
      alert('زمان آزمون به پایان رسید! کارنامه شما ثبت شد.');
    } else {
      playSound('finish', soundEnabled);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setIsFinished(false);
    setRemainingSeconds(0);
  };

  const progressFraction = Math.max(
    0,
    Math.min(1, 1 - remainingSeconds / (allocatedMinutes * 60 || 1))
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          شبیه‌ساز زمان‌دار آزمون‌های کنکور
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          تمرین در شرایط پرفشار زمانی با محاسبه لحظه‌ای درصد و نمره منفی
        </p>
      </div>

      {!isActive && !isFinished ? (
        /* Setup Box */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs max-w-xl mx-auto space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Hourglass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                تنظیمات پارت شبیه‌ساز
              </h3>
              <p className="text-xs text-slate-400">
                درس، تعداد سوالات و زمان مجاز را تعیین کنید.
              </p>
            </div>
          </div>

          <form onSubmit={handleStart} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                درس آزمون
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                <optgroup label="دروس اختصاصی کنکور سراسری (۴ تخصصی + زمین‌شناسی)">
                  {KONKOOR_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon3d} {s.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="دروس عمومی (امتحانات نهایی)">
                  {FINAL_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon3d} {s.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  تعداد سوالات دفترچه
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(toInt(e.target.value, 30))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-center"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  زمان مجاز (دقیقه)
                </label>
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={allocatedMinutes}
                  onChange={(e) => setAllocatedMinutes(toInt(e.target.value, 35))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-center"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>شروع شبیه‌ساز زمان‌دار</span>
            </button>
          </form>
        </div>
      ) : isActive ? (
        /* Active Running Simulation */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xl max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Subject3DIcon subject={subject} size="sm" />
              <div>
                <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 block">
                  {getSubject(subject).name} — {faNum(questionCount)} سوال
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                  {getSubject(subject).categoryLabel || 'درس'}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              آزمون در جریان است
            </span>
          </div>

          {/* Countdown Display */}
          <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-bold block mb-1">
              زمان باقی‌مانده
            </span>
            <span
              className={`font-black text-5xl font-mono tracking-tight ${
                remainingSeconds < 300
                  ? 'text-rose-600 animate-pulse'
                  : 'text-slate-900 dark:text-white'
              }`}
              dir="ltr"
            >
              {fmtClock(remainingSeconds)}
            </span>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-4">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progressFraction * 100}%` }}
              />
            </div>
          </div>

          {/* Live Answer Counts */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
              پاسخنامه زنده (تعداد را با پیشروی وارد کنید)
            </h4>

            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20">
                <span className="block font-bold text-blue-700 dark:text-blue-300 mb-1">
                  درست
                </span>
                <input
                  type="number"
                  min="0"
                  max={questionCount}
                  value={correct}
                  onChange={(e) => {
                    const c = toInt(e.target.value, 0);
                    setCorrect(c);
                    setBlank(Math.max(0, questionCount - c - wrong));
                  }}
                  className="w-full text-center font-mono font-black text-lg bg-transparent text-blue-700 dark:text-blue-300 focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20">
                <span className="block font-bold text-rose-700 dark:text-rose-300 mb-1">
                  غلط
                </span>
                <input
                  type="number"
                  min="0"
                  max={questionCount}
                  value={wrong}
                  onChange={(e) => {
                    const w = toInt(e.target.value, 0);
                    setWrong(w);
                    setBlank(Math.max(0, questionCount - correct - w));
                  }}
                  className="w-full text-center font-mono font-black text-lg bg-transparent text-rose-700 dark:text-rose-300 focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                <span className="block font-bold text-slate-500 mb-1">نزده</span>
                <span className="font-mono font-black text-lg text-slate-700 dark:text-slate-300 block">
                  {faNum(blank)}
                </span>
              </div>
            </div>

            {/* Current Score */}
            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-300">
                درصد لحظه‌ای با نمره منفی:
              </span>
              <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                {fmtPercent(currentPercent)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handleCompleteSimulation(false)}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>پایان و ثبت کارنامه</span>
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 text-xs font-bold cursor-pointer"
            >
              لغو
            </button>
          </div>
        </div>
      ) : (
        /* Finished Screen */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 shadow-xl max-w-xl mx-auto text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              آزمون شبیه‌ساز با موفقیت ثبت شد!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              کارنامه و جلسه مطالعه به صورت خودکار در سوابق و آمار شما منظور گردید.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <span className="block text-slate-400 text-[11px]">درست</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-lg">
                {faNum(correct)}
              </span>
            </div>
            <div>
              <span className="block text-slate-400 text-[11px]">غلط</span>
              <span className="font-mono font-bold text-rose-600 text-lg">
                {faNum(wrong)}
              </span>
            </div>
            <div>
              <span className="block text-slate-400 text-[11px]">نزده</span>
              <span className="font-mono font-bold text-slate-400 text-lg">
                {faNum(blank)}
              </span>
            </div>
            <div>
              <span className="block text-slate-400 text-[11px]">درصد نهایی</span>
              <span className="font-mono font-black text-blue-600 text-lg">
                {fmtPercent(currentPercent)}
              </span>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>تنظیم و اجرای آزمون جدید</span>
          </button>
        </div>
      )}
    </div>
  );
};
