export type ViewId =
  | 'home'
  | 'timer'
  | 'exams'
  | 'mistakes'
  | 'sim'
  | 'plan'
  | 'stats'
  | 'monthly'
  | 'ai'
  | 'couple'
  | 'settings'
  | 'diag';

export interface SubjectInfo {
  id: string;
  name: string;
  short: string;
  color: string;
  c1: string;
  c2: string;
  category?: 'konkoor' | 'final';
  categoryLabel?: string;
  icon3d?: string;
}

export interface Session {
  id: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  device_id: string;
  subject: string;
  chapter?: string;
  seconds: number;
  correct: number;
  wrong: number;
  blank: number;
  note: string;
  day: string; // YYYY-MM-DD
  type: string; // آموزش | تست آموزشی | تست سنجشی | مرور | جمع‌بندی
}

export interface Exam {
  id: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  device_id: string;
  subject: string;
  day: string;
  correct: number;
  wrong: number;
  blank: number;
  duration: number; // minutes
  percent: number;
  note: string;
}

export interface MistakeCard {
  id: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  device_id: string;
  subject: string;
  chapter?: string;
  cause: string; // مفهوم | حفظ | محاسبه | زمان | بی‌دقتی | خواندن اشتباه سؤال
  question: string;
  source?: string;
  importance: number; // 1 to 5
  image_data?: string | null;
  box: number; // 1 to 5
  next_review: string; // YYYY-MM-DD
  history?: Array<{
    ts: number;
    right: boolean;
    box: number;
    interval: number;
  }>;
}

export interface PlanItem {
  id?: string;
  text: string;
  done: boolean;
}

export interface DailyPlan {
  id: string;
  day: string;
  wake_time: string; // HH:mm
  items: PlanItem[];
  created_at: number;
  updated_at: number;
  device_id: string;
  deleted_at: number | null;
}

export interface ProgressEntry {
  id: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  device_id: string;
  day: string;
  subject: string;
  chapter: string;
  note: string;
}

export interface QuickNote {
  id: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  device_id: string;
  day: string;
  text: string;
  ts: number;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  examDate: string; // YYYY-MM-DD
  examTitle: string;
  dailyGoalMinutes: number;
  dailyGoalTests: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  deviceId: string;
  ai: {
    primaryProvider: 'gemini' | 'openrouter';
    fallbackEnabled: boolean;
    geminiKey: string;
    geminiModel: string;
    openrouterKey: string;
    openrouterModel: string;
    coachPlanGoal?: string;
  };
  partnerLinkBackup?: {
    partner_id: string;
    partner_email: string;
    saved_at: number;
  };
}

export interface QuizQuestion {
  stem: string;
  options: string[];
  correct_index: number;
  explanation: string;
  source?: string;
}

export interface TopicExplanation {
  title: string;
  intro: string;
  key_points: Array<{ heading: string; explanation: string }>;
  formulas: string[];
  pitfalls: string[];
  study_tip: string;
}

export interface SlideDeck {
  deck_title: string;
  slides: Array<{
    title: string;
    bullets: string[];
    image_prompt?: string;
  }>;
}

export interface MistakesAnalysis {
  categories: string[];
  patterns: string[];
  actions: string[];
  honest: string;
}

export interface CoupleLiveState {
  user_id: string;
  online: boolean;
  status: 'studying' | 'resting' | 'online';
  is_studying: boolean;
  subject: string | null;
  started_at: number | null;
  session_elapsed_seconds: number;
  today_seconds: number;
  study_day: string;
  updated_at: number;
}
