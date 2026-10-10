import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { faNum } from '../../lib/jalali';

interface TimeWheelModalProps {
  isOpen: boolean;
  initialTime?: string; // HH:mm
  onClose: () => void;
  onSave: (timeStr: string) => void;
}

export const TimeWheelModal: React.FC<TimeWheelModalProps> = ({
  isOpen,
  initialTime = '06:00',
  onClose,
  onSave,
}) => {
  const [hour, setHour] = useState(() => {
    const parts = (initialTime || '06:00').split(':');
    return parseInt(parts[0], 10) || 6;
  });
  const [minute, setMinute] = useState(() => {
    const parts = (initialTime || '06:00').split(':');
    return parseInt(parts[1], 10) || 0;
  });

  if (!isOpen) return null;

  const handleSave = () => {
    const formatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    onSave(formatted);
    onClose();
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 5 min steps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              انتخاب ساعت بیدارباش
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Big Preview */}
        <div className="text-center py-4 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
          <span className="text-3xl font-black tracking-wider font-mono text-blue-600 dark:text-blue-400" dir="ltr">
            {faNum(String(hour).padStart(2, '0'))}:{faNum(String(minute).padStart(2, '0'))}
          </span>
          <span className="block text-xs text-slate-400 mt-1">صبحگاهی</span>
        </div>

        {/* Quick Stepper Wheels */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Hour Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 text-center">
              ساعت (۰ تا ۲۳)
            </label>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 p-1 space-y-1">
              {hours.map((h) => (
                <button
                  key={h}
                  onClick={() => setHour(h)}
                  className={`w-full py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                    hour === h
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {faNum(String(h).padStart(2, '0'))}
                </button>
              ))}
            </div>
          </div>

          {/* Minute Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 text-center">
              دقیقه
            </label>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 p-1 space-y-1">
              {minutes.map((m) => (
                <button
                  key={m}
                  onClick={() => setMinute(m)}
                  className={`w-full py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                    minute === m
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {faNum(String(m).padStart(2, '0'))}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            انصراف
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/25 hover:bg-blue-700 transition-colors"
          >
            ذخیره ساعت
          </button>
        </div>
      </div>
    </div>
  );
};
