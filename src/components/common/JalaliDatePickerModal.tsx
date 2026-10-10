import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import {
  daysInJMonth,
  faNum,
  isoFromJalali,
  jalaliPartsFromIso,
  studyDayKey,
  formatPersianDate,
} from '../../lib/jalali';

interface JalaliDatePickerModalProps {
  isOpen: boolean;
  initialIso?: string; // YYYY-MM-DD
  onClose: () => void;
  onSelect: (isoDate: string) => void;
  title?: string;
}

const MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const WEEK_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export const JalaliDatePickerModal: React.FC<JalaliDatePickerModalProps> = ({
  isOpen,
  initialIso,
  onClose,
  onSelect,
  title = 'انتخاب تاریخ شمسی',
}) => {
  const currentIso = initialIso || studyDayKey();
  const initialJp = jalaliPartsFromIso(currentIso) || [1405, 1, 1];

  const [jy, setJy] = useState(initialJp[0]);
  const [jm, setJm] = useState(initialJp[1]);
  const [selectedIso, setSelectedIso] = useState(currentIso);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (jm === 1) {
      setJy((prev) => prev - 1);
      setJm(12);
    } else {
      setJm((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (jm === 12) {
      setJy((prev) => prev + 1);
      setJm(1);
    } else {
      setJm((prev) => prev + 1);
    }
  };

  const daysCount = daysInJMonth(jy, jm);

  // Compute offset for the 1st day of this Jalali month
  const firstDayIso = isoFromJalali(jy, jm, 1);
  const firstDayDt = new Date(firstDayIso);
  const jsDay = firstDayDt.getDay();
  const offset = (jsDay + 1) % 7; // 0 for شنبه

  const cells = [];
  for (let i = 0; i < offset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysCount; d++) {
    cells.push(d);
  }

  const handleConfirm = () => {
    onSelect(selectedIso);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Date Summary */}
        <div className="text-center py-2 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl mb-4 border border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
            {formatPersianDate(selectedIso, 'weekday')}
          </span>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-2 mb-3">
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="ماه بعد"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
            {MONTH_NAMES[jm - 1]} {faNum(jy)}
          </span>

          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="ماه قبل"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {WEEK_DAYS.map((w, idx) => (
            <span
              key={idx}
              className="text-[11px] font-bold text-slate-400 dark:text-slate-500 py-1"
            >
              {w}
            </span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`empty-${idx}`} className="h-9" />;
            }

            const cellIso = isoFromJalali(jy, jm, dayNum);
            const isSelected = cellIso === selectedIso;
            const isToday = cellIso === studyDayKey();

            return (
              <button
                key={cellIso}
                type="button"
                onClick={() => setSelectedIso(cellIso)}
                className={`h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-black'
                    : isToday
                    ? 'border-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {faNum(dayNum)}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={() => setSelectedIso(studyDayKey())}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            امروز
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/25 hover:bg-blue-700 transition-colors"
          >
            انتخاب این روز
          </button>
        </div>
      </div>
    </div>
  );
};
