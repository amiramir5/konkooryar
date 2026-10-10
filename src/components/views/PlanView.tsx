import React, { useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  Sparkles,
  BookOpen,
  StickyNote,
} from 'lucide-react';
import { DailyPlan, PlanItem, ProgressEntry, QuickNote, Session } from '../../types';
import {
  calcKonkoorPercent,
  faNum,
  fmtHM,
  fmtPercent,
  formatPersianDate,
  getWeekDays,
  studyDayKey,
} from '../../lib/jalali';
import { SUBJECTS, SUBJECT_CHAPTERS, getSubject, KONKOOR_SUBJECTS, FINAL_SUBJECTS } from '../../lib/constants';
import { uid } from '../../lib/storage';
import { AnimatedDeleteButton } from '../AnimatedDeleteButton';
import { Subject3DIcon } from '../common/Subject3DIcon';

interface PlanViewProps {
  plans: DailyPlan[];
  progressList: ProgressEntry[];
  notes: QuickNote[];
  sessions: Session[];
  onSavePlan: (plan: DailyPlan) => void;
  onAddProgress: (entry: ProgressEntry) => void;
  onDeleteProgress: (id: string) => void;
  onAddNote: (note: QuickNote) => void;
  onDeleteNote: (id: string) => void;
  onOpenTimeWheelModal: (currentTime: string) => void;
  onAiSuggestPlan: () => void;
}

export const PlanView: React.FC<PlanViewProps> = ({
  plans,
  progressList,
  notes,
  sessions,
  onSavePlan,
  onAddProgress,
  onDeleteProgress,
  onAddNote,
  onDeleteNote,
  onOpenTimeWheelModal,
  onAiSuggestPlan,
}) => {
  const today = studyDayKey();
  const weekDays = getWeekDays(today);

  // Today's plan
  const todayPlan =
    plans.find((p) => !p.deleted_at && p.day === today) || {
      id: uid(),
      day: today,
      wake_time: '06:00',
      items: [],
      created_at: Date.now(),
      updated_at: Date.now(),
      device_id: 'client',
      deleted_at: null,
    };

  // Plan Items State
  const [newTaskText, setNewTaskText] = useState('');

  // Progress Logger State
  const [progSubject, setProgSubject] = useState('bio');
  const [progChapter, setProgChapter] = useState('');
  const [progNote, setProgNote] = useState('');

  // Quick Note State
  const [newNoteText, setNewNoteText] = useState('');

  const completedCount = todayPlan.items.filter((it) => it.done).length;
  const totalCount = todayPlan.items.length;
  const progressFraction = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggleItem = (index: number) => {
    const updatedItems = [...todayPlan.items];
    updatedItems[index].done = !updatedItems[index].done;

    onSavePlan({
      ...todayPlan,
      items: updatedItems,
      updated_at: Date.now(),
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const updatedItems: PlanItem[] = [
      ...todayPlan.items,
      { id: uid(), text: newTaskText.trim(), done: false },
    ];

    onSavePlan({
      ...todayPlan,
      items: updatedItems,
      updated_at: Date.now(),
    });

    setNewTaskText('');
  };

  const handleDeleteItem = (index: number) => {
    const updatedItems = todayPlan.items.filter((_, i) => i !== index);
    onSavePlan({
      ...todayPlan,
      items: updatedItems,
      updated_at: Date.now(),
    });
  };

  const handleAddProgressEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    const entry: ProgressEntry = {
      id: uid(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      device_id: 'client',
      day: today,
      subject: progSubject,
      chapter: progChapter || 'مبحث عمومی',
      note: progNote.trim(),
    };

    onAddProgress(entry);
    setProgNote('');
  };

  const handleAddQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const now = Date.now();
    const noteObj: QuickNote = {
      id: uid(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      device_id: 'client',
      day: today,
      text: newNoteText.trim(),
      ts: now,
    };

    onAddNote(noteObj);
    setNewNoteText('');
  };

  // Performance today summary
  const todaySessions = sessions.filter((s) => !s.deleted_at && s.day === today);
  const totalSeconds = todaySessions.reduce((sum, s) => sum + s.seconds, 0);
  const totalMinutes = Math.round(totalSeconds / 60);
  const totalCorrect = todaySessions.reduce((sum, s) => sum + s.correct, 0);
  const totalWrong = todaySessions.reduce((sum, s) => sum + s.wrong, 0);
  const totalBlank = todaySessions.reduce((sum, s) => sum + s.blank, 0);
  const totalTests = totalCorrect + totalWrong + totalBlank;
  const masteryPercent = calcKonkoorPercent(totalCorrect, totalWrong, totalBlank);

  const todayProgressList = progressList.filter((p) => !p.deleted_at && p.day === today);
  const todayNotesList = notes.filter((n) => !n.deleted_at && n.day === today);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          برنامه روزانه و چک‌لیست مطالعه
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          تنظیم ساعت بیدارباش، اولویت‌های روز و ثبت پیشرفت فصول کنکور
        </p>
      </div>

      {/* Week Calendar Strip */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-600 dark:text-slate-400">
          <span>تقویم هفته جاری</span>
          <span className="text-blue-600 dark:text-blue-400">
            {formatPersianDate(today, 'weekday')}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((wd) => {
            const isToday = wd.iso === today;
            const hasStudy = sessions.some((s) => !s.deleted_at && s.day === wd.iso);

            return (
              <div
                key={wd.iso}
                className={`py-3 px-1 rounded-xl text-center flex flex-col items-center gap-1 transition-colors ${
                  isToday
                    ? 'bg-blue-600 text-white font-black shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="text-[11px] opacity-80">{wd.weekdayName}</span>
                <span className="font-mono text-sm font-bold">{faNum(wd.dayNum)}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isToday
                      ? 'bg-white'
                      : hasStudy
                      ? 'bg-blue-500'
                      : 'bg-transparent'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Wake-up Time & Checklist */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                چک‌لیست اهداف امروز
              </h3>
            </div>

            {/* Wake Up Time Button */}
            <button
              onClick={() => onOpenTimeWheelModal(todayPlan.wake_time || '06:00')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>بیدارباش: {faNum(todayPlan.wake_time || '۰۶:۰۰')}</span>
            </button>
          </div>

          {/* Checklist Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>میزان پیشرفت اهداف</span>
              <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                {faNum(completedCount)} از {faNum(totalCount)} ({fmtPercent(progressFraction)})
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progressFraction}%` }}
              />
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {todayPlan.items.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                هنوز هدفی برای امروز ننوشته‌اید. با فرم زیر اضافه کنید.
              </div>
            ) : (
              todayPlan.items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    item.done
                      ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 shadow-xs'
                  }`}
                >
                  <button
                    onClick={() => handleToggleItem(idx)}
                    className="flex items-center gap-2.5 text-right flex-1 cursor-pointer"
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span
                      className={`text-xs ${
                        item.done
                          ? 'line-through text-slate-400'
                          : 'text-slate-800 dark:text-slate-200 font-medium'
                      }`}
                    >
                      {item.text}
                    </span>
                  </button>

                  <AnimatedDeleteButton
                    onDelete={() => handleDeleteItem(idx)}
                    size="sm"
                    title="حذف هدف"
                  />
                </div>
              ))
            )}
          </div>

          {/* Add Item Input */}
          <form onSubmit={handleAddItem} className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="هدف جدید… مثلاً: حل ۵۰ تست نوسان فیزیک"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <button
            type="button"
            onClick={onAiSuggestPlan}
            className="w-full py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100 text-blue-800 dark:text-blue-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>دریافت پیشنهاد هوشمند برنامه مطالعه با AI</span>
          </button>
        </div>

        {/* Progress Tracker (پیشرفت درسی) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                ثبت پیشرفت فصول درسی امروز
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">راهنمای مشاور هوشمند</span>
          </div>

          <form onSubmit={handleAddProgressEntry} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  درس
                </label>
                <select
                  value={progSubject}
                  onChange={(e) => {
                    setProgSubject(e.target.value);
                    setProgChapter('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
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
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  فصل / مبحث
                </label>
                <select
                  value={progChapter}
                  onChange={(e) => setProgChapter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="">— انتخاب فصل —</option>
                  {(SUBJECT_CHAPTERS[progSubject] || []).map((ch, idx) => (
                    <option key={idx} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                توضیح کوتاه پیشرفت
              </label>
              <input
                type="text"
                value={progNote}
                onChange={(e) => setProgNote(e.target.value)}
                placeholder="مثلاً: تست‌های سخت فصل گوارش تمام شد و نکات در خلاصه وارد گردید"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت پیشرفت این مبحث</span>
            </button>
          </form>

          {/* Today's logged progress list */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {todayProgressList.length === 0 ? (
              <p className="text-center py-4 text-xs text-slate-400">
                امروز پیشرفتی ثبت نشده است.
              </p>
            ) : (
              todayProgressList.map((p) => {
                const subj = getSubject(p.subject);
                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Subject3DIcon subject={subj} size="xs" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                            {subj.name} — {p.chapter}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                              subj.category === 'konkoor'
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {subj.categoryLabel || 'درس'}
                          </span>
                        </div>
                        {p.note && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {p.note}
                          </p>
                        )}
                      </div>
                    </div>
                    <AnimatedDeleteButton
                      onDelete={() => onDeleteProgress(p.id)}
                      size="sm"
                      title="حذف پیشرفت"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Notes & Today's Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Quick Notes */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <StickyNote className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              یادداشت‌های سریع امروز
            </h3>
          </div>

          <form onSubmit={handleAddQuickNote} className="flex items-center gap-2">
            <input
              type="text"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="نکته، ایده یا تذکر برای امروز…"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-2">
            {todayNotesList.length === 0 ? (
              <p className="text-center py-4 text-xs text-slate-400">
                یادداشتی برای امروز ثبت نشده است.
              </p>
            ) : (
              todayNotesList.map((note) => (
                <div
                  key={note.id}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-2"
                >
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {note.text}
                  </span>
                  <AnimatedDeleteButton
                    onDelete={() => onDeleteNote(note.id)}
                    size="sm"
                    title="حذف یادداشت"
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* End of Day Summary Card */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              خلاصه کارنامه و عملکرد امروز
            </h3>
          </div>

          <div className="space-y-3 text-xs leading-loose">
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">مجموع زمان مطالعه</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {fmtHM(totalMinutes)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">مجموع تست‌های حل‌شده</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {faNum(totalTests)} تست
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">درست / غلط / نزده</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {faNum(totalCorrect)} / {faNum(totalWrong)} / {faNum(totalBlank)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">درصد نهایی با نمره منفی</span>
              <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                {totalTests > 0 ? fmtPercent(masteryPercent) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
