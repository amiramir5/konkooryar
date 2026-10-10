import { apiUrl } from './api';
import {
  MistakesAnalysis,
  QuizQuestion,
  SlideDeck,
  TopicExplanation,
} from '../types';
import { loadSettings } from './storage';

export async function explainTopic(
  topic: string,
  subject: string
): Promise<TopicExplanation> {
  const settings = loadSettings();
  const apiKey = (settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterKey : settings.ai.geminiKey) || undefined;

  const res = await fetch(apiUrl('/api/ai/explain'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, subject, apiKey, geminiModel: settings.ai.geminiModel, provider: settings.ai.primaryProvider, model: settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterModel : settings.ai.geminiModel }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطا در دریافت پاسخ از سرور (کد ${res.status})`);
  }

  const json = await res.json();
  return json.data as TopicExplanation;
}

export async function generateQuiz(
  subject: string,
  chapter: string,
  topic: string,
  level: string,
  count: number,
  sourceText?: string
): Promise<QuizQuestion[]> {
  const settings = loadSettings();
  const apiKey = (settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterKey : settings.ai.geminiKey) || undefined;

  const res = await fetch(apiUrl('/api/ai/quiz'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, chapter, topic, level, count, sourceText, apiKey, geminiModel: settings.ai.geminiModel, provider: settings.ai.primaryProvider, model: settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterModel : settings.ai.geminiModel }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطا در ساخت سوالات تستی (کد ${res.status})`);
  }

  const json = await res.json();
  return json.data.questions as QuizQuestion[];
}

export async function generateSlides(
  topicOrParams: string | { topic?: string; subject: string; grade?: string; chapter?: string; goftar?: string; count?: number },
  subjectName?: string,
  slideCount?: number
): Promise<SlideDeck> {
  const settings = loadSettings();
  const apiKey = (settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterKey : settings.ai.geminiKey) || undefined;

  let payload: any = {};
  if (typeof topicOrParams === 'object') {
    payload = { ...topicOrParams, apiKey, geminiModel: settings.ai.geminiModel, provider: settings.ai.primaryProvider, model: settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterModel : settings.ai.geminiModel };
  } else {
    payload = {
      topic: topicOrParams,
      subject: subjectName || 'زیست‌شناسی',
      count: slideCount || 6,
      apiKey,
      geminiModel: settings.ai.geminiModel,
      provider: settings.ai.primaryProvider,
      model: settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterModel : settings.ai.geminiModel,
    };
  }

  const res = await fetch(apiUrl('/api/ai/slides'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطا در ساخت اسلایدهای آموزشی (کد ${res.status})`);
  }

  const json = await res.json();
  return json.data as SlideDeck;
}

export async function analyzeMistakes(
  items: Array<{ subject: string; cause: string; question: string }>
): Promise<MistakesAnalysis> {
  const settings = loadSettings();
  const apiKey = (settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterKey : settings.ai.geminiKey) || undefined;

  const res = await fetch(apiUrl('/api/ai/mistakes-analysis'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, apiKey, geminiModel: settings.ai.geminiModel, provider: settings.ai.primaryProvider, model: settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterModel : settings.ai.geminiModel }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطا در تحلیل شناختی دفترچه اشتباهات (کد ${res.status})`);
  }

  const json = await res.json();
  return json.data as MistakesAnalysis;
}

export async function consultCoach(
  message: string,
  context: any,
  mode: string,
  history: Array<{ role: 'user' | 'assistant'; text: string }>
): Promise<string> {
  const settings = loadSettings();
  const apiKey = (settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterKey : settings.ai.geminiKey) || undefined;

  const res = await fetch(apiUrl('/api/ai/coach'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context, mode, history, apiKey, geminiModel: settings.ai.geminiModel, provider: settings.ai.primaryProvider, model: settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterModel : settings.ai.geminiModel }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطا در ارتباط با مشاور هوشمند (کد ${res.status})`);
  }

  const json = await res.json();
  return json.text as string;
}

export async function extractOcrText(imageBase64: string): Promise<string> {
  const settings = loadSettings();
  const apiKey = (settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterKey : settings.ai.geminiKey) || undefined;

  const res = await fetch(apiUrl('/api/ai/ocr'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, apiKey, geminiModel: settings.ai.geminiModel, provider: settings.ai.primaryProvider, model: settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterModel : settings.ai.geminiModel }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطا در خواندن تصویر (کد ${res.status})`);
  }

  const json = await res.json();
  return json.text as string;
}

export interface PhotoSolveResult {
  transcribed_question: string;
  book_reference: string;
  correct_option: string;
  detailed_explanation: string;
  rejected_options?: Array<{ option: string; reason: string }>;
  traps_and_pitfalls?: string;
  study_tip?: string;
}

export async function solvePhotoQuestion(params: {
  imageBase64?: string;
  subject: string;
  chapter?: string;
  goftar?: string;
  customText?: string;
}): Promise<PhotoSolveResult> {
  const settings = loadSettings();
  const apiKey = (settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterKey : settings.ai.geminiKey) || undefined;

  const res = await fetch(apiUrl('/api/ai/photo-solve'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, apiKey, geminiModel: settings.ai.geminiModel, provider: settings.ai.primaryProvider, model: settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterModel : settings.ai.geminiModel }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطا در تحلیل سوال تصویری (کد ${res.status})`);
  }

  const json = await res.json();
  return json.data as PhotoSolveResult;
}

export async function getPerformanceInsights(metrics: {
  weekMinutes: number;
  totalMinutes: number;
  streak: number;
  testsCount: number;
  avgExamPercent: number | null;
  subjectMinutes: Record<string, number>;
}): Promise<{
  status: string;
  strengths: string[];
  weaknesses: string[];
  actionItems: string[];
  summary: string;
}> {
  const settings = loadSettings();
  const apiKey = (settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterKey : settings.ai.geminiKey) || undefined;

  const res = await fetch(apiUrl('/api/ai/performance-insights'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metrics, apiKey, geminiModel: settings.ai.geminiModel, provider: settings.ai.primaryProvider, model: settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterModel : settings.ai.geminiModel }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطا در دریافت تحلیل عملکرد (کد ${res.status})`);
  }

  const json = await res.json();
  return json.data;
}

export async function extractDocumentText(fileBase64: string, mimeType: string): Promise<string> {
  const settings = loadSettings();
  const apiKey = (settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterKey : settings.ai.geminiKey) || undefined;

  const res = await fetch(apiUrl('/api/ai/extract-doc'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileBase64, mimeType, apiKey, geminiModel: settings.ai.geminiModel, provider: settings.ai.primaryProvider, model: settings.ai.primaryProvider === 'openrouter' ? settings.ai.openrouterModel : settings.ai.geminiModel }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطا در خواندن فایل مدرک (کد ${res.status})`);
  }

  const json = await res.json();
  return json.text as string;
}

export async function testAiConnection(
  provider: 'gemini' | 'openrouter',
  customKey?: string,
  model?: string
): Promise<{ ok: boolean; message: string }> {
  try {
    if (provider === 'gemini') {
      const settings = loadSettings();
      const res = await fetch(apiUrl('/api/ai/test-gemini'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: customKey || settings.ai.geminiKey || undefined,
          model: model || settings.ai.geminiModel || 'gemini-3.8-flash',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: json.error || `خطا در تست Gemini (کد ${res.status})` };
      return { ok: true, message: json.message || 'اتصال Gemini تایید شد.' };
    } else {
      const settings = loadSettings();
      const openKey = customKey || settings.ai.openrouterKey;
      if (!openKey) {
        return { ok: false, message: 'لطفاً ابتدا کلید OpenRouter را وارد نمایید.' };
      }

      const res = await fetch(apiUrl('/api/ai/test-openrouter'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: openKey,
          model: model || settings.ai.openrouterModel || 'meta-llama/llama-3.3-70b-instruct',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        return { ok: false, message: json.error || 'خطا در احراز هویت OpenRouter' };
      }
      return { ok: true, message: json.message || 'اتصال OpenRouter تایید شد.' };
    }
  } catch (err: any) {
    return { ok: false, message: err.message || 'خطا در برقراری ارتباط با مدل هوش مصنوعی' };
  }
}
