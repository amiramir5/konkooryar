import { Session, Exam, MistakeCard, DailyPlan } from '../types';
import { getSupabaseClient } from './supabase';
import { getCoupleSettings } from './coupleSync';

/**
 * Push newly created or updated Session to Supabase
 */
export async function pushSessionToCloud(session: Session): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { pairCode, myEmail } = getCoupleSettings();

    const { error } = await supabase.from('sessions').upsert({
      id: session.id,
      created_at: session.created_at,
      updated_at: session.updated_at,
      deleted_at: session.deleted_at,
      device_id: session.device_id || 'client',
      pair_code: pairCode,
      user_email: myEmail || null,
      subject: session.subject,
      chapter: session.chapter || null,
      seconds: session.seconds,
      correct: session.correct || 0,
      wrong: session.wrong || 0,
      blank: session.blank || 0,
      note: session.note || '',
      day: session.day,
      type: session.type,
    });
    if (error) console.warn('Cloud sync failed for session:', error.message);
  } catch (err) {
    console.warn('Cloud sync failed for session:', err);
  }
}

/**
 * Push Exam result to Supabase
 */
export async function pushExamToCloud(exam: Exam): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { pairCode, myEmail } = getCoupleSettings();

    const { error } = await supabase.from('exams').upsert({
      id: exam.id,
      created_at: exam.created_at,
      updated_at: exam.updated_at,
      deleted_at: exam.deleted_at,
      device_id: exam.device_id || 'client',
      pair_code: pairCode,
      user_email: myEmail || null,
      subject: exam.subject,
      day: exam.day,
      correct: exam.correct || 0,
      wrong: exam.wrong || 0,
      blank: exam.blank || 0,
      duration: exam.duration || 0,
      percent: exam.percent || 0,
      note: exam.note || '',
    });
    if (error) console.warn('Cloud sync failed for exam:', error.message);
  } catch (err) {
    console.warn('Cloud sync failed for exam:', err);
  }
}

/**
 * Push Mistake card to Supabase
 */
export async function pushMistakeToCloud(card: MistakeCard): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { pairCode, myEmail } = getCoupleSettings();

    const { error } = await supabase.from('mistakes').upsert({
      id: card.id,
      created_at: card.created_at,
      updated_at: card.updated_at,
      deleted_at: card.deleted_at,
      device_id: card.device_id || 'client',
      pair_code: pairCode,
      user_email: myEmail || null,
      subject: card.subject,
      chapter: card.chapter || null,
      cause: card.cause,
      question: card.question,
      source: card.source || null,
      importance: card.importance || 3,
      image_data: card.image_data || null,
      box: card.box || 1,
      next_review: card.next_review,
      history: card.history || [],
    });
    if (error) console.warn('Cloud sync failed for mistake:', error.message);
  } catch (err) {
    console.warn('Cloud sync failed for mistake:', err);
  }
}

/**
 * Push a newly created, edited, or soft-deleted daily plan to Supabase.
 */
export async function pushPlanToCloud(plan: DailyPlan): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { pairCode, myEmail } = getCoupleSettings();
    const { error } = await supabase.from('daily_plans').upsert({
      id: plan.id,
      pair_code: pairCode,
      user_email: myEmail || null,
      day: plan.day,
      wake_time: plan.wake_time || '06:00',
      items: plan.items || [],
      created_at: plan.created_at,
      updated_at: plan.updated_at,
      device_id: plan.device_id || 'client',
      deleted_at: plan.deleted_at,
    });
    if (error) console.warn('Cloud sync failed for daily plan:', error.message);
  } catch (err) {
    console.warn('Cloud sync failed for daily plan:', err);
  }
}

/**
 * Pull all data from Supabase for this pairCode and merge with local
 */
export async function fetchCloudData(): Promise<{
  sessions?: Session[];
  exams?: Exam[];
  mistakes?: MistakeCard[];
  plans?: DailyPlan[];
} | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { pairCode } = getCoupleSettings();

    const [sessionsRes, examsRes, mistakesRes, plansRes] = await Promise.all([
      supabase.from('sessions').select('*').eq('pair_code', pairCode).limit(500),
      supabase.from('exams').select('*').eq('pair_code', pairCode).limit(200),
      supabase.from('mistakes').select('*').eq('pair_code', pairCode).limit(300),
      supabase.from('daily_plans').select('*').eq('pair_code', pairCode).limit(50),
    ]);

    return {
      sessions: sessionsRes.data || [],
      exams: examsRes.data || [],
      mistakes: mistakesRes.data || [],
      plans: plansRes.data || [],
    };
  } catch (err) {
    console.warn('Failed to fetch cloud records:', err);
    return null;
  }
}
