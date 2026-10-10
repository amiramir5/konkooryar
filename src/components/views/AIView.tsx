import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  BookOpen,
  Presentation,
  AlertTriangle,
  Lightbulb,
  Download,
  CheckCircle2,
  BrainCircuit,
  MessageSquare,
  BarChart2,
  Calendar,
  Camera,
  Image as ImageIcon,
  Zap,
} from 'lucide-react';
import {
  MistakeCard,
  ProgressEntry,
  Session,
  SlideDeck,
  TopicExplanation,
  MistakesAnalysis,
} from '../../types';
import {
  SUBJECTS,
  SUBJECT_CHAPTERS,
  getSubject,
  KONKOOR_SUBJECTS,
  FINAL_SUBJECTS,
  getGoftarsForChapter,
} from '../../lib/constants';
import {
  explainTopic,
  generateSlides,
  analyzeMistakes,
  consultCoach,
  solvePhotoQuestion,
  PhotoSolveResult,
} from '../../lib/ai';
import { FormattedCoachMessage } from '../FormattedCoachMessage';
import { Subject3DIcon } from '../common/Subject3DIcon';

interface AIViewProps {
  sessions: Session[];
  mistakes: MistakeCard[];
  progressList: ProgressEntry[];
  soundEnabled: boolean;
}

export const AIView: React.FC<AIViewProps> = ({
  sessions,
  mistakes,
  progressList,
}) => {
  const [activeTab, setActiveTab] = useState<'coach' | 'photo' | 'slides' | 'explain' | 'mistakes'>('coach');

  // Coach Chat State
  const [coachGoal, setCoachGoal] = useState('مطالعه روزانه ۱۰ ساعت با تمرکز روی زیست و شیمی کنکور ۱۴۰۶');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; text: string }>
  >([
    {
      role: 'assistant',
      text: 'سلام. من مشاور تخصصی و کارشناس پذیرش کنکور سراسری، سوابق تحصیلی و دانشگاه‌ها هستم. کلیه تحلیل‌ها بر پایه آخرین مصوبات رسمی سازمان سنجش، آموزش و پرورش و کارنامه‌های واقعی ارائه می‌شود. سوال یا موضوع خود را مطرح کنید.',
    },
  ]);
  const [isCoachLoading, setIsCoachLoading] = useState(false);

  // Auto-scroll ref
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isCoachLoading]);

  // Topic Explainer State
  const [explainSubj, setExplainSubj] = useState('bio');
  const [explainChapter, setExplainChapter] = useState('');
  const [explainGoftar, setExplainGoftar] = useState('');
  const [explainCustom, setExplainCustom] = useState('');
  const [isExplainLoading, setIsExplainLoading] = useState(false);
  const [explainResult, setExplainResult] = useState<TopicExplanation | null>(null);
  const [explainError, setExplainError] = useState('');

  // Slides State
  const [slidesSubj, setSlidesSubj] = useState('bio');
  const [slidesChapter, setSlidesChapter] = useState('');
  const [slidesGoftar, setSlidesGoftar] = useState('');
  const [slidesCustom, setSlidesCustom] = useState('');
  const [slidesCount, setSlidesCount] = useState(6);
  const [isSlidesLoading, setIsSlidesLoading] = useState(false);
  const [slidesResult, setSlidesResult] = useState<SlideDeck | null>(null);
  const [slidesError, setSlidesError] = useState('');

  // Photo Question Solver State (Strictly Iranian High School Textbook Aligned)
  const [photoSubj, setPhotoSubj] = useState('bio');
  const [photoChapter, setPhotoChapter] = useState('');
  const [photoGoftar, setPhotoGoftar] = useState('');
  const [photoImage, setPhotoImage] = useState<string | null>(null);
  const [photoCustom, setPhotoCustom] = useState('');
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [photoResult, setPhotoResult] = useState<PhotoSolveResult | null>(null);
  const [photoError, setPhotoError] = useState('');

  // Mistake Analysis State
  const [isMistakesLoading, setIsMistakesLoading] = useState(false);
  const [mistakesResult, setMistakesResult] = useState<MistakesAnalysis | null>(null);
  const [mistakesError, setMistakesError] = useState('');

  // Coach Send
  const handleSendCoach = async (textToSend?: string, mode?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text && !mode) return;

    const newHistory = [...chatMessages, { role: 'user' as const, text: text || mode || '' }];
    setChatMessages(newHistory);
    setChatInput('');
    setIsCoachLoading(true);

    try {
      const context = {
        goal: coachGoal,
        userHistory: 'داوطلب سال سوم کنکور با رتبه‌های قبلی ۳۲هزار و ۲۰هزار (لطفاً بدون تکرار بی‌مورد در مکالمه، به عنوان پیش‌زمینه ذهنی مدنظر باشد)',
        totalSessions: sessions.filter((s) => !s.deleted_at).length,
        totalMistakes: mistakes.filter((m) => !m.deleted_at).length,
        recentProgress: progressList.slice(-10),
      };

      const reply = await consultCoach(text, context, mode || 'عمومی', chatMessages);
      setChatMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `خطا در دریافت پاسخ: ${err.message || 'مشکلی رخ داد.'}` },
      ]);
    } finally {
      setIsCoachLoading(false);
    }
  };

  // Explain Submit
  const handleExplainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExplainLoading(true);
    setExplainError('');
    setExplainResult(null);

    const topic = explainCustom.trim() || explainChapter || getSubject(explainSubj).name;

    try {
      const res = await explainTopic(topic, getSubject(explainSubj).name);
      setExplainResult(res);
    } catch (err: any) {
      setExplainError(err.message || 'خطا در ارتباط با هوش مصنوعی');
    } finally {
      setIsExplainLoading(false);
    }
  };

  // Slides Submit
  const handleSlidesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSlidesLoading(true);
    setSlidesError('');
    setSlidesResult(null);

    try {
      const res = await generateSlides({
        subject: getSubject(slidesSubj).name,
        chapter: slidesChapter,
        goftar: slidesGoftar,
        topic: slidesCustom.trim(),
        count: slidesCount,
      });
      setSlidesResult(res);
    } catch (err: any) {
      setSlidesError(err.message || 'خطا در ساخت اسلایدها');
    } finally {
      setIsSlidesLoading(false);
    }
  };

  // Photo Question Solver Submit
  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoImage && !photoCustom.trim()) {
      setPhotoError('لطفاً تصویر سوال را آپلود کنید یا متن آن را بنویسید.');
      return;
    }

    setIsPhotoLoading(true);
    setPhotoError('');
    setPhotoResult(null);

    try {
      const res = await solvePhotoQuestion({
        imageBase64: photoImage || undefined,
        subject: getSubject(photoSubj).name,
        chapter: photoChapter,
        goftar: photoGoftar,
        customText: photoCustom.trim(),
      });
      setPhotoResult(res);
    } catch (err: any) {
      setPhotoError(err.message || 'خطا در تحلیل سوال تصویری');
    } finally {
      setIsPhotoLoading(false);
    }
  };

  // Download slides as HTML
  const handleDownloadSlidesHtml = () => {
    if (!slidesResult) return;

    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${slidesResult.deck_title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #fff; padding: 2rem; margin: 0; }
    .slide { background: #1e293b; border-radius: 1.5rem; padding: 3rem; margin-bottom: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.3); border: 1px solid #334155; }
    h1 { color: #60a5fa; font-size: 2rem; border-bottom: 2px solid #334155; padding-bottom: 1rem; }
    h2 { color: #93c5fd; font-size: 1.5rem; }
    ul { font-size: 1.2rem; line-height: 2.2; }
    .image-prompt { background: #0f172a; border-right: 4px solid #3b82f6; padding: 1rem; border-radius: 0.5rem; font-size: 0.9rem; color: #94a3b8; margin-top: 1.5rem; }
  </style>
</head>
<body>
  <h1>${slidesResult.deck_title}</h1>
  ${slidesResult.slides
    .map(
      (s, idx) => `
    <div class="slide">
      <h2>اسلاید ${idx + 1}: ${s.title}</h2>
      <ul>
        ${s.bullets.map((b) => `<li>${b}</li>`).join('')}
      </ul>
      ${s.image_prompt ? `<div class="image-prompt">نمودار پیشنهادی: ${s.image_prompt}</div>` : ''}
    </div>
  `
    )
    .join('')}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slides-${slidesResult.deck_title}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Analyze Mistakes
  const handleAnalyzeMistakes = async () => {
    setIsMistakesLoading(true);
    setMistakesError('');
    setMistakesResult(null);

    const validItems = mistakes.filter((m) => !m.deleted_at).slice(0, 20);
    if (validItems.length < 2) {
      setMistakesError('حداقل ۲ اشتباه ثبت‌شده در دفترچه نیاز است.');
      setIsMistakesLoading(false);
      return;
    }

    try {
      const res = await analyzeMistakes(
        validItems.map((m) => ({
          subject: getSubject(m.subject).name,
          cause: m.cause,
          question: m.question,
        }))
      );
      setMistakesResult(res);
    } catch (err: any) {
      setMistakesError(err.message || 'خطا در تحلیل اشتباهات');
    } finally {
      setIsMistakesLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span>دستیار هوشمند و مشاور تخصصی کنکور</span>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
            Powered by Gemini
          </span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          مشاوره مستقیم، پاسخ‌های کوتاه و کاربردی، تشریح مفهومی مباحث و کشف خطاهای پنهان
        </p>
      </div>

      {/* Navigation Segmented Controls */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl max-w-2xl text-xs font-bold overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('coach')}
          className={`px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'coach'
              ? 'bg-white dark:bg-[#0c1f38] text-blue-700 dark:text-blue-300 shadow-xs border border-blue-200/50 dark:border-blue-800/60 font-black'
              : 'text-slate-600 hover:text-blue-700 dark:hover:text-blue-300'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>مشاور هوشمند</span>
        </button>

        <button
          onClick={() => setActiveTab('photo')}
          className={`px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'photo'
              ? 'bg-white dark:bg-[#0c1f38] text-blue-700 dark:text-blue-300 shadow-xs border border-blue-200/50 dark:border-blue-800/60 font-black'
              : 'text-slate-600 hover:text-blue-700 dark:hover:text-blue-300'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>حل عکس و تست کتاب</span>
        </button>

        <button
          onClick={() => setActiveTab('slides')}
          className={`px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'slides'
              ? 'bg-white dark:bg-[#0c1f38] text-blue-700 dark:text-blue-300 shadow-xs border border-blue-200/50 dark:border-blue-800/60 font-black'
              : 'text-slate-600 hover:text-blue-700 dark:hover:text-blue-300'
          }`}
        >
          <Presentation className="w-3.5 h-3.5" />
          <span>اسلایدساز کتاب</span>
        </button>

        <button
          onClick={() => setActiveTab('explain')}
          className={`px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'explain'
              ? 'bg-white dark:bg-[#0c1f38] text-blue-700 dark:text-blue-300 shadow-xs border border-blue-200/50 dark:border-blue-800/60 font-black'
              : 'text-slate-600 hover:text-blue-700 dark:hover:text-blue-300'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>آموزش مفهومی</span>
        </button>

        <button
          onClick={() => setActiveTab('mistakes')}
          className={`px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'mistakes'
              ? 'bg-white dark:bg-[#0c1f38] text-blue-700 dark:text-blue-300 shadow-xs border border-blue-200/50 dark:border-blue-800/60 font-black'
              : 'text-slate-600 hover:text-blue-700 dark:hover:text-blue-300'
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>تحلیل اشتباهات</span>
        </button>
      </div>

      {/* Tab 1: AI Study Coach */}
      {activeTab === 'coach' && (
        <div className="rounded-2xl bg-white dark:bg-[#0a1628] border border-blue-100 dark:border-blue-900/50 p-5 shadow-xs space-y-4">
          {/* Goal & constraints settings */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/60 space-y-2">
            <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200 block">
              هدف‌گذاری و محدودیت‌های شما برای مشاور:
            </span>
            <input
              type="text"
              value={coachGoal}
              onChange={(e) => setCoachGoal(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 text-xs border border-blue-200 dark:border-blue-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => handleSendCoach(undefined, 'وضعیت من را تحلیل کن')}
              className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 hover:border-blue-500 bg-blue-50/30 dark:bg-blue-950/30 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <BarChart2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>تحلیل جامع وضعیت امروز من</span>
            </button>
            <button
              onClick={() => handleSendCoach(undefined, 'برای فردا و این هفته برنامه عملی بده')}
              className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 hover:border-blue-500 bg-blue-50/30 dark:bg-blue-950/30 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>تدوین برنامه عملیاتی این هفته</span>
            </button>
            <button
              onClick={() => handleSendCoach(undefined, 'دقیق حساب کن از هدف و بودجه‌بندی چقدر عقب هستم؟')}
              className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 hover:border-blue-500 bg-blue-50/30 dark:bg-blue-950/30 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>چقدر از بودجه‌بندی عقب یا جلو هستم؟</span>
            </button>
          </div>

          {/* Chat Logs */}
          <div
            ref={chatContainerRef}
            className="h-88 overflow-y-auto space-y-3 p-3 bg-slate-50/70 dark:bg-[#071120] rounded-xl border border-slate-100 dark:border-blue-900/40 text-xs scroll-smooth"
          >
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed text-right transition-all duration-200 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                      : 'bg-white dark:bg-[#0d1e35] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-blue-900/60 rounded-tl-xs shadow-xs'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <FormattedCoachMessage content={msg.text} />
                  ) : (
                    <div className="whitespace-pre-line">{msg.text}</div>
                  )}
                </div>
              </div>
            ))}
            {isCoachLoading && (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs py-2 animate-pulse">
                <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>مشاور در حال تحلیل کارشناسی، بررسی مصوبات و تدوین پاسخ مستند است…</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCoach();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="از مشاور بپرسید… مثلاً: چطور تراز فیزیک را از ۵۰ به ۷۰ برسانم؟"
              className="flex-1 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isCoachLoading || !chatInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ارسال</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Topic Explainer */}
      {activeTab === 'explain' && (
        <div className="rounded-2xl bg-white dark:bg-[#0a1628] border border-blue-100 dark:border-blue-900/50 p-5 shadow-xs space-y-5">
          <form onSubmit={handleExplainSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  درس
                </label>
                <select
                  value={explainSubj}
                  onChange={(e) => {
                    setExplainSubj(e.target.value);
                    setExplainChapter('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
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
                  فصل مصوب
                </label>
                <select
                  value={explainChapter}
                  onChange={(e) => setExplainChapter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="">— انتخاب فصل یا وارد کردن مبحث دلخواه در پایین —</option>
                  {(SUBJECT_CHAPTERS[explainSubj] || []).map((ch, idx) => (
                    <option key={idx} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                یا نام دقیق مبحث یا تیپ تستی خاص
              </label>
              <input
                type="text"
                value={explainCustom}
                onChange={(e) => setExplainCustom(e.target.value)}
                placeholder="مثلاً: جهش‌های کوچک و جهش‌های کروموزومی در ژنتیک دوازدهم"
                className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            {explainError && (
              <p className="text-blue-700 dark:text-blue-300 text-xs bg-blue-50 dark:bg-blue-950/50 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800">
                {explainError}
              </p>
            )}

            <button
              type="submit"
              disabled={isExplainLoading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isExplainLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>در حال تدوین آموزش مفهومی…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>توضیح مفهومی و تستی مبحث</span>
                </>
              )}
            </button>
          </form>

          {/* Explanation Output */}
          {explainResult && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0a1628] border border-blue-100 dark:border-blue-900/50 space-y-4 animate-in fade-in text-xs leading-relaxed shadow-xs">
              <h3 className="text-base font-black text-blue-900 dark:text-blue-300">
                {explainResult.title}
              </h3>
              <p className="text-slate-700 dark:text-slate-300">
                {explainResult.intro}
              </p>

              {/* Key points */}
              {explainResult.key_points?.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <h4 className="font-extrabold text-slate-900 dark:text-white">
                    نکات کلیدی و مفهومی:
                  </h4>
                  {explainResult.key_points.map((kp, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-blue-50/40 dark:bg-[#071324] border border-blue-100 dark:border-blue-900/40"
                    >
                      <b className="text-blue-800 dark:text-blue-300 block mb-1">
                        {kp.heading}
                      </b>
                      <p className="text-slate-600 dark:text-slate-300">
                        {kp.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulas */}
              {explainResult.formulas?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50 space-y-1.5">
                  <span className="font-bold text-sky-900 dark:text-sky-300 block">
                    قواعد و فرمول‌های طلایی تستی:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                    {explainResult.formulas.map((f, idx) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pitfalls */}
              {explainResult.pitfalls?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1.5">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                    <span>دام‌های تستی طراحان کنکور:</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                    {explainResult.pitfalls.map((pf, idx) => (
                      <li key={idx}>{pf}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Study Tip */}
              {explainResult.study_tip && (
                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">
                    <b>توصیه مشاور: </b> {explainResult.study_tip}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Photo Question Solver (Strictly Iranian Textbook Aligned) */}
      {activeTab === 'photo' && (
        <div className="rounded-2xl bg-white dark:bg-[#0a1628] border border-blue-100 dark:border-blue-900/50 p-5 shadow-xs space-y-5 animate-in fade-in">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              <span>حل و تحلیل تخصصی عکس تست و کتاب درسی</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              تصویر سوال، تست کنکور یا شکل کتاب را آپلود کنید تا هوش مصنوعی ۱۰۰٪ مطابق خط‌به‌خط کتاب‌های درسی رسمی ایران (پایه‌های دهم، یازدهم و دوازدهم) آن را تحلیل، حل تشریحی و دام‌شناسی کند.
            </p>
          </div>

          <form onSubmit={handlePhotoSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  درس
                </label>
                <select
                  value={photoSubj}
                  onChange={(e) => {
                    setPhotoSubj(e.target.value);
                    setPhotoChapter('');
                    setPhotoGoftar('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <optgroup label="دروس اختصاصی کنکور سراسری">
                    {KONKOOR_SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon3d} {s.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="دروس عمومی نهایی">
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
                  فصل کتاب درسی
                </label>
                <select
                  value={photoChapter}
                  onChange={(e) => {
                    setPhotoChapter(e.target.value);
                    setPhotoGoftar('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">— تشخیص خودکار یا انتخاب فصل —</option>
                  {(SUBJECT_CHAPTERS[photoSubj] || []).map((ch, idx) => (
                    <option key={idx} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              {photoSubj === 'bio' && (
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    گفتار اختصاصی زیست‌شناسی
                  </label>
                  <select
                    value={photoGoftar}
                    onChange={(e) => setPhotoGoftar(e.target.value)}
                    disabled={!photoChapter}
                    className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium disabled:opacity-50"
                  >
                    <option value="">— گفتار فصل یا تشخیص خودکار —</option>
                    {getGoftarsForChapter(photoChapter).map((g, idx) => (
                      <option key={idx} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Image upload box */}
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                تصویر سوال یا صفحه کتاب درسی
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 cursor-pointer transition-colors text-blue-700 dark:text-blue-300 font-bold">
                  <Camera className="w-4 h-4" />
                  <span>انتخاب عکس از گالری یا دوربین</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setPhotoImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                {photoImage && (
                  <div className="flex items-center gap-2">
                    <img
                      src={photoImage}
                      alt="Uploaded test"
                      className="w-12 h-12 object-cover rounded-xl border border-blue-300 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoImage(null)}
                      className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      حذف عکس
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                توضیحات تکمیلی یا متن سوال (اختیاری)
              </label>
              <textarea
                value={photoCustom}
                onChange={(e) => setPhotoCustom(e.target.value)}
                placeholder="در صورت تمایل متن تست یا شماره سوال را اینجا بنویسید…"
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            {photoError && (
              <p className="text-rose-600 dark:text-rose-400 text-xs bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
                {photoError}
              </p>
            )}

            <button
              type="submit"
              disabled={isPhotoLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
            >
              {isPhotoLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>در حال استخراج و تحلیل خط‌به‌خط کتاب درسی…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>حل تشریحی و تحلیل دام تستی (۱۰۰٪ مطابق کتاب)</span>
                </>
              )}
            </button>
          </form>

          {/* Photo Solve Output Cards */}
          {photoResult && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#071324] border border-blue-200 dark:border-blue-900/60 space-y-4 animate-in fade-in shadow-xs text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>مرجع رسمی کتاب درسی: {photoResult.book_reference}</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black">
                  گزینه صحیح: {photoResult.correct_option}
                </span>
              </div>

              {photoResult.transcribed_question && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 font-medium">
                  <span className="text-[10px] text-slate-400 block mb-1">متن استخراج‌شده سوال:</span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {photoResult.transcribed_question}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-black text-slate-900 dark:text-white mb-1.5">
                  پاسخ تشریحی و استناد به خط کتاب:
                </h4>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-blue-50/40 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  {photoResult.detailed_explanation}
                </p>
              </div>

              {photoResult.rejected_options && photoResult.rejected_options.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-black text-rose-700 dark:text-rose-400">
                    علت رد سایر گزینه‌ها (تله‌های طراح):
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {photoResult.rejected_options.map((rej, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                        <b className="text-rose-900 dark:text-rose-300 block mb-0.5">{rej.option}:</b>
                        <span className="text-slate-700 dark:text-slate-300">{rej.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {photoResult.traps_and_pitfalls && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <b className="block mb-0.5">دام تستی طراح کنکور:</b>
                    <span>{photoResult.traps_and_pitfalls}</span>
                  </div>
                </div>
              )}

              {photoResult.study_tip && (
                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                  <div>
                    <b className="block mb-0.5">توصیه مرور سریع:</b>
                    <span>{photoResult.study_tip}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Slide Deck Generator (With Chapters and Goftar Selection) */}
      {activeTab === 'slides' && (
        <div className="rounded-2xl bg-white dark:bg-[#0a1628] border border-blue-100 dark:border-blue-900/50 p-5 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Presentation className="w-4 h-4 text-blue-600" />
              <span>اسلایدساز آموزشی منطبق بر کتاب‌های درسی رسمی کنکور</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              اسلایدهای تدریس و خلاصه‌برداری را با تفکیک دقیق فصل و گفتارهای مصوب کنکور سراسری بسازید.
            </p>
          </div>

          <form onSubmit={handleSlidesSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  درس
                </label>
                <select
                  value={slidesSubj}
                  onChange={(e) => {
                    setSlidesSubj(e.target.value);
                    setSlidesChapter('');
                    setSlidesGoftar('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
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
                  فصل کتاب درسی
                </label>
                <select
                  value={slidesChapter}
                  onChange={(e) => {
                    setSlidesChapter(e.target.value);
                    setSlidesGoftar('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">— انتخاب فصل کتاب درسی —</option>
                  {(SUBJECT_CHAPTERS[slidesSubj] || []).map((ch, idx) => (
                    <option key={idx} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  تعداد اسلایدها (۳ تا ۱۵)
                </label>
                <input
                  type="number"
                  min="3"
                  max="15"
                  value={slidesCount}
                  onChange={(e) => setSlidesCount(Number(e.target.value) || 6)}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-center"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Biology Goftar Dropdown */}
            {slidesSubj === 'bio' && (
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                <label className="block font-bold text-blue-800 dark:text-blue-300 mb-1">
                  گفتار اختصاصی زیست‌شناسی (دهم / یازدهم / دوازدهم):
                </label>
                <select
                  value={slidesGoftar}
                  onChange={(e) => setSlidesGoftar(e.target.value)}
                  disabled={!slidesChapter}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium disabled:opacity-50"
                >
                  <option value="">— انتخاب گفتار فصل کتاب زیست —</option>
                  {getGoftarsForChapter(slidesChapter).map((g, idx) => (
                    <option key={idx} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                موضوع دقیق اسلایدها یا تیپ تستی خاص (اختیاری)
              </label>
              <input
                type="text"
                value={slidesCustom}
                onChange={(e) => setSlidesCustom(e.target.value)}
                placeholder="مثلاً: جمع‌بندی نکات کنکوری و قیدهای کتاب درسی"
                className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            {slidesError && (
              <p className="text-blue-700 dark:text-blue-300 text-xs bg-blue-50 dark:bg-blue-950/50 p-2.5 rounded-xl border border-blue-200">
                {slidesError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSlidesLoading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isSlidesLoading ? 'در حال تدوین اسلایدهای مصوب کتاب…' : 'ساخت اسلایدهای آموزشی کتاب درسی'}
            </button>
          </form>

          {slidesResult && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {slidesResult.deck_title}
                </h3>
                <button
                  onClick={handleDownloadSlidesHtml}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود فایل HTML</span>
                </button>
              </div>

              <div className="space-y-3">
                {slidesResult.slides.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/30 dark:bg-[#071324] text-xs space-y-2"
                  >
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                      <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <span>{s.title}</span>
                    </div>

                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pr-2 leading-relaxed">
                      {s.bullets.map((b, bIdx) => (
                        <li key={bIdx}>{b}</li>
                      ))}
                    </ul>

                    {s.image_prompt && (
                      <p className="text-[11px] text-slate-400 pr-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        نمودار پیشنهادی: {s.image_prompt}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Cognitive Mistake Analyzer */}
      {activeTab === 'mistakes' && (
        <div className="rounded-2xl bg-white dark:bg-[#0a1628] border border-blue-100 dark:border-blue-900/50 p-5 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              تحلیل شناختی و عمیق دفترچه غلط
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              هوش مصنوعی تست‌های غلط‌خورده شما را ریشه‌یابی کرده و تله‌های شناختی و راهکار رفع آن‌ها را ارائه می‌دهد.
            </p>
          </div>

          <button
            onClick={handleAnalyzeMistakes}
            disabled={isMistakesLoading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-xs cursor-pointer"
          >
            {isMistakesLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>در حال تحلیل شناختی اشتباهات…</span>
              </>
            ) : (
              <>
                <BrainCircuit className="w-4 h-4" />
                <span>اجرای تحلیل عمیق اشتباهات</span>
              </>
            )}
          </button>

          {mistakesError && (
            <p className="text-blue-700 dark:text-blue-300 text-xs bg-blue-50 dark:bg-blue-950/50 p-2.5 rounded-xl border border-blue-200">
              {mistakesError}
            </p>
          )}

          {mistakesResult && (
            <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs leading-relaxed animate-in fade-in">
              {/* Categories */}
              {mistakesResult.categories?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1.5">
                  <span className="font-bold text-blue-900 dark:text-blue-300 block">
                    مباحث بحرانی و آسیب‌پذیر شما:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                    {mistakesResult.categories.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Patterns */}
              {mistakesResult.patterns?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 space-y-1.5">
                  <span className="font-bold text-sky-900 dark:text-sky-300 block">
                    الگوهای تکراری بی‌دقتی یا تله تستی:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                    {mistakesResult.patterns.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              {mistakesResult.actions?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 space-y-1.5">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 block">
                    راهکارهای عملی برای افزایش درصد:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                    {mistakesResult.actions.map((a, idx) => (
                      <li key={idx}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Honest */}
              {mistakesResult.honest && (
                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
                  <b className="text-blue-900 dark:text-blue-300 block mb-1">
                    نتیجه‌گیری و پیام مشاور:
                  </b>
                  <p className="text-slate-700 dark:text-slate-300">
                    {mistakesResult.honest}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
