import {
  AppSettings,
  DailyPlan,
  Exam,
  MistakeCard,
  ProgressEntry,
  QuickNote,
  Session,
} from '../types';
import { DEFAULT_EXAM_DATE, DEFAULT_EXAM_TITLE } from './constants';
import { studyDayKey } from './jalali';

const STORAGE_KEYS = {
  SESSIONS: 'ky_sessions_v2',
  EXAMS: 'ky_exams_v2',
  MISTAKES: 'ky_mistakes_v2',
  PLANS: 'ky_plans_v2',
  NOTES: 'ky_notes_v2',
  PROGRESS: 'ky_progress_v2',
  SETTINGS: 'ky_settings_v2',
  CHECKLIST: 'ky_checklist_v2',
  TIMER_STATE: 'ky_timer_state_v2',
};

export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'ky-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

export function getDefaultSettings(): AppSettings {
  return {
    theme: 'light',
    examDate: DEFAULT_EXAM_DATE,
    examTitle: DEFAULT_EXAM_TITLE,
    dailyGoalMinutes: 600, // 10 hours
    dailyGoalTests: 100,
    soundEnabled: true,
    vibrationEnabled: true,
    deviceId: uid(),
    ai: {
      primaryProvider: 'gemini',
      fallbackEnabled: true,
      geminiKey: '',
      geminiModel: 'gemini-3.8-flash',
      openrouterKey: '',
      openrouterModel: 'openrouter/free',
    },
  };
}

// Local Storage Wrappers with Safe JSON Parse
export function getStored<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Error reading key ${key}:`, err);
    return defaultValue;
  }
}

export function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Error writing key ${key}:`, err);
  }
}

// Specific Getters & Setters
export function loadSessions(): Session[] {
  return getStored<Session[]>(STORAGE_KEYS.SESSIONS, []);
}
export function saveSessions(sessions: Session[]): void {
  setStored(STORAGE_KEYS.SESSIONS, sessions);
}

export function loadExams(): Exam[] {
  return getStored<Exam[]>(STORAGE_KEYS.EXAMS, []);
}
export function saveExams(exams: Exam[]): void {
  setStored(STORAGE_KEYS.EXAMS, exams);
}

export function loadMistakes(): MistakeCard[] {
  return getStored<MistakeCard[]>(STORAGE_KEYS.MISTAKES, []);
}
export function saveMistakes(mistakes: MistakeCard[]): void {
  setStored(STORAGE_KEYS.MISTAKES, mistakes);
}

export function loadPlans(): DailyPlan[] {
  return getStored<DailyPlan[]>(STORAGE_KEYS.PLANS, []);
}
export function savePlans(plans: DailyPlan[]): void {
  setStored(STORAGE_KEYS.PLANS, plans);
}

export function loadNotes(): QuickNote[] {
  return getStored<QuickNote[]>(STORAGE_KEYS.NOTES, []);
}
export function saveNotes(notes: QuickNote[]): void {
  setStored(STORAGE_KEYS.NOTES, notes);
}

export function loadProgress(): ProgressEntry[] {
  return getStored<ProgressEntry[]>(STORAGE_KEYS.PROGRESS, []);
}
export function saveProgress(progress: ProgressEntry[]): void {
  setStored(STORAGE_KEYS.PROGRESS, progress);
}

export function loadSettings(): AppSettings {
  const current = getStored<AppSettings>(STORAGE_KEYS.SETTINGS, getDefaultSettings());
  // Merge with defaults to ensure all fields exist
  const merged: AppSettings = {
    ...getDefaultSettings(),
    ...current,
    ai: {
      ...getDefaultSettings().ai,
      ...(current.ai || {}),
    },
  };
  // If previously saved invalid key exists in localStorage, wipe it
  if (merged.ai.geminiKey && merged.ai.geminiKey.startsWith('AQ.')) {
    merged.ai.geminiKey = '';
  }
  // Migrate stale/unsupported model names saved by older app versions.
  if (!['gemini-3.8-flash', 'gemini-3.5-flash-lite'].includes(merged.ai.geminiModel)) {
    merged.ai.geminiModel = 'gemini-3.8-flash';
  }
  return merged;
}
export function saveSettings(settings: AppSettings): void {
  setStored(STORAGE_KEYS.SETTINGS, settings);
}

export function loadChecklist(): Record<string, boolean> {
  return getStored<Record<string, boolean>>(STORAGE_KEYS.CHECKLIST, {});
}
export function saveChecklist(checklist: Record<string, boolean>): void {
  setStored(STORAGE_KEYS.CHECKLIST, checklist);
}

export interface StoredTimerState {
  subject: string;
  status: 'idle' | 'running' | 'paused';
  started_at: number | null;
  accumulated_ms: number;
  day: string;
}

export function loadTimerState(): StoredTimerState | null {
  return getStored<StoredTimerState | null>(STORAGE_KEYS.TIMER_STATE, null);
}
export function saveTimerState(state: StoredTimerState | null): void {
  setStored(STORAGE_KEYS.TIMER_STATE, state);
}

// Full Export / Import
export function exportAllDataJson(): void {
  const settings = loadSettings();
  // Clean sensitive keys from export
  const safeSettings = {
    ...settings,
    ai: {
      ...settings.ai,
      geminiKey: '',
      openrouterKey: '',
    },
  };

  const payload = {
    app: 'konkoor-yar-2.0',
    version: 2,
    exported_at: new Date().toISOString(),
    data: {
      settings: safeSettings,
      sessions: loadSessions(),
      exams: loadExams(),
      mistakes: loadMistakes(),
      plans: loadPlans(),
      notes: loadNotes(),
      progress: loadProgress(),
      checklist: loadChecklist(),
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `konkooryar-backup-${studyDayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function importAllDataJson(jsonText: string): boolean {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || !parsed.data) {
      throw new Error('فرمت فایل پشتیبان نامعتبر است');
    }
    const d = parsed.data;

    if (Array.isArray(d.sessions)) saveSessions(d.sessions);
    if (Array.isArray(d.exams)) saveExams(d.exams);
    if (Array.isArray(d.mistakes)) saveMistakes(d.mistakes);
    if (Array.isArray(d.plans)) savePlans(d.plans);
    if (Array.isArray(d.notes)) saveNotes(d.notes);
    if (Array.isArray(d.progress)) saveProgress(d.progress);
    if (d.checklist && typeof d.checklist === 'object') saveChecklist(d.checklist);

    if (d.settings) {
      const cur = loadSettings();
      saveSettings({
        ...cur,
        ...d.settings,
        // Preserve API keys
        ai: {
          ...cur.ai,
          ...(d.settings.ai || {}),
          geminiKey: cur.ai.geminiKey,
          openrouterKey: cur.ai.openrouterKey,
        },
      });
    }

    return true;
  } catch (err) {
    console.error('Import error:', err);
    return false;
  }
}

// CSV Export (Excel Compatible with UTF-8 BOM)
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (v: any) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const content =
    '\uFEFF' +
    headers.map(escapeCell).join(',') +
    '\n' +
    rows.map((row) => row.map(escapeCell).join(',')).join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportSessionsCsv(sessions: Session[]): void {
  const headers = ['تاریخ', 'درس', 'فصل', 'نوع مطالعه', 'مدت (دقیقه)', 'درست', 'غلط', 'نزده', 'درصد', 'یادداشت'];
  const rows = sessions.map((s) => {
    const total = s.correct + s.wrong + s.blank;
    const pct = total > 0 ? (((3 * s.correct - s.wrong) / (3 * total)) * 100).toFixed(1) : '—';
    return [
      s.day,
      s.subject,
      s.chapter || '',
      s.type || '',
      Math.round(s.seconds / 60),
      s.correct,
      s.wrong,
      s.blank,
      pct,
      s.note || '',
    ];
  });
  downloadCsv(`konkoor-sessions-${studyDayKey()}.csv`, headers, rows);
}

export function exportExamsCsv(exams: Exam[]): void {
  const headers = ['تاریخ', 'درس', 'درست', 'غلط', 'نزده', 'زمان (دقیقه)', 'درصد نهایی', 'توضیحات'];
  const rows = exams.map((e) => [
    e.day,
    e.subject,
    e.correct,
    e.wrong,
    e.blank,
    e.duration,
    e.percent.toFixed(1) + '٪',
    e.note || '',
  ]);
  downloadCsv(`konkoor-exams-${studyDayKey()}.csv`, headers, rows);
}

export function exportMistakesCsv(mistakes: MistakeCard[]): void {
  const headers = ['مرحله لایتنر', 'اهمیت', 'درس', 'فصل', 'علت اشتباه', 'صورت سوال', 'منبع', 'تاریخ مرور بعدی'];
  const rows = mistakes.map((m) => [
    m.box,
    m.importance,
    m.subject,
    m.chapter || '',
    m.cause,
    m.question.replace(/\s+/g, ' '),
    m.source || '',
    m.next_review,
  ]);
  downloadCsv(`konkoor-mistakes-${studyDayKey()}.csv`, headers, rows);
}
