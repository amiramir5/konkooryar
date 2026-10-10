import React, { useState } from 'react';
import {
  BookOpenCheck,
  Star,
  Plus,
  Check,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { MistakeCard } from '../../types';
import {
  SUBJECTS,
  SUBJECT_CHAPTERS,
  MISTAKE_CAUSES,
  LEITNER_DAYS,
  getSubject,
  KONKOOR_SUBJECTS,
  FINAL_SUBJECTS,
} from '../../lib/constants';
import { Subject3DIcon } from '../common/Subject3DIcon';
import {
  addDays,
  faNum,
  formatPersianDate,
  studyDayKey,
  toInt,
} from '../../lib/jalali';
import { uid } from '../../lib/storage';
import { extractOcrText } from '../../lib/ai';
import { AnimatedDeleteButton } from '../AnimatedDeleteButton';

interface MistakesViewProps {
  mistakes: MistakeCard[];
  checklist: Record<string, boolean>;
  onAddMistake: (card: MistakeCard) => void;
  onReviewResult: (cardId: string, remembered: boolean) => void;
  onDeleteMistake: (cardId: string) => void;
  onToggleChecklistItem: (key: string) => void;
  onOpenLightbox: (src: string) => void;
}

const REVIEW_STAGES = [
  { id: 'study', label: 'مطالعه اصلی' },
  { id: 'r1', label: 'مرور ۱ (۲۴س)' },
  { id: 'r2', label: 'مرور ۲ (هفته)' },
  { id: 'r3', label: 'مرور ۳ (ماه)' },
  { id: 'final', label: 'جمع‌بندی' },
];

export const MistakesView: React.FC<MistakesViewProps> = ({
  mistakes,
  checklist,
  onAddMistake,
  onReviewResult,
  onDeleteMistake,
  onToggleChecklistItem,
  onOpenLightbox,
}) => {
  const today = studyDayKey();

  // New Mistake Form State
  const [subject, setSubject] = useState('bio');
  const [grade, setGrade] = useState<'دهم' | 'یازدهم' | 'دوازدهم'>('دهم');
  const [chapter, setChapter] = useState('');
  const [cause, setCause] = useState(MISTAKE_CAUSES[0]);
  const [importance, setImportance] = useState(3);
  const [question, setQuestion] = useState('');
  const [source, setSource] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');

  // Checklist Filter State
  const [checklistGrade, setChecklistGrade] = useState<'دهم' | 'یازدهم' | 'دوازدهم'>('دهم');
  const [checklistSubject, setChecklistSubject] = useState('bio');

  // Filter chapters based on selected grade
  const allSubjChapters = SUBJECT_CHAPTERS[subject] || [];
  const filteredChapters = allSubjChapters.filter((ch) => ch.startsWith(`${grade}:`));

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('حجم تصویر نباید بیشتر از ۸ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleOcrExtract = async () => {
    if (!imageBase64) return;
    setIsOcrLoading(true);
    setOcrError('');

    try {
      const text = await extractOcrText(imageBase64);
      if (text) {
        setQuestion((prev) => (prev ? `${prev}\n\n${text}` : text));
      }
    } catch (err: any) {
      setOcrError(err.message || 'خطا در استخراج متن');
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const now = Date.now();
    const newCard: MistakeCard = {
      id: uid(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      device_id: 'client',
      subject,
      chapter: chapter || undefined,
      cause,
      question: question.trim(),
      source: source.trim() || undefined,
      importance,
      image_data: imageBase64,
      box: 1,
      next_review: addDays(today, LEITNER_DAYS[0]),
      history: [],
    };

    onAddMistake(newCard);
    setQuestion('');
    setSource('');
    setImageBase64(null);
  };

  // Due for review today
  const dueTodayCards = mistakes.filter(
    (m) => !m.deleted_at && m.next_review <= today
  );

  const activeMistakes = mistakes.filter((m) => !m.deleted_at);

  // Box counts (1 to 5)
  const boxCounts = [1, 2, 3, 4, 5].map(
    (b) => activeMistakes.filter((m) => m.box === b).length
  );

  // Checklist chapters for currently inspected subject & grade
  const currentChecklistChapters = (SUBJECT_CHAPTERS[checklistSubject] || [])
    .filter((ch) => ch.startsWith(`${checklistGrade}:`))
    .map((ch) => ch.replace(`${checklistGrade}:`, '').trim());

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          دفترچه اشتباهات و مرور فاصله‌دار (جعبه لایتنر)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          تثبیت دائم تله‌های تستی با الگوریتم ۵ مرحله‌ای لایتنر و چک‌لیست مرور فصول
        </p>
      </div>

      {/* Leitner Box Progress Tracker */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>توزیع کارت‌ها در مراحل ۵‌گانه لایتنر</span>
          </div>
          <span>مجموع: {faNum(activeMistakes.length)} کارت</span>
        </div>

        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {[1, 2, 3, 4, 5].map((b, idx) => (
            <div
              key={b}
              className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
            >
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
                مرحله {faNum(b)} ({faNum(LEITNER_DAYS[idx])} روز)
              </span>
              <span className="text-lg font-black font-mono text-blue-600 dark:text-blue-400">
                {faNum(boxCounts[idx])}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Due Today Review Deck */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <BookOpenCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              نوبت مرور امروز ({faNum(dueTodayCards.length)} کارت)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            مرور روزانه = تثبیت حافظه بلندمدت
          </span>
        </div>

        {dueTodayCards.length === 0 ? (
          <div className="text-center py-8 text-xs text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/60 dark:border-blue-900/60 flex items-center justify-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>آفرین! هیچ کارت مروری برای امروز باقی نمانده است.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {dueTodayCards.map((card) => {
              const subj = getSubject(card.subject);

              return (
                <div
                  key={card.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Subject3DIcon subject={subj} size="sm" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {subj.name} {card.chapter ? `— ${card.chapter}` : ''}
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
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                            {card.cause}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          مرحله {faNum(card.box)} از ۵
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < card.importance ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line text-right">
                    {card.question}
                  </div>

                  {/* Thumbnail if Image Attached */}
                  {card.image_data && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenLightbox(card.image_data!)}
                        className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 w-24 h-24 shrink-0 bg-slate-100"
                      >
                        <img
                          src={card.image_data}
                          alt="پیوست"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                          مشاهده
                        </span>
                      </button>
                      <span className="text-[11px] text-slate-400">
                        کلیک برای بزرگ‌نمایی تصویر
                      </span>
                    </div>
                  )}

                  {/* Action Buttons: Remembered vs Forgot */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onReviewResult(card.id, true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>کاملاً بلد بودم (صعود)</span>
                      </button>

                      <button
                        onClick={() => onReviewResult(card.id, false)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>یادم نبود (برگشت به ۱)</span>
                      </button>
                    </div>

                    <AnimatedDeleteButton
                      onDelete={() => onDeleteMistake(card.id)}
                      confirmRequired={true}
                      title="حذف کارت"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Mistake Form with OCR & Image Lightbox */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Plus className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            ثبت تست یا نکته جدید در جعبه لایتنر
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Grade Selector (دهم، یازدهم، دوازدهم) */}
          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              پایه تحصیلی
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['دهم', 'یازدهم', 'دوازدهم'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setGrade(g);
                    setChapter('');
                  }}
                  className={`py-2 rounded-xl font-bold transition-colors cursor-pointer ${
                    grade === g
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  پایه {g}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                درس
              </label>
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setChapter('');
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
                فصل مصوب ({grade})
              </label>
              <select
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="">— انتخاب فصل یا تایپ دلخواه —</option>
                {filteredChapters.map((ch, idx) => {
                  const label = ch.replace(`${grade}:`, '').trim();
                  return (
                    <option key={idx} value={label}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                علت غلط یا نزده
              </label>
              <select
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                {MISTAKE_CAUSES.map((c, idx) => (
                  <option key={idx} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                درجه اهمیت و تکرار تست (۱ تا ۵)
              </label>
              <div className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setImportance(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= importance
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
              صورت سوال، تله تستی یا نکته کلیدی
            </label>
            <textarea
              rows={4}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="متن سوال را تایپ کنید یا با دکمه زیر تصویر آن را آپلود و متن را استخراج کنید…"
              required
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Image & OCR Extractor */}
          <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>پیوست عکس سوال</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImagePick}
                  className="hidden"
                />
              </label>

              {imageBase64 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOcrExtract}
                    disabled={isOcrLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isOcrLoading ? 'در حال استخراج…' : 'استخراج خودکار متن با AI'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageBase64(null)}
                    className="text-xs text-rose-500 hover:underline cursor-pointer"
                  >
                    حذف تصویر
                  </button>
                </div>
              )}
            </div>

            {ocrError && (
              <p className="text-rose-600 dark:text-rose-400 text-xs">{ocrError}</p>
            )}

            {imageBase64 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenLightbox(imageBase64)}
                  className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group cursor-pointer"
                >
                  <img
                    src={imageBase64}
                    alt="پیش‌نمایش"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold">
                    بزرگ‌نمایی
                  </div>
                </button>
                <span className="text-[11px] text-slate-400">
                  تصویر پیوست شد. با دکمه هوشمند بالا می‌توانید متن سوال را مستقیماً استخراج کنید.
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
              منبع یا نام کتاب تست (اختیاری)
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="مثلاً: کنکور تیر ۱۴۰۳، خیلی‌سبز، نشر الگو"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت در خانه اول لایتنر</span>
          </button>
        </form>
      </div>

      {/* Chapter-by-Chapter Review Checklist */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              چک‌لیست مرور مبحث‌به‌مبحث کنکور
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              پیگیری ۵ مرحله‌ای مطالعه اصلی، ۳ بار مرور فاصله‌دار و جمع‌بندی نهایی هر فصل
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={checklistSubject}
              onChange={(e) => setChecklistSubject(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <optgroup label="دروس اختصاصی کنکور (۴ تخصصی + زمین‌شناسی)">
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

            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
              {(['دهم', 'یازدهم', 'دوازدهم'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setChecklistGrade(g)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    checklistGrade === g
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chapters list */}
        <div className="space-y-3">
          {currentChecklistChapters.map((chName, idx) => {
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  <span className="text-blue-600 dark:text-blue-400 ml-1.5 font-mono">
                    {faNum(idx + 1)}.
                  </span>
                  <span>{chName}</span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 shrink-0">
                  {REVIEW_STAGES.map((st) => {
                    const key = `${checklistSubject}|${checklistGrade}|${idx}|${st.id}`;
                    const isChecked = !!checklist[key];

                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onToggleChecklistItem(key)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border text-center transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
