import React, { useState } from 'react';
import {
  Settings,
  Target,
  Sparkles,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Volume2,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';
import { AppSettings, Exam, MistakeCard, Session } from '../../types';
import {
  exportAllDataJson,
  exportExamsCsv,
  exportMistakesCsv,
  exportSessionsCsv,
  importAllDataJson,
} from '../../lib/storage';
import { testAiConnection } from '../../lib/ai';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
} from '../../lib/supabase';
import { Database } from 'lucide-react';
import { formatPersianDate } from '../../lib/jalali';

interface SettingsViewProps {
  settings: AppSettings;
  sessions: Session[];
  exams: Exam[];
  mistakes: MistakeCard[];
  onUpdateSettings: (settings: AppSettings) => void;
  onDataImported: () => void;
  onWipeCategory: (category: 'sessions' | 'exams' | 'mistakes' | 'plans') => void;
  onOpenDatePicker: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  sessions,
  exams,
  mistakes,
  onUpdateSettings,
  onDataImported,
  onWipeCategory,
  onOpenDatePicker,
}) => {
  const [examTitle, setExamTitle] = useState(settings.examTitle);
  const [goalMinutes, setGoalMinutes] = useState(settings.dailyGoalMinutes);
  const [goalTests, setGoalTests] = useState(settings.dailyGoalTests);

  // AI settings
  const [primaryProvider, setPrimaryProvider] = useState(settings.ai.primaryProvider);
  const [geminiKey, setGeminiKey] = useState(settings.ai.geminiKey);
  const [geminiModel, setGeminiModel] = useState(settings.ai.geminiModel);
  const [openrouterKey, setOpenrouterKey] = useState(settings.ai.openrouterKey);
  const [openrouterModel, setOpenrouterModel] = useState(settings.ai.openrouterModel || 'meta-llama/llama-3.3-70b-instruct');
  const [fallbackEnabled, setFallbackEnabled] = useState(settings.ai.fallbackEnabled);

  // Supabase configuration state
  const initialSb = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialSb.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(initialSb.anonKey);
  const [supabaseStatus, setSupabaseStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTestingSb, setIsTestingSb] = useState(false);

  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOrKey, setShowOrKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      examTitle,
      dailyGoalMinutes: goalMinutes,
      dailyGoalTests: goalTests,
      ai: {
        ...settings.ai,
        primaryProvider,
        geminiKey,
        geminiModel,
        openrouterKey,
        openrouterModel,
        fallbackEnabled,
      },
    });
    saveSupabaseConfig({
      url: supabaseUrl.trim(),
      anonKey: supabaseAnonKey.trim(),
      syncEnabled: true,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestAi = async () => {
    setIsTesting(true);
    setTestResult(null);
    const key = primaryProvider === 'gemini' ? geminiKey : openrouterKey;
    const model = primaryProvider === 'gemini' ? geminiModel : openrouterModel;
    const res = await testAiConnection(primaryProvider, key, model);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleTestSupabase = async () => {
    setIsTestingSb(true);
    setSupabaseStatus(null);
    const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setSupabaseStatus(res);
    setIsTestingSb(false);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const ok = importAllDataJson(text);
      if (ok) {
        alert('اطلاعات با موفقیت بازیابی شد!');
        onDataImported();
      } else {
        alert('فرمت فایل پشتیبان نامعتبر است.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          تنظیمات و مدیریت داده‌ها
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          شخصی‌سازی اهداف، کلیدهای هوش مصنوعی، خروجی‌های استاندارد اکسل و پشتیبان‌گیری
        </p>
      </div>

      <form onSubmit={handleSaveGeneral} className="space-y-5 text-xs">
        {/* Goal & Exam Target */}
        <div className="neu-card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
            <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              اهداف و تاریخ آزمون سراسری
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                عنوان آزمون هدف
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl neu-inset font-bold text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                تاریخ برگزاری کنکور
              </label>
              <button
                type="button"
                onClick={onOpenDatePicker}
                className="w-full px-3 py-2.5 rounded-xl neu-raised-sm text-slate-800 dark:text-slate-200 text-right flex items-center justify-between cursor-pointer"
              >
                <span>{formatPersianDate(settings.examDate)} <span className="text-slate-400 font-mono">({settings.examDate})</span></span>
                <Calendar className="w-4 h-4 text-blue-500" />
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                هدف مطالعه روزانه (دقیقه)
              </label>
              <input
                type="number"
                min="30"
                max="1200"
                value={goalMinutes}
                onChange={(e) => setGoalMinutes(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl neu-inset text-slate-800 dark:text-slate-200 font-mono text-center font-bold"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                هدف حل تست روزانه (تعداد)
              </label>
              <input
                type="number"
                min="10"
                max="500"
                value={goalTests}
                onChange={(e) => setGoalTests(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl neu-inset text-slate-800 dark:text-slate-200 font-mono text-center font-bold"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* AI Engine Configuration */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              تنظیمات موتور هوش مصنوعی (Gemini Flash & OpenRouter)
            </h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  سرویس‌دهنده هوش مصنوعی
                </label>
                <select
                  value={primaryProvider}
                  onChange={(e: any) => setPrimaryProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="gemini">Google Gemini Flash (پیشنهادی و پرسرعت)</option>
                  <option value="openrouter">OpenRouter (روتر مدل‌های معتبر)</option>
                </select>
              </div>

              {primaryProvider === 'gemini' ? (
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    نسخه مدل Gemini (منحصراً فلش)
                  </label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (پیشنهادی)</option>
                    <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite (سبک‌تر)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    مدل منتخب OpenRouter
                  </label>
                  <select
                    value={openrouterModel}
                    onChange={(e) => setOpenrouterModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs"
                  >
                    <option value="openrouter/free">OpenRouter Free (پیشنهادی)</option>
                    <option value="meta-llama/llama-3.3-70b-instruct">meta-llama/llama-3.3-70b-instruct</option>
                    <option value="deepseek/deepseek-chat">deepseek/deepseek-chat</option>
                    <option value="mistralai/mistral-large-2411">mistralai/mistral-large-2411</option>
                  </select>
                </div>
              )}
            </div>

            {primaryProvider === 'openrouter' && (
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  کلید دسترسی OpenRouter API Key
                </label>
                <div className="relative">
                  <input
                    type={showOrKey ? 'text' : 'password'}
                    value={openrouterKey}
                    onChange={(e) => setOpenrouterKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs pl-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOrKey(!showOrKey)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showOrKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {primaryProvider === 'gemini' && (
              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-xs text-blue-900 dark:text-blue-200 block">
                    موتور هوش مصنوعی Google Gemini Flash
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    اتصال امن سرور با مدل‌های Flash بدون وابستگی به کلید کلاینت آماده است.
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 shrink-0">
                  فلش فعال
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestAi}
                disabled={isTesting}
                className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTesting ? 'در حال تست اتصال…' : 'تست اتصال هوش مصنوعی'}
              </button>

              {testResult && (
                <span
                  className={`text-xs font-bold flex items-center gap-1 ${
                    testResult.ok ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{testResult.message}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Supabase Cloud Database Configuration */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                پایگاه‌داده و همگام‌سازی ابری Supabase
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              PostgreSQL Realtime
            </span>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                آدرس پروژه Supabase (URL)
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                کلید عمومی دسترسی (Publishable / Anon Key)
              </label>
              <input
                type="text"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs"
                dir="ltr"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={isTestingSb}
                className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTestingSb ? 'در حال بررسی اتصال…' : 'تست اتصال Supabase'}
              </button>

              {supabaseStatus && (
                <span
                  className={`text-xs font-bold flex items-center gap-1 ${
                    supabaseStatus.ok ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'
                  }`}
                >
                  {supabaseStatus.ok ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{supabaseStatus.message}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors cursor-pointer"
          >
            ذخیره تغییرات
          </button>
          {saveSuccess && (
            <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>تنظیمات ذخیره شد!</span>
            </span>
          )}
        </div>
      </form>

      {/* Export to Excel (CSV) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            خروجی استاندارد اکسل (CSV)
          </h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          فایل‌های خروجی با استاندارد UTF-8 BOM ذخیره می‌شوند تا در نرم‌افزار Microsoft Excel بدون به‌هم‌ریختگی حروف فارسی به سادگی باز شوند.
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => exportSessionsCsv(sessions)}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی جلسات مطالعه</span>
          </button>

          <button
            onClick={() => exportExamsCsv(exams)}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی آزمون‌ها و درصدها</span>
          </button>

          <button
            onClick={() => exportMistakesCsv(mistakes)}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی دفترچه اشتباهات</span>
          </button>
        </div>
      </div>

      {/* Full Backup & Restore */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Download className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            پشتیبان‌گیری کامل و انتقال به دستگاه دیگر
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportAllDataJson}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>دریافت فایل پشتیبان کامل (JSON)</span>
          </button>

          <label className="cursor-pointer px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>بازیابی اطلاعات از فایل</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Selective Data Wiping */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/40 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-rose-100 dark:border-rose-950">
          <Trash2 className="w-4 h-4 text-rose-600" />
          <h3 className="text-sm font-extrabold text-rose-600">
            مدیریت و پاکسازی گزینشی داده‌ها
          </h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          در صورت نیاز به شروع مجدد یک بخش خاص، می‌توانید بدون پاک شدن سایر اطلاعات آن را صفر کنید.
        </p>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => {
              if (confirm('آیا از پاک کردن تمامی جلسات مطالعه اطمینان دارید؟')) {
                onWipeCategory('sessions');
              }
            }}
            className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold"
          >
            پاکسازی جلسات مطالعه
          </button>

          <button
            onClick={() => {
              if (confirm('آیا از پاک کردن تمامی آزمون‌ها اطمینان دارید؟')) {
                onWipeCategory('exams');
              }
            }}
            className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold"
          >
            پاکسازی کارنامه‌ها
          </button>

          <button
            onClick={() => {
              if (confirm('آیا از پاک کردن دفترچه اشتباهات اطمینان دارید؟')) {
                onWipeCategory('mistakes');
              }
            }}
            className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold"
          >
            پاکسازی دفترچه اشتباهات
          </button>

          <button
            onClick={() => {
              if (confirm('آیا از پاک کردن برنامه‌های روزانه اطمینان دارید؟')) {
                onWipeCategory('plans');
              }
            }}
            className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold"
          >
            پاکسازی برنامه‌های روزانه
          </button>
        </div>
      </div>
    </div>
  );
};
