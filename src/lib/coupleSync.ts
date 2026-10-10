import { getSupabaseClient, getSupabaseConfig } from './supabase';
import { studyDayKey } from './jalali';

export interface CoupleMemberState {
  role: 'husband' | 'wife';
  name: string;
  avatar: string;
  isStudying: boolean;
  online: boolean;
  subject: string;
  subjectName: string;
  sessionElapsedSeconds: number;
  todaySeconds: number;
  todayTests: number;
  studyDay: string;
  lastHeartbeat: number;
}

export interface CoupleSessionComparison {
  day: string;
  weekdayName: string;
  husbandMinutes: number;
  wifeMinutes: number;
  husbandTests: number;
  wifeTests: number;
}

const STORAGE_KEYS = {
  ROLE: 'ky_couple_my_role_v4',
  PAIR_CODE: 'ky_couple_pair_code_v4',
  MY_NAME: 'ky_couple_my_name_v4',
  PARTNER_NAME: 'ky_couple_partner_name_v4',
  MY_EMAIL: 'ky_couple_my_email_v4',
  PARTNER_EMAIL: 'ky_couple_partner_email_v4',
  SIMULATION_ENABLED: 'ky_couple_simulation_v4',
  PARTNER_STATE: 'ky_couple_partner_state_v4',
};

export const DEFAULT_PAIR_CODE = 'KONKOOR-DUO';

export const HUSBAND_CONFIG = {
  name: 'امیرمحمد',
  email: 'am.moradidaem@gmail.com',
};

export const WIFE_CONFIG = {
  name: 'آرمیتا',
  email: 'amirtaplans@gmail.com',
};

export function resolveNameFromEmail(email: string, fallbackRole: 'husband' | 'wife'): string {
  const clean = (email || '').toLowerCase().trim();
  if (clean === 'amirtaplans@gmail.com' || clean.includes('armita') || clean.includes('amirtaplan')) {
    return 'آرمیتا';
  }
  if (clean === 'am.moradidaem@gmail.com' || clean.includes('moradi') || clean.includes('amir')) {
    return 'امیرمحمد';
  }
  return fallbackRole === 'husband' ? 'امیرمحمد' : 'آرمیتا';
}

export function getCoupleSettings() {
  if (typeof window === 'undefined') {
    return {
      myRole: 'husband' as const,
      pairCode: DEFAULT_PAIR_CODE,
      myName: HUSBAND_CONFIG.name,
      partnerName: WIFE_CONFIG.name,
      myEmail: HUSBAND_CONFIG.email,
      partnerEmail: WIFE_CONFIG.email,
      simulationEnabled: true,
    };
  }

  const role = (localStorage.getItem(STORAGE_KEYS.ROLE) as 'husband' | 'wife') || 'husband';
  const pairCode = localStorage.getItem(STORAGE_KEYS.PAIR_CODE) || DEFAULT_PAIR_CODE;
  const myEmail =
    localStorage.getItem(STORAGE_KEYS.MY_EMAIL) ||
    (role === 'husband' ? HUSBAND_CONFIG.email : WIFE_CONFIG.email);
  const partnerEmail =
    localStorage.getItem(STORAGE_KEYS.PARTNER_EMAIL) ||
    (role === 'husband' ? WIFE_CONFIG.email : HUSBAND_CONFIG.email);

  // Smart resolution from email if stored name is default or empty
  const storedMyName = localStorage.getItem(STORAGE_KEYS.MY_NAME);
  const myName =
    storedMyName && storedMyName !== 'من' && storedMyName !== 'همسر ۱' && storedMyName !== 'همسر ۲'
      ? storedMyName
      : (role === 'husband' ? HUSBAND_CONFIG.name : WIFE_CONFIG.name);

  const storedPartnerName = localStorage.getItem(STORAGE_KEYS.PARTNER_NAME);
  const partnerName =
    storedPartnerName &&
    storedPartnerName !== 'همسرم' &&
    storedPartnerName !== 'همسر ۲' &&
    storedPartnerName !== 'همسر ۱' &&
    storedPartnerName !== 'من'
      ? storedPartnerName
      : (role === 'husband' ? WIFE_CONFIG.name : HUSBAND_CONFIG.name);

  const simulationEnabled = localStorage.getItem(STORAGE_KEYS.SIMULATION_ENABLED) !== 'false';

  return { myRole: role, pairCode, myName, partnerName, myEmail, partnerEmail, simulationEnabled };
}

export function saveCoupleSettings(settings: {
  myRole: 'husband' | 'wife';
  pairCode: string;
  myName: string;
  partnerName: string;
  myEmail?: string;
  partnerEmail?: string;
  simulationEnabled?: boolean;
}) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ROLE, settings.myRole);
  localStorage.setItem(STORAGE_KEYS.PAIR_CODE, settings.pairCode);
  localStorage.setItem(STORAGE_KEYS.MY_NAME, settings.myName);
  localStorage.setItem(STORAGE_KEYS.PARTNER_NAME, settings.partnerName);
  if (settings.myEmail !== undefined) {
    localStorage.setItem(STORAGE_KEYS.MY_EMAIL, settings.myEmail);
  }
  if (settings.partnerEmail !== undefined) {
    localStorage.setItem(STORAGE_KEYS.PARTNER_EMAIL, settings.partnerEmail);
  }
  if (settings.simulationEnabled !== undefined) {
    localStorage.setItem(STORAGE_KEYS.SIMULATION_ENABLED, String(settings.simulationEnabled));
  }
}

/**
 * Broadcast my live study status to Supabase Realtime channel and table
 */
export async function broadcastMyState(state: Partial<CoupleMemberState>): Promise<void> {
  const settings = getCoupleSettings();
  const day = studyDayKey();

  const fullState: CoupleMemberState = {
    role: settings.myRole,
    name: settings.myName,
    avatar: '3d-badge',
    isStudying: state.isStudying || false,
    online: true,
    subject: state.subject || 'bio',
    subjectName: state.subjectName || 'زیست‌شناسی',
    sessionElapsedSeconds: state.sessionElapsedSeconds || 0,
    todaySeconds: state.todaySeconds || 0,
    todayTests: state.todayTests || 0,
    studyDay: day,
    lastHeartbeat: Date.now(),
  };

  // 1. Try Supabase Broadcast channel & DB upsert
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const room = supabase.channel(`couple-live-${settings.pairCode}`);
      await room.send({
        type: 'broadcast',
        event: 'timer_heartbeat',
        payload: fullState,
      });

      // Also upsert to couple_live_states by pair_code and role
      await supabase.from('couple_live_states').upsert(
        {
          pair_code: settings.pairCode,
          role: settings.myRole,
          display_name: settings.myName,
          is_studying: fullState.isStudying,
          subject: fullState.subject,
          subject_name: fullState.subjectName,
          session_elapsed_seconds: fullState.sessionElapsedSeconds,
          today_seconds: fullState.todaySeconds,
          today_tests: fullState.todayTests,
          study_day: day,
          online: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'pair_code,role' }
      );
    }
  } catch {
    // Non-blocking fallback
  }
}

/**
 * Fetch or get live partner state (with graceful offline fallback)
 */
export function getStoredPartnerState(): CoupleMemberState {
  const settings = getCoupleSettings();
  const partnerRole = settings.myRole === 'husband' ? 'wife' : 'husband';
  const defaultSubject = partnerRole === 'wife' ? 'زیست‌شناسی' : 'شیمی';

  if (typeof window === 'undefined') {
    return {
      role: partnerRole,
      name: settings.partnerName,
      avatar: '3d-badge',
      isStudying: false,
      online: true,
      subject: partnerRole === 'wife' ? 'bio' : 'chem',
      subjectName: defaultSubject,
      sessionElapsedSeconds: 0,
      todaySeconds: 0,
      todayTests: 0,
      studyDay: studyDayKey(),
      lastHeartbeat: Date.now(),
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PARTNER_STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.studyDay === studyDayKey()) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  return {
    role: partnerRole,
    name: settings.partnerName,
    avatar: '3d-badge',
    isStudying: false,
    online: true,
    subject: partnerRole === 'wife' ? 'bio' : 'chem',
    subjectName: defaultSubject,
    sessionElapsedSeconds: 0,
    todaySeconds: 0,
    todayTests: 0,
    studyDay: studyDayKey(),
    lastHeartbeat: Date.now(),
  };
}

export function savePartnerState(state: CoupleMemberState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PARTNER_STATE, JSON.stringify(state));
}

/**
 * Fetch the latest partner live record from Supabase table
 */
export async function fetchRemotePartnerState(): Promise<CoupleMemberState | null> {
  const settings = getCoupleSettings();
  const partnerRole = settings.myRole === 'husband' ? 'wife' : 'husband';
  const defaultSubject = partnerRole === 'wife' ? 'زیست‌شناسی' : 'شیمی';

  try {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('couple_live_states')
      .select('*')
      .eq('pair_code', settings.pairCode)
      .eq('role', partnerRole)
      .maybeSingle();

    if (error || !data) return null;

    const partnerState: CoupleMemberState = {
      role: partnerRole,
      name: data.display_name || settings.partnerName,
      avatar: '3d-badge',
      isStudying: Boolean(data.is_studying),
      online: Boolean(data.online),
      subject: data.subject || (partnerRole === 'wife' ? 'bio' : 'chem'),
      subjectName: data.subject_name || defaultSubject,
      sessionElapsedSeconds: Number(data.session_elapsed_seconds) || 0,
      todaySeconds: Number(data.today_seconds) || 0,
      todayTests: Number(data.today_tests) || 0,
      studyDay: data.study_day || studyDayKey(),
      lastHeartbeat: new Date(data.updated_at || Date.now()).getTime(),
    };

    savePartnerState(partnerState);
    return partnerState;
  } catch {
    return null;
  }
}

/**
 * Subscribe to realtime updates for partner state via Supabase Channel
 */
export function subscribeToPartnerRealtime(onPartnerUpdate: (state: CoupleMemberState) => void): () => void {
  const settings = getCoupleSettings();
  const partnerRole = settings.myRole === 'husband' ? 'wife' : 'husband';
  const defaultSubject = partnerRole === 'wife' ? 'زیست‌شناسی' : 'شیمی';

  try {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    const channel = supabase
      .channel(`couple-live-${settings.pairCode}`)
      .on('broadcast', { event: 'timer_heartbeat' }, (event: any) => {
        const payload = event?.payload;
        if (payload && payload.role === partnerRole) {
          const updatedState: CoupleMemberState = {
            role: partnerRole,
            name: payload.name || settings.partnerName,
            avatar: '3d-badge',
            isStudying: Boolean(payload.isStudying),
            online: true,
            subject: payload.subject || 'bio',
            subjectName: payload.subjectName || defaultSubject,
            sessionElapsedSeconds: Number(payload.sessionElapsedSeconds) || 0,
            todaySeconds: Number(payload.todaySeconds) || 0,
            todayTests: Number(payload.todayTests) || 0,
            studyDay: payload.studyDay || studyDayKey(),
            lastHeartbeat: Date.now(),
          };
          savePartnerState(updatedState);
          onPartnerUpdate(updatedState);
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couple_live_states',
          filter: `pair_code=eq.${settings.pairCode}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (row && row.role === partnerRole) {
            const updatedState: CoupleMemberState = {
              role: partnerRole,
              name: row.display_name || settings.partnerName,
              avatar: '3d-badge',
              isStudying: Boolean(row.is_studying),
              online: Boolean(row.online),
              subject: row.subject || 'bio',
              subjectName: row.subject_name || defaultSubject,
              sessionElapsedSeconds: Number(row.session_elapsed_seconds) || 0,
              todaySeconds: Number(row.today_seconds) || 0,
              todayTests: Number(row.today_tests) || 0,
              studyDay: row.study_day || studyDayKey(),
              lastHeartbeat: new Date(row.updated_at || Date.now()).getTime(),
            };
            savePartnerState(updatedState);
            onPartnerUpdate(updatedState);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  } catch {
    return () => {};
  }
}
