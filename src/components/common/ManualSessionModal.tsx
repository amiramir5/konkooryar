import React, { useState } from 'react';
import { X, Clock, Plus, Check } from 'lucide-react';
import { SUBJECTS, SUBJECT_CHAPTERS, SESSION_TYPES, KONKOOR_SUBJECTS, FINAL_SUBJECTS } from '../../lib/constants';
import { studyDayKey, toInt } from '../../lib/jalali';
import { uid } from '../../lib/storage';
import { Session } from '../../types';

interface ManualSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: Session) => void;
  defaultSubject?: string;
}

export const ManualSessionModal: React.FC<ManualSessionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultSubject = 'bio',
}) => {
  const [subject, setSubject] = useState(defaultSubject);
  const [chapter, setChapter] = useState('');
  const [type, setType] = useState(SESSION_TYPES[0]);
  const [minutes, setMinutes] = useState('60');
  const [correct, setCorrect] = useState('0');
  const [wrong, setWrong] = useState('0');
  const [blank, setBlank] = useState('0');
  const [note, setNote] = useState('');
  const [day, setDay] = useState(studyDayKey());

  if (!isOpen) return null;

  const chapters = SUBJECT_CHAPTERS[subject] || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMins = Math.max(1, toInt(minutes, 60));
    const now = Date.now();

    const newSession: Session = {
      id: uid(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      device_id: 'client',
      subject,
      chapter: chapter || undefined,
      type,
      seconds: cleanMins * 60,
      correct: toInt(correct, 0),
      wrong: toInt(wrong, 0),
      blank: toInt(blank, 0),
      note: note.trim(),
      day,
    };

    onSave(newSession);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100">
              ثبت دستی جلسه مطالعه
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Subject & Chapter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                درس
              </label>
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setChapter('');
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
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

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                فصل یا مبحث
              </label>
              <select
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">— انتخاب فصل —</option>
                {chapters.map((ch, idx) => (
                  <option key={idx} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                نوع جلسه
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {SESSION_TYPES.map((t, idx) => (
                  <option key={idx} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                مدت زمان (دقیقه)
              </label>
              <input
                type="number"
                min="1"
                max="720"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                dir="ltr"
              />
            </div>
          </div>

          {/* Tests (Correct, Wrong, Blank) */}
          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              آمار تست (در صورت حل تست در این جلسه)
            </label>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="block text-[11px] text-blue-600 dark:text-blue-400 font-bold mb-1">
                  درست
                </span>
                <input
                  type="number"
                  min="0"
                  value={correct}
                  onChange={(e) => setCorrect(e.target.value)}
                  className="w-full px-2 py-2 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-blue-600 dark:text-blue-400"
                  dir="ltr"
                />
              </div>

              <div>
                <span className="block text-[11px] text-rose-600 dark:text-rose-400 font-bold mb-1">
                  غلط
                </span>
                <input
                  type="number"
                  min="0"
                  value={wrong}
                  onChange={(e) => setWrong(e.target.value)}
                  className="w-full px-2 py-2 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-rose-600 dark:text-rose-400"
                  dir="ltr"
                />
              </div>

              <div>
                <span className="block text-[11px] text-slate-400 font-bold mb-1">
                  نزده
                </span>
                <input
                  type="number"
                  min="0"
                  value={blank}
                  onChange={(e) => setBlank(e.target.value)}
                  className="w-full px-2 py-2 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono text-slate-500"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              یادداشت یا نکته این پارت
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثلاً: حل تست‌های کنکور ۹۸ تا ۱۴۰۲ فصل ۲"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25 hover:bg-blue-700 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>ثبت جلسه</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
