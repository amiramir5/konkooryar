import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 3000;

// CORS for the separately hosted API used by the native Capacitor Android app.
// The API never uses cookies, so credentials are intentionally not enabled.
const allowedOrigins = new Set<string>([
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  'http://localhost:5173',
  ...(process.env.API_ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
]);
if (process.env.APP_URL) {
  try { allowedOrigins.add(new URL(process.env.APP_URL).origin); } catch { /* ignore malformed optional URL */ }
}

app.use((req: Request, res: Response, next) => {
  const origin = req.headers.origin;
  const isAllowed = !origin || allowedOrigins.has(origin);
  if (origin && isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    if (!isAllowed) return res.status(403).end();
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  next();
});

// Basic per-IP abuse control for the public AI endpoints. This in-memory limiter
// is a best-effort safeguard; use a shared store and authenticated users for scale.
const AI_RATE_WINDOW_MS = 60_000;
const AI_RATE_MAX_REQUESTS = 30;
const aiRequestTimes = new Map<string, number[]>();
app.use('/api/ai', (req: Request, res: Response, next) => {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const recent = (aiRequestTimes.get(ip) || []).filter((time) => now - time < AI_RATE_WINDOW_MS);
  if (recent.length >= AI_RATE_MAX_REQUESTS) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'تعداد درخواست‌های هوش مصنوعی در این دقیقه زیاد است؛ کمی بعد دوباره امتحان کنید.' });
  }
  recent.push(now);
  aiRequestTimes.set(ip, recent);
  // Avoid retaining inactive IPs forever on a long-lived server.
  if (aiRequestTimes.size > 5000) {
    for (const [key, times] of aiRequestTimes) {
      if (!times.some((time) => now - time < AI_RATE_WINDOW_MS)) aiRequestTimes.delete(key);
    }
  }
  next();
});

app.use(express.json({ limit: '15mb' }));

// Helper to get Gemini client
function getGeminiClient(customKey?: string) {
  // Respect a valid BYOK key first; use the host secret only as a fallback.
  const providedKey = typeof customKey === 'string' ? customKey.trim() : '';
  const apiKey =
    (providedKey && !providedKey.startsWith('AQ.') ? providedKey : '') ||
    (typeof process.env.GEMINI_API_KEY === 'string' ? process.env.GEMINI_API_KEY.trim() : '');

  if (!apiKey) {
    throw new Error('کلید دسترسی Gemini بر روی سرور تنظیم نشده است.');
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getAiClient(body: any): any {
  if (body?.provider === 'openrouter') {
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    if (!apiKey) throw new Error('لطفاً کلید OpenRouter را در تنظیمات وارد کنید.');
    return {
      provider: 'openrouter',
      apiKey,
      model: typeof body.model === 'string' && body.model.trim() ? body.model.trim() : 'openrouter/free',
    };
  }
  return getGeminiClient(body?.apiKey);
}

function openRouterParts(contents: any): { text: string; parts: any[] } {
  const inputs = Array.isArray(contents) ? contents : [contents];
  const parts: any[] = [];
  for (const item of inputs) {
    if (typeof item === 'string') {
      if (item) parts.push({ type: 'text', text: item });
    } else if (item?.text) {
      parts.push({ type: 'text', text: String(item.text) });
    } else if (item?.inlineData?.data) {
      const mime = typeof item.inlineData.mimeType === 'string' ? item.inlineData.mimeType : 'image/jpeg';
      parts.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${item.inlineData.data}` } });
    } else if (Array.isArray(item?.parts)) {
      for (const part of item.parts) {
        if (part?.text) parts.push({ type: 'text', text: String(part.text) });
        else if (part?.inlineData?.data) {
          const mime = typeof part.inlineData.mimeType === 'string' ? part.inlineData.mimeType : 'image/jpeg';
          parts.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${part.inlineData.data}` } });
        }
      }
    }
  }
  return { text: parts.filter((part) => part.type === 'text').map((part) => part.text).join('\n'), parts };
}

async function generateWithOpenRouter(ai: any, params: any) {
  const { config = {}, contents } = params || {};
  const converted = openRouterParts(contents);
  const hasImages = converted.parts.some((part) => part.type === 'image_url');
  const content = hasImages ? converted.parts : converted.text;
  const requestBody: any = {
    model: ai.model,
    messages: [{ role: 'user', content }],
  };
  if (typeof config.temperature === 'number') requestBody.temperature = config.temperature;
  if (config.responseMimeType === 'application/json') requestBody.response_format = { type: 'json_object' };
  if (Array.isArray(config.tools) && config.tools.some((tool: any) => tool?.googleSearch)) {
    requestBody.tools = [{ type: 'openrouter:web_search' }];
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ai.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'https://konkooryar.app',
      'X-Title': 'Konkooryar 2.0',
    },
    body: JSON.stringify(requestBody),
  });
  const payload = await response.json().catch(() => ({} as any));
  if (!response.ok) {
    const message = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`خطای OpenRouter: ${String(message).slice(0, 240)}`);
  }
  const generatedText = payload?.choices?.[0]?.message?.content;
  if (typeof generatedText !== 'string' || !generatedText.trim()) {
    throw new Error('OpenRouter پاسخ متنی معتبری برنگرداند.');
  }
  return { text: generatedText };
}

const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];

async function generateWithFallback(ai: any, params: any) {
  if (ai?.provider === 'openrouter') return generateWithOpenRouter(ai, params);
  let lastError: any = null;
  const { __preferredModel, ...requestParams } = params || {};
  const preferred = CANDIDATE_MODELS.includes(__preferredModel) ? __preferredModel : null;
  const models = [...new Set([preferred, ...CANDIDATE_MODELS].filter(Boolean))] as string[];

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        ...requestParams,
        model,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} attempt failed:`, err?.message || err);
      // If 401 or auth failure, don't waste time trying all aliases
      if (err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('UNAUTHENTICATED')) {
        break;
      }
    }
  }
  throw lastError;
}

const SYSTEM_PROMPT = `Act as an expert Iranian educational/career counselor specializing in Iran's university admissions system (Konkur, Sanjesh, academic records, quotas, ranking, major selection, and admission outcomes).

Your information must be genuinely up to date:
- Before answering any time-sensitive question, search the web and verify the latest information, preferably from official Sanjesh, Ministry of Education, universities, and official notices.
- Know the latest developments and announcements, including what happened today.
- Never rely on outdated rules when newer regulations or announcements exist.
- Distinguish confirmed official information from unofficial reports, estimates, and your own analysis.

You must be highly knowledgeable about:
- Konkur regulations and scoring systems
- Academic-record/Final-exam effects and changes by year
- Quotas, regional classifications, and other admission quotas
- Rank, score, percentile, and how the Sanjesh report card works
- Course-by-course admission statistics
- Historical acceptance records and last-admitted ranks where reliable data exists
- University/major capacities, admission methods, and changes
- Day, evening, self-funded, Azad, Payam Noor, non-profit, and other Iranian higher-education options
- Major selection strategy and realistic acceptance ranges
- Comparing a student's profile against historical admission data

When analyzing a student's chances, do not invent acceptance statistics. Clearly label estimates and explain the evidence behind them.

For every important factual claim, provide the source and URL. If reliable evidence cannot be found, explicitly say:
"I don't know — no reliable source was found."

Respond in Persian.`;

// AI API: Topic Explanation
app.post('/api/ai/explain', async (req: Request, res: Response) => {
  try {
    const { topic, subject, apiKey } = req.body;
    if (!topic || !subject) {
      return res.status(400).json({ error: 'موضوع و درس الزامی هستند.' });
    }

    const ai = getAiClient(req.body);
    const userPrompt = `موضوع: ${topic}
درس: ${subject}
این مبحث را در چارچوب کنکور سراسری تجربی تشریح کن.
خروجی فقط JSON معتبر با ساختار زیر:
{
  "title": "عنوان مبحث",
  "intro": "یک پاراگراف مقدمه کلیدی (۲ تا ۳ خط)",
  "key_points": [
    {"heading": "تیتر نکته", "explanation": "توضیح مفهومی و کاربردی"}
  ],
  "formulas": ["فرمول یا قاعده تستی طلایی"],
  "pitfalls": ["دام تستی رایج طراحان کنکور"],
  "study_tip": "یک توصیه تکنیکی و نحوه تست‌زنی این مبحث"
}`;

    const response = await generateWithFallback(ai, {
      __preferredModel: req.body?.geminiModel,
      contents: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ ok: true, data: parsed });
  } catch (err: any) {
    console.error('Explain API error:', err?.message || err);
    return res.status(502).json({ error: 'تولید توضیح با هوش مصنوعی ناموفق بود. اتصال بک‌اند، کلید API و دسترسی مدل را بررسی کنید.' });
  }
});

// AI API: Quiz Builder (Textbook-aligned + Zerang AI source text mode)
app.post('/api/ai/quiz', async (req: Request, res: Response) => {
  try {
    const { subject, chapter, topic, level = 'متوسط', count = 5, sourceText, apiKey } = req.body;
    const cleanCount = Math.min(Math.max(Number(count) || 5, 2), 20);

    const ai = getAiClient(req.body);
    const targetTopic = topic || chapter || subject;

    let userPrompt = '';
    if (sourceText && typeof sourceText === 'string' && sourceText.trim().length > 30) {
      userPrompt = `تو طراح ارشد آزمون‌های سنجش و کنکور سراسری تجربی هستی (مدل زرنگ).
متن و منبع رسمی کتاب درسی زیر توسط کاربر آپلود/وارد شده است:
«««
${sourceText.trim().slice(0, 10000)}
»»»

درس: ${subject}
مبحث: ${targetTopic}
سطح دشواری: ${level}
تعداد سوال درخواستی: ${cleanCount}

دستورالعمل حیاتی و بدون استثنا:
۱. فقط و فقط بر اساس متن منبع بالا سوال طرح کن. به هیچ عنوان از مفاهیم خارج از این متن یا مطالب دانشگاهی/المپیادی استفاده نکن.
۲. سبک سوالات کاملاً شبیه تست‌های خط‌به‌خط و مفهومی کنکور سال‌های اخیر (تله‌های قیدها: هر، همه، برخی، اغلب، پیوندها و شکل‌های کتاب).
۳. ۴ گزینه کاملاً تفکیک‌شده و استاندارد طراحی کن. از گزینه‌هایی مثل «همه موارد» یا «هیچ‌کدام» خودداری کن.
۴. برای هر تست پاسخ تشریحی عمیق با ارجاع دقیق به متن ارائه بده.

خروجی منحصراً JSON با ساختار:
{
  "questions": [
    {
      "stem": "متن کامل سوال چهارگزینه‌ای",
      "options": ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
      "correct_index": 0,
      "explanation": "پاسخ تشریحی دقیق و علت رد سایر گزینه‌ها بر اساس منبع",
      "source": "ارجاع به متن منبع آپلود شده"
    }
  ]
}`;
    } else {
      userPrompt = `تو طراح ارشد آزمون‌های آزمایشی سراسری و کنکور تجربی هستی.
درس: ${subject}
فصل یا مبحث: ${targetTopic}
سطح دشواری: ${level} (کاملاً منطبق بر بودجه‌بندی و سبک کنکور ۱۴۰۳-۱۴۰۴)
تعداد سوال: ${cleanCount}

قوانین تخطی‌ناپذیر:
۱. تمام سوالات باید ۱۰۰٪ در چارچوب کتاب‌های درسی رسمی آموزش و پرورش نظام جدید تجربی ایران (دهم، یازدهم، دوازدهم) باشند. مطالب خارج از کتاب، المپیادی یا مباحث منسوخ نظام قدیم ممنوع است.
۲. طراحی سوالات مفهومی، ترکیبی و دامی دقیقاً در تراز کنکورهای اخیر سازمان سنجش باشد.
۳. دارای ۴ گزینه مستقل، واقع‌گرایانه و بدون ابهام.

خروجی منحصراً JSON با این ساختار:
{
  "questions": [
    {
      "stem": "متن کامل سوال",
      "options": ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
      "correct_index": 0,
      "explanation": "پاسخ تشریحی کامل، رد گزینه‌های غلط و تحلیل دام تستی",
      "source": "کتاب درسی رسمی (پایه و صفحه مرتبط)"
    }
  ]
}`;
    }

    const response = await generateWithFallback(ai, {
      __preferredModel: req.body?.geminiModel,
      contents: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{"questions":[]}';
    const parsed = JSON.parse(text);
    return res.json({ ok: true, data: parsed });
  } catch (err: any) {
    console.error('Quiz API error:', err?.message || err);
    return res.status(502).json({ error: 'ساخت آزمون هوش مصنوعی ناموفق بود؛ برای جلوگیری از ثبت پاسخ‌های ساختگی، آزمون جایگزین تولید نشد.' });
  }
});

// AI API: Performance Insights for StatsView
app.post('/api/ai/performance-insights', async (req: Request, res: Response) => {
  try {
    const { metrics, apiKey } = req.body;
    const ai = getAiClient(req.body);

    const userPrompt = `تحلیلگر ارشد آماری و مشاوره کنکور تجربی هستی.
اطلاعات عملکرد اخیر داوطلب کنکور:
- ساعت مطالعه هفتگی: ${Math.round((metrics?.weekMinutes || 0) / 60)} ساعت و ${(metrics?.weekMinutes || 0) % 60} دقیقه
- کل ساعت مطالعه ثبت‌شده: ${Math.round((metrics?.totalMinutes || 0) / 60)} ساعت
- تداوم متوالی (استریک): ${metrics?.streak || 0} روز
- تعداد کل تست‌ها و آزمون‌ها: ${metrics?.testsCount || 0}
- میانگین درصد آزمون‌ها: ${metrics?.avgExamPercent !== null ? metrics?.avgExamPercent + '%' : 'ثبت نشده'}
- تقسیم‌بندی زمانی دروس: ${JSON.stringify(metrics?.subjectMinutes || {})}

بر اساس این داده‌ها یک تحلیل سریع، حرفه‌ای و بدون اطناب انجام بده.
خروجی منحصراً JSON به این فرمت:
{
  "status": "وضعیت اجمالی (مثلاً: ریتم پایدار با نیاز به افزایش تست شیمی)",
  "strengths": ["نقطه قوت ۱", "نقطه قوت ۲"],
  "weaknesses": ["نقطه ضعف یا چالش ۱", "نقطه چالش ۲"],
  "actionItems": ["اقدام عملی فوری ۱", "اقدام عملی فوری ۲", "اقدام عملی فوری ۳"],
  "summary": "یک پاراگراف کوتاه (حداکثر ۳ جمله) تحلیل استراتژیک و مستقیم بدون زیاده‌گویی"
}`;

    const response = await generateWithFallback(ai, {
      __preferredModel: req.body?.geminiModel,
      contents: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ ok: true, data: parsed });
  } catch (err: any) {
    console.error('Performance insights error:', err?.message || err);
    return res.status(502).json({ error: 'تحلیل عملکرد با هوش مصنوعی فعلاً در دسترس نیست.' });
  }
});

// AI API: Slide Deck Generator (Strictly Iranian Textbook Aligned)
app.post('/api/ai/slides', async (req: Request, res: Response) => {
  try {
    const { topic, subject = 'زیست‌شناسی', grade, chapter, goftar, count = 6, apiKey } = req.body;
    const cleanCount = Math.min(Math.max(Number(count) || 6, 3), 15);
    const targetTopic = [chapter, goftar, topic].filter(Boolean).join(' — ') || subject;
    const ai = getAiClient(req.body);

    const userPrompt = `تو استاد برجسته و طراح ارشد کنکور سراسری تجربی هستی.
درس: ${subject}
پایه تحصیلی: ${grade || 'کتاب درسی رسمی'}
فصل کتاب درسی: ${chapter || 'سرفصل مصوب آموزش و پرورش'}
گفتار / مبحث کلاسی: ${goftar || topic || 'مبحث کنکوری'}
تعداد اسلاید مورد نظر: ${cleanCount}

دستورالعمل حیاتی و بدون استثنا:
۱. تمام اسلایدها باید ۱۰۰٪ در چارچوب کتاب‌های درسی رسمی وزارت آموزش و پرورش ایران (چاپ‌های جدید دهم، یازدهم و دوازدهم سازمان پژوهش و برنامه‌ریزی آموزشی) تدوین شوند. هیچ مفهوم المپیادی، کمپبل، اصطلاحات دانشگاهی یا فرضیات خارج کتاب مجاز نیست.
۲. نکات خط‌به‌خط، قیدهای کتاب درسی (اغلب، همه، برخی، همواره، به ندرت)، شکل‌ها و نمودارهای رسمی کتاب، و دام‌های تستی طراحان کنکور سال‌های اخیر را به عنوان بولت‌پوینت‌های تفکیک‌شده بنویس.
۳. ساختار مرحله‌به‌مرحله و آموزشی باشد (از تعاریف پایه کتاب شروع شود و به تله‌های تستی کنکور ختم شود).

خروجی منحصراً JSON معتبر به این ساختار:
{
  "deck_title": "عنوان کلی اسلایدها (منطبق بر نام فصل و درس کتاب درسی)",
  "slides": [
    {
      "title": "عنوان اسلاید",
      "bullets": ["نکته خط‌به‌خط ۱", "نکته مفهومی یا قید کتاب ۲", "دام تستی کنکور ۳"],
      "image_prompt": "توصیف دقیق شکل یا نمودار مرتبط در کتاب درسی برای یادگیری بصری"
    }
  ]
}`;

    const response = await generateWithFallback(ai, {
      __preferredModel: req.body?.geminiModel,
      contents: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ ok: true, data: parsed });
  } catch (err: any) {
    console.error('Slides API error:', err?.message || err);
    return res.status(502).json({ error: 'ساخت اسلایدهای هوشمند ناموفق بود. محتوای جایگزینِ غیرواقعی نمایش داده نشد.' });
  }
});

// AI API: Mistake Notebook Cognitive Analysis
app.post('/api/ai/mistakes-analysis', async (req: Request, res: Response) => {
  try {
    const { items, apiKey } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'لیست اشتباهات خالی است' });
    }

    const ai = getAiClient(req.body);
    const sample = items.slice(0, 20).map((it, idx) => ({
      num: idx + 1,
      subject: it.subject,
      cause: it.cause || 'نامشخص',
      question: (it.question || '').slice(0, 300),
    }));

    const userPrompt = `این لیست تست‌های غلط خورده دانش‌آموز است:
${JSON.stringify(sample, null, 2)}

تحلیل شناختی و عمیق انجام بده و الگوهای ضعف را استخراج کن.
خروجی منحصراً JSON با ساختار:
{
  "categories": ["دسته‌های تکرارشونده و مباحث بحرانی"],
  "patterns": ["الگوهای روانی یا مهارتی، مثل بی‌دقتی محاسباتی یا دام افعال منفی"],
  "actions": ["راهکار عملی ۱ برای رفع ضعف", "راهکار عملی ۲", "راهکار عملی ۳"],
  "honest": "یک تحلیل بی‌پرده و انگیزاننده از وضعیت فعلی دانش‌آموز"
}`;

    const response = await generateWithFallback(ai, {
      __preferredModel: req.body?.geminiModel,
      contents: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ ok: true, data: parsed });
  } catch (err: any) {
    console.error('Mistakes analysis error:', err);
    return res.status(500).json({ error: err.message || 'خطا در تحلیل اشتباهات' });
  }
});

// AI API: Study Coach Chat & Adaptive Planning
app.post('/api/ai/coach', async (req: Request, res: Response) => {
  try {
    const { message, context, mode, history = [], apiKey } = req.body;
    const ai = getAiClient(req.body);

    const promptText = `اطلاعات و وضعیت ثبت‌شده داوطلب در سیستم:
${JSON.stringify(context || {}, null, 2)}

تاریخچه گفتگوی اخیر:
${(history || []).slice(-6).map((h: any) => `${h.role === 'user' ? 'داوطلب' : 'مشاور'}: ${h.text}`).join('\n')}

حالت پیام: ${mode || 'عمومی'}
پرسش یا پیام داوطلب: ${message || 'وضعیت من را تحلیل کن و یک برنامه تخصصی و عملیاتی بگو'}

دستورالعمل پاسخ:
- به عنوان مشاور ارشد و متخصص کنکور و پذیرش دانشگاه‌ها پاسخ بده.
- تحلیل‌هایت دقیق، مستند، حرفه‌ای و کاربردی باشد.
- برای هر ادعای آماری یا ضوابط کلیدی کنکور و سوابق تحصیلی، منبع معتبر و لینک (URL) ذکر کن. اگر منبعی یافت نشد بگو: «منبع موثقی برای این موضوع یافت نشد».
- ساختاربندی و دسته‌بندی منظم و شفاف با تیترها و نکات کلیدی به زبان فارسی ارائه کن.`;

    const response = await generateWithFallback(ai, {
      __preferredModel: req.body?.geminiModel,
      contents: `${SYSTEM_PROMPT}\n\n${promptText}`,
      config: {
        temperature: 0.3,
        // Google Search Grounding for always up-to-date Konkoor information
        tools: [{ googleSearch: {} }],
      },
    });

    return res.json({ ok: true, text: response.text || '' });
  } catch (err: any) {
    console.error('Coach error:', err);
    return res.status(500).json({ error: err.message || 'خطا در ارتباط با مشاور هوشمند' });
  }
});

// AI API: Vision / OCR Question Extractor
app.post('/api/ai/ocr', async (req: Request, res: Response) => {
  try {
    const { imageBase64, apiKey } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'تصویر ارائه نشده است' });
    }

    const ai = getAiClient(req.body);
    let mimeType = 'image/jpeg';
    let data = imageBase64;

    const match = /^data:([^;]+);base64,(.+)$/.exec(imageBase64);
    if (match) {
      mimeType = match[1];
      data = match[2];
    }

    const response = await generateWithFallback(ai, {
      __preferredModel: req.body?.geminiModel,
      contents: [
        {
          inlineData: {
            mimeType,
            data,
          },
        },
        {
          text: 'متن موجود در این تصویر را دقیق استخراج کن. اگر سوال تستی یا گزینه‌دار است، صورت سوال و گزینه‌ها را به صورت منظم بازنویسی کن. از هیچ توضیح اضافه یا مقدمه‌چینی استفاده نکن.',
        },
      ],
      config: {
        temperature: 0.1,
      },
    });

    return res.json({ ok: true, text: (response.text || '').trim() });
  } catch (err: any) {
    console.error('OCR error:', err);
    return res.status(500).json({ error: err.message || 'خطا در استخراج متن از تصویر' });
  }
});

// AI API: Photo Question Solver (Strictly Iranian Textbook Aligned)
app.post('/api/ai/photo-solve', async (req: Request, res: Response) => {
  try {
    const { imageBase64, subject = 'زیست‌شناسی', chapter, goftar, customText, apiKey } = req.body;
    if (!imageBase64 && !customText) {
      return res.status(400).json({ error: 'تصویر یا متن سوال ارسال نشده است' });
    }

    const ai = getAiClient(req.body);
    const contents: any[] = [];

    if (imageBase64) {
      let mimeType = 'image/jpeg';
      let data = imageBase64;
      const match = /^data:([^;]+);base64,(.+)$/.exec(imageBase64);
      if (match) {
        mimeType = match[1];
        data = match[2];
      }
      contents.push({
        inlineData: { mimeType, data },
      });
    }

    const userPrompt = `تو مولف ارشد کتاب‌های درسی رسمی وزارت آموزش و پرورش ایران و طراح کنکور سراسری تجربی هستی.
درس: ${subject}
فصل انتخابی: ${chapter || 'تشخیص خودکار از روی کتاب درسی'}
گفتار / مبحث: ${goftar || 'تشخیص خودکار'}
متن یا سوال تکمیلی: ${customText || 'بررسی سوال موجود در تصویر'}

دستورالعمل الزامی و بدون تخطی:
۱. تمام تحلیل‌ها باید ۱۰۰٪ منطبق بر کتاب‌های درسی رسمی ایران (پایه‌های دهم، یازدهم و دوازدهم سازمان پژوهش و برنامه‌ریزی) باشد. هیچ محتوای خارج کتاب، المپیادی، یا ترجمه‌های متفرقه مجاز نیست.
۲. گزینه درست را با استناد دقیق به متن، تصاویر و قیدهای کتاب درسی (همه، اغلب، برخی، به ندرت) مشخص کن.
۳. علت نادرستی تک‌تک گزینه‌های دیگر را با استدلال خط‌به‌خط کتاب بنویس.
۴. دام تستی طراح کنکور را کالبدشکافی کن.

خروجی منحصراً JSON به این ساختار:
{
  "transcribed_question": "متن صورت سوال و گزینه‌ها",
  "book_reference": "پایه، فصل و گفتار دقیق کتاب درسی مرتبط با این سوال",
  "correct_option": "شماره یا عبارت گزینه صحیح",
  "detailed_explanation": "پاسخ تشریحی کامل و تحلیلی منطبق بر خط کتاب درسی",
  "rejected_options": [
    {"option": "گزینه نامعتبر ۱", "reason": "علت رد بر اساس متن کتاب درسی"},
    {"option": "گزینه نامعتبر ۲", "reason": "علت رد بر اساس متن کتاب درسی"}
  ],
  "traps_and_pitfalls": "دام‌های تستی و اشتباهات رایج داوطلبان در این تیپ سوال",
  "study_tip": "توصیه طلایی برای یادآوری این مبحث در جلسه آزمون"
}`;

    contents.push({ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` });

    const response = await generateWithFallback(ai, {
      __preferredModel: req.body?.geminiModel,
      contents,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ ok: true, data: parsed });
  } catch (err: any) {
    console.error('Photo solve API error:', err?.message || err);
    return res.status(502).json({ error: 'حل سوال تصویری با هوش مصنوعی ناموفق بود؛ پاسخ ساختگی نمایش داده نشد.' });
  }
});

// AI API: Document / PDF / Textbook Extractor (Zerang AI Mode)
app.post('/api/ai/extract-doc', async (req: Request, res: Response) => {
  try {
    const { fileBase64, mimeType = 'application/pdf', apiKey } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: 'فایل ارسال نشده است' });
    }

    const ai = getAiClient(req.body);
    let cleanMime = mimeType;
    let cleanData = fileBase64;

    const match = /^data:([^;]+);base64,(.+)$/.exec(fileBase64);
    if (match) {
      cleanMime = match[1];
      cleanData = match[2];
    }

    const response = await generateWithFallback(ai, {
      __preferredModel: req.body?.geminiModel,
      contents: [
        {
          inlineData: {
            mimeType: cleanMime,
            data: cleanData,
          },
        },
        {
          text: 'متن آموزشی و کنکوری این صفحات را به دقت استخراج کن. فقط محتوای متنی، نکات و تعاریف کتاب را بدون اضافه کردن نظرات یا متن خارج از درس بنویس.',
        },
      ],
      config: {
        temperature: 0.1,
      },
    });

    return res.json({ ok: true, text: (response.text || '').trim() });
  } catch (err: any) {
    console.error('Extract doc error:', err);
    return res.status(500).json({ error: err.message || 'خطا در خواندن فایل یا PDF کتاب' });
  }
});

// AI API: Test the exact Gemini key and model currently selected in Settings.
app.post('/api/ai/test-gemini', async (req: Request, res: Response) => {
  try {
    const ai = getGeminiClient(req.body?.apiKey);
    await generateWithFallback(ai, {
      __preferredModel: req.body?.model,
      contents: 'فقط کلمه «سلام» را به فارسی پاسخ بده.',
      config: { temperature: 0, maxOutputTokens: 16 },
    });
    return res.json({ ok: true, message: 'اتصال Gemini با کلید و مدل انتخاب‌شده موفق بود.' });
  } catch (err: any) {
    console.error('Gemini connection test failed:', err?.message || err);
    return res.status(502).json({ error: `تست Gemini ناموفق بود: ${String(err?.message || 'خطای ناشناخته').slice(0, 220)}` });
  }
});

// AI API: Test OpenRouter Connection
app.post('/api/ai/test-openrouter', async (req: Request, res: Response) => {
  try {
    const { apiKey, model = 'meta-llama/llama-3.3-70b-instruct' } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'کلید OpenRouter وارد نشده است' });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'meta-llama/llama-3.3-70b-instruct',
        messages: [{ role: 'user', content: 'پاسخ کوتاه بده: سلام' }],
        max_tokens: 15,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `خطای OpenRouter (${response.status}): ${errText.slice(0, 100)}` });
    }

    const json = await response.json();
    return res.json({ ok: true, message: 'اتصال به OpenRouter با موفقیت تایید شد.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'خطا در اتصال به OpenRouter' });
  }
});

// Mount Vite or static server
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KonkoorYar 2.0 Server listening on port ${PORT}`);
  });
}

startServer();
