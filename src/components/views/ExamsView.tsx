import React, { useState } from 'react';
import {
  FileCheck2,
  Sparkles,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Percent,
  FileText,
  Upload,
  BookOpen,
} from 'lucide-react';
import { Exam, QuizQuestion } from '../../types';
import { SUBJECTS, SUBJECT_CHAPTERS, getSubject, KONKOOR_SUBJECTS, FINAL_SUBJECTS } from '../../lib/constants';
import { calcKonkoorPercent, faNum, formatPersianDate, fmtPercent, studyDayKey, toInt } from '../../lib/jalali';
import { uid } from '../../lib/storage';
import { generateQuiz, extractDocumentText } from '../../lib/ai';
import { AnimatedDeleteButton } from '../AnimatedDeleteButton';
import { Subject3DIcon } from '../common/Subject3DIcon';

interface ExamsViewProps {
  exams: Exam[];
  onAddExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
  onLaunchQuizModal: (questions: QuizQuestion[], subject: string, topic: string) => void;
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  exams,
  onAddExam,
  onDeleteExam,
  onLaunchQuizModal,
}) => {
  // Manual Exam Form State
  const [subject, setSubject] = useState('bio');
  const [correct, setCorrect] = useState('20');
  const [wrong, setWrong] = useState('5');
  const [blank, setBlank] = useState('5');
  const [duration, setDuration] = useState('30');
  const [note, setNote] = useState('');
  const [day, setDay] = useState(studyDayKey());

  // AI Exam Builder Form State
  const [aiSourceMode, setAiSourceMode] = useState<'textbook' | 'custom_source'>('textbook');
  const [aiSubject, setAiSubject] = useState('bio');
  const [aiChapter, setAiChapter] = useState('');
  const [aiLevel, setAiLevel] = useState('متوسط');
  const [aiCount, setAiCount] = useState(5);
  const [aiTopic, setAiTopic] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [sourceFileName, setSourceFileName] = useState('');
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Live percentage preview
  const previewCorrect = toInt(correct, 0);
  const previewWrong = toInt(wrong, 0);
  const previewBlank = toInt(blank, 0);
  const previewTotal = previewCorrect + previewWrong + previewBlank;
  const previewPercent = calcKonkoorPercent(previewCorrect, previewWrong, previewBlank);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (previewTotal === 0) return;

    const newExam: Exam = {
      id: uid(),
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
      device_id: 'client',
      subject,
      day,
      correct: previewCorrect,
      wrong: previewWrong,
      blank: previewBlank,
      duration: toInt(duration, 0),
      percent: previewPercent,
      note: note.trim(),
    };

    onAddExam(newExam);
    setNote('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSourceFileName(file.name);
    setAiError('');

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setIsExtractingPdf(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = (event.target?.result as string) || '';
          const text = await extractDocumentText(base64Data, 'application/pdf');
          setSourceText(text);
        } catch (err: any) {
          setAiError(err.message || 'خطا در استخراج متن از PDF. می‌توانید متن را مستقیماً در کادر پیست نمایید.');
        } finally {
          setIsExtractingPdf(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        setSourceText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleAiBuildExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAiLoading(true);
    setAiError('');

    try {
      const topicToBuild = aiTopic.trim() || aiChapter || getSubject(aiSubject).name;
      const questions = await generateQuiz(
        getSubject(aiSubject).name,
        aiChapter,
        topicToBuild,
        aiLevel,
        aiCount,
        aiSourceMode === 'custom_source' ? sourceText : undefined
      );

      if (!questions || questions.length === 0) {
        throw new Error('سوالی توسط هوش مصنوعی تولید نشد. مجدداً تلاش کنید.');
      }

      onLaunchQuizModal(questions, aiSubject, topicToBuild);
    } catch (err: any) {
      setAiError(err.message || 'خطا در ارتباط با هوش مصنوعی');
    } finally {
      setIsAiLoading(false);
    }
  };

  const sortedExams = [...exams]
    .filter((e) => !e.deleted_at)
    .sort((a, b) => b.created_at - a.created_at);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          مدیریت آزمون‌ها و درصدسنج تستی
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          ثبت آزمون‌های کلاسی و جامع با نمره منفی، و آزمون‌ساز هوشمند منطبق بر کتب درسی و جزوات
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Manual Exam Form */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                ثبت کارنامه آزمون
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">فرمول رسمی سازمان سنجش</span>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  درس
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
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
                  مدت آزمون (دقیقه)
                </label>
                <input
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-center"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Questions count */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="block text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1">
                  تعداد درست
                </span>
                <input
                  type="number"
                  min="0"
                  value={correct}
                  onChange={(e) => setCorrect(e.target.value)}
                  className="w-full p-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-800 font-mono font-bold text-blue-600 dark:text-blue-400 text-center"
                  dir="ltr"
                />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1">
                  تعداد غلط
                </span>
                <input
                  type="number"
                  min="0"
                  value={wrong}
                  onChange={(e) => setWrong(e.target.value)}
                  className="w-full p-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-800 font-mono font-bold text-rose-600 dark:text-rose-400 text-center"
                  dir="ltr"
                />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 mb-1">
                  تعداد نزده
                </span>
                <input
                  type="number"
                  min="0"
                  value={blank}
                  onChange={(e) => setBlank(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-500 text-center"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Live Percentage Preview */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  درصد محاسبه‌شده با نمره منفی:
                </span>
                <span className="text-[10px] text-slate-400">
                  مجموع: {faNum(previewTotal)} سوال
                </span>
              </div>
              <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                {previewTotal > 0 ? fmtPercent(previewPercent) : '—'}
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                توضیحات آزمون (اختیاری)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثلاً: آزمون جامع سنجش مبحث تابع و مثلثات"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            <button
              type="submit"
              disabled={previewTotal === 0}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت آزمون در سوابق</span>
            </button>
          </form>
        </div>

        {/* AI Exam Generator */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                آزمون‌ساز تستی هوش مصنوعی
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Gemini 2.5
            </span>
          </div>

          {/* Mode Switch Tabs: Standard Textbook vs Custom Document (Zerang AI model) */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setAiSourceMode('textbook')}
              className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                aiSourceMode === 'textbook'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>مباحث کتب درسی کنکور</span>
            </button>
            <button
              type="button"
              onClick={() => setAiSourceMode('custom_source')}
              className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                aiSourceMode === 'custom_source'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>متن و منبع جزوه (مدل زرنگ)</span>
            </button>
          </div>

          <form onSubmit={handleAiBuildExam} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  درس مورد نظر
                </label>
                <select
                  value={aiSubject}
                  onChange={(e) => {
                    setAiSubject(e.target.value);
                    setAiChapter('');
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
                  سطح سوالات
                </label>
                <select
                  value={aiLevel}
                  onChange={(e) => setAiLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="آسان">خط به خط و آسان کتاب</option>
                  <option value="متوسط">متوسط و استاندارد کنکور</option>
                  <option value="دشوار">دشوار و تله‌دار کنکور سراسری</option>
                </select>
              </div>
            </div>

            {aiSourceMode === 'textbook' ? (
              <>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    فصل مصوب کتاب درسی
                  </label>
                  <select
                    value={aiChapter}
                    onChange={(e) => setAiChapter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="">— انتخاب فصل پیش‌فرض یا تایپ دلخواه —</option>
                    {(SUBJECT_CHAPTERS[aiSubject] || []).map((ch, idx) => (
                      <option key={idx} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    مبحث ویژه (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="مثلاً: پروتئین‌سازی، چرخه‌های تخمیر یا هیدرولیز"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-600 dark:text-slate-400">
                    متن یا صفحات مورد نظر کتاب/جزوه
                  </label>
                  <label className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer">
                    <Upload className="w-3 h-3" />
                    <span>آپلود فایل کتاب (PDF / متن)</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {isExtractingPdf && (
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin text-blue-600" />
                    <span>در حال استخراج دقیق متن کتاب درسی از فایل PDF با هوش مصنوعی...</span>
                  </div>
                )}
                {sourceFileName && !isExtractingPdf && (
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>فایل انتخاب‌شده: {sourceFileName}</span>
                  </div>
                )}
                <textarea
                  rows={4}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="متن صفحات کتاب درسی یا نکات جزوه را اینجا بچسبانید تا هوش مصنوعی زرنگ دقیقاً از همین متن سوالات تستی و دام‌دار طرح کند..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                تعداد سوالات (۲ تا ۱۵)
              </label>
              <input
                type="number"
                min="2"
                max="15"
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value) || 5)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-center"
                dir="ltr"
              />
            </div>

            {aiError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
                {aiError}
              </div>
            )}

            <button
              type="submit"
              disabled={isAiLoading || (aiSourceMode === 'custom_source' && sourceText.trim().length < 20)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isAiLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>در حال طراحی سوالات استاندارد کتاب درسی…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>تولید آزمون و شروع پاسخ‌گویی</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Historical Exams Log */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            کارنامه آزمون‌های ثبت‌شده ({faNum(sortedExams.length)})
          </h3>
        </div>

        {sortedExams.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            هنوز آزمونی ثبت نشده است. از فرم بالا برای ثبت یا تولید آزمون استفاده کنید.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedExams.map((exam) => {
              const subj = getSubject(exam.subject);
              const isPassing = exam.percent >= 50;

              return (
                <div
                  key={exam.id}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Subject3DIcon subject={subj} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {subj.name}
                          </h4>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                              subj.category === 'konkoor'
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {subj.categoryLabel || 'درس'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {formatPersianDate(exam.day, 'short')}
                          {exam.duration ? ` · ${faNum(exam.duration)} دقیقه` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-base font-black ${
                          isPassing
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {fmtPercent(exam.percent)}
                      </span>
                      <AnimatedDeleteButton
                        onDelete={() => onDeleteExam(exam.id)}
                        confirmRequired={true}
                        title="حذف آزمون"
                      />
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-blue-600 dark:text-blue-400">
                      درست: {faNum(exam.correct)}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400">
                      غلط: {faNum(exam.wrong)}
                    </span>
                    <span className="text-slate-400">
                      نزده: {faNum(exam.blank)}
                    </span>
                  </div>

                  {exam.note && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {exam.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
