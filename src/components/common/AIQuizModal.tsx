import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Save,
  RotateCcw,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizQuestion, Session, Exam } from '../../types';
import { calcKonkoorPercent, faNum, fmtClock, fmtPercent, studyDayKey } from '../../lib/jalali';
import { playSound, triggerHaptic } from '../../lib/audio';
import { uid } from '../../lib/storage';

interface AIQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuizQuestion[];
  subject: string;
  topicTitle: string;
  soundEnabled: boolean;
  onSaveResult: (session: Session, exam: Exam) => void;
}

export const AIQuizModal: React.FC<AIQuizModalProps> = ({
  isOpen,
  onClose,
  questions,
  subject,
  topicTitle,
  soundEnabled,
  onSaveResult,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setSelectedAnswers({});
      setIsSubmitted(false);
      setElapsedSeconds(0);
      setIsTimerActive(true);
      return;
    }

    const interval = setInterval(() => {
      if (isTimerActive && !isSubmitted) {
        setElapsedSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isTimerActive, isSubmitted]);

  if (!isOpen || !questions || questions.length === 0) return null;

  const handleSelect = (qIdx: number, optIdx: number) => {
    if (isSubmitted) return;
    playSound('click', soundEnabled);
    triggerHaptic(15);
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIdx]: optIdx,
    }));
  };

  // Compute stats
  let correct = 0;
  let wrong = 0;
  let blank = 0;

  questions.forEach((q, idx) => {
    const chosen = selectedAnswers[idx];
    if (chosen === undefined) {
      blank++;
    } else if (chosen === q.correct_index) {
      correct++;
    } else {
      wrong++;
    }
  });

  const total = questions.length;
  const percentage = calcKonkoorPercent(correct, wrong, blank);

  const handleSubmit = () => {
    setIsSubmitted(true);
    setIsTimerActive(false);

    if (percentage >= 60) {
      playSound('finish', soundEnabled);
      triggerHaptic([30, 60, 30]);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (_) {}
    } else if (percentage >= 30) {
      playSound('success', soundEnabled);
    } else {
      playSound('wrong', soundEnabled);
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setElapsedSeconds(0);
    setIsTimerActive(true);
  };

  const handleSaveToRecord = () => {
    const now = Date.now();
    const day = studyDayKey();
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    const session: Session = {
      id: uid(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      device_id: 'client',
      subject,
      chapter: topicTitle,
      seconds: elapsedSeconds || 300,
      correct,
      wrong,
      blank,
      note: `آزمون هوشمند تستی (${questions.length} سوال)`,
      day,
      type: 'تست سنجشی و زمان‌دار',
    };

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
      duration: durationMinutes,
      percent: percentage,
      note: `آزمون شبیه‌ساز هوش مصنوعی: ${topicTitle}`,
    };

    onSaveResult(session, exam);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                آزمون تستی هوشمند: {topicTitle}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span>{faNum(questions.length)} سوال چهارگزینه‌ای</span>
                <span>·</span>
                <span className="flex items-center gap-1 font-mono" dir="ltr">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {fmtClock(elapsedSeconds)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Banner (when submitted) */}
        {isSubmitted && (
          <div className="bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900 p-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-xs">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    درصد کنکوری با احتساب نمره منفی
                  </div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                    {fmtPercent(percentage)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="text-blue-700 dark:text-blue-300">
                  <span>درست: </span>
                  <span className="font-mono">{faNum(correct)}</span>
                </div>
                <div className="text-rose-600 dark:text-rose-400">
                  <span>غلط: </span>
                  <span className="font-mono">{faNum(wrong)}</span>
                </div>
                <div className="text-slate-500">
                  <span>نزده: </span>
                  <span className="font-mono">{faNum(blank)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questions Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {questions.map((q, qIdx) => {
            const chosen = selectedAnswers[qIdx];
            const isCorrect = chosen === q.correct_index;

            return (
              <div
                key={qIdx}
                className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
                  isSubmitted
                    ? isCorrect
                      ? 'border-emerald-300 bg-emerald-50/20 dark:border-emerald-900/60 dark:bg-emerald-950/10'
                      : chosen !== undefined
                      ? 'border-rose-300 bg-rose-50/20 dark:border-rose-900/60 dark:bg-rose-950/10'
                      : 'border-slate-200 dark:border-slate-800'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20'
                }`}
              >
                {/* Question Stem */}
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {faNum(qIdx + 1)}
                  </span>
                  <h4 className="font-bold text-sm leading-relaxed text-slate-800 dark:text-slate-100 text-right">
                    {q.stem}
                  </h4>
                </div>

                {/* 4 Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = chosen === optIdx;
                    const isTargetCorrect = q.correct_index === optIdx;

                    let btnClass =
                      'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400';

                    if (isSubmitted) {
                      if (isTargetCorrect) {
                        btnClass =
                          'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 font-bold ring-1 ring-emerald-500';
                      } else if (isSelected && !isTargetCorrect) {
                        btnClass =
                          'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 font-bold line-through ring-1 ring-rose-500';
                      } else {
                        btnClass = 'opacity-50 border-slate-200 dark:border-slate-800';
                      }
                    } else if (isSelected) {
                      btnClass =
                        'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200 font-bold ring-2 ring-blue-500';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => handleSelect(qIdx, optIdx)}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border text-right text-xs transition-all ${btnClass}`}
                      >
                        <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {faNum(optIdx + 1)}
                        </span>
                        <span className="leading-relaxed flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation on Submission */}
                {isSubmitted && q.explanation && (
                  <div className="mt-4 pt-3.5 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>پاسخ تشریحی و تحلیل گزینه:</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300 pr-5">
                      {q.explanation}
                    </p>
                    {q.source && (
                      <span className="block text-[11px] text-slate-400 pr-5">
                        منبع: {q.source}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            پاسخ داده‌شده: {faNum(Object.keys(selectedAnswers).length)} از {faNum(questions.length)}
          </div>

          <div className="flex items-center gap-2">
            {!isSubmitted ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/25 hover:bg-blue-700 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تصحیح و ثبت نمره</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تمرین مجدد</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveToRecord}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>ثبت در جلسات و کارنامه</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
