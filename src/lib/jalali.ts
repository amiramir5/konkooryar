// Exact Jalali / Gregorian bidirectional conversion
// Independent of browser quirks or missing Intl locale support

const G_DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const J_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function faNum(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return String(v).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function toEnNum(s: string | number | null | undefined): string {
  return String(s ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function toInt(v: any, fallback = 0): number {
  const cleaned = toEnNum(v).replace(/[^\d\-+]/g, '');
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function toFloat(v: any, fallback = 0): number {
  const cleaned = toEnNum(v).replace(/[^\d\-+.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

// Gregorian to Jalali
export function g2j(gy: number, gm: number, gd: number): [number, number, number] {
  const gY = gy - 1600;
  const gM = gm - 1;
  const gD = gd - 1;

  let gDayNo =
    365 * gY +
    Math.floor((gY + 3) / 4) -
    Math.floor((gY + 99) / 100) +
    Math.floor((gY + 399) / 400);

  for (let i = 0; i < gM; i++) gDayNo += G_DAYS_IN_MONTH[i];
  if (gM > 1 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) {
    gDayNo++;
  }
  gDayNo += gD;

  let jDayNo = gDayNo - 79;
  const jNp = Math.floor(jDayNo / 12053);
  jDayNo %= 12053;

  let jy = 979 + 33 * jNp + 4 * Math.floor(jDayNo / 1461);
  jDayNo %= 1461;

  if (jDayNo >= 366) {
    jy += Math.floor((jDayNo - 1) / 365);
    jDayNo = (jDayNo - 1) % 365;
  }

  const jm = jDayNo < 186 ? 1 + Math.floor(jDayNo / 31) : 7 + Math.floor((jDayNo - 186) / 30);
  const jd = 1 + (jDayNo < 186 ? jDayNo % 31 : (jDayNo - 186) % 30);

  return [jy, jm, jd];
}

// Jalali to Gregorian
export function j2g(jy: number, jm: number, jd: number): [number, number, number] {
  const jy2 = jy - 979;
  let jDayNo = 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4);

  for (let i = 1; i < jm; i++) {
    jDayNo += i <= 6 ? 31 : 30;
  }
  jDayNo += jd - 1;

  let gDayNo = jDayNo + 79;
  let gy = 1600 + 400 * Math.floor(gDayNo / 146097);
  gDayNo %= 146097;

  let leap = true;
  if (gDayNo >= 36525) {
    gDayNo--;
    gy += 100 * Math.floor(gDayNo / 36524);
    gDayNo %= 36524;
    if (gDayNo >= 365) gDayNo++;
    else leap = false;
  }

  gy += 4 * Math.floor(gDayNo / 1461);
  gDayNo %= 1461;

  if (gDayNo >= 366) {
    leap = false;
    gDayNo--;
    gy += Math.floor(gDayNo / 365);
    gDayNo %= 365;
  }

  const gdNum = gDayNo + 1;
  const gdm = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  let rem = gdNum;
  while (gm <= 12 && rem > gdm[gm]) {
    rem -= gdm[gm];
    gm++;
  }

  return [gy, gm, rem];
}

export function isJalaliLeapYear(jy: number): boolean {
  const a = j2g(jy, 1, 1);
  const b = j2g(jy + 1, 1, 1);
  return (
    Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2]) ===
    366 * 86400000
  );
}

export function daysInJMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function parseIso(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function formatIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function jalaliPartsFromIso(iso: string): [number, number, number] | null {
  const p = parseIso(iso);
  if (!p) return null;
  return g2j(p[0], p[1], p[2]);
}

export function isoFromJalali(jy: number, jm: number, jd: number): string {
  const g = j2g(jy, jm, jd);
  return formatIso(g[0], g[1], g[2]);
}

// 05:00 study day boundary support:
// If a student studies past midnight (e.g. 02:00 AM), it belongs to the previous study day.
export function studyDayKey(date: Date = new Date()): string {
  const d = new Date(date.getTime());
  if (d.getHours() < 5) {
    d.setDate(d.getDate() - 1);
  }
  return formatIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function todayIso(): string {
  const d = new Date();
  return formatIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function addDays(iso: string, n: number): string {
  const p = parseIso(iso);
  if (!p) return iso;
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  d.setUTCDate(d.getUTCDate() + n);
  return formatIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function diffDays(fromIso: string, toIso: string): number {
  const a = parseIso(fromIso);
  const b = parseIso(toIso);
  if (!a || !b) return 0;
  const utcA = Date.UTC(a[0], a[1] - 1, a[2]);
  const utcB = Date.UTC(b[0], b[1] - 1, b[2]);
  return Math.round((utcB - utcA) / 86400000);
}

export function calcDaysLeft(targetIso: string): number {
  const current = studyDayKey();
  const diff = diffDays(current, targetIso);
  return Math.max(0, diff);
}

export function formatPersianDate(
  iso: string,
  style: 'short' | 'long' | 'weekday' | 'month-year' = 'long'
): string {
  const jp = jalaliPartsFromIso(iso);
  if (!jp) return '—';
  const [jy, jm, jd] = jp;
  const monthName = J_MONTH_NAMES[jm - 1];

  if (style === 'short') {
    return `${faNum(jy)}/${faNum(String(jm).padStart(2, '0'))}/${faNum(String(jd).padStart(2, '0'))}`;
  }

  if (style === 'month-year') {
    return `${monthName} ${faNum(jy)}`;
  }

  const p = parseIso(iso);
  let weekdayName = '';
  if (p) {
    const dt = new Date(p[0], p[1] - 1, p[2]);
    const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
    weekdayName = days[dt.getDay()];
  }

  if (style === 'weekday') {
    return `${weekdayName}، ${faNum(jd)} ${monthName} ${faNum(jy)}`;
  }

  return `${faNum(jd)} ${monthName} ${faNum(jy)}`;
}

export function jalaliMonthKey(iso: string): string {
  const jp = jalaliPartsFromIso(iso);
  if (!jp) return '';
  return `${jp[0]}-${String(jp[1]).padStart(2, '0')}`;
}

export function relativeDayText(iso: string): string {
  const current = studyDayKey();
  const diff = diffDays(iso, current);
  if (diff === 0) return 'امروز';
  if (diff === 1) return 'دیروز';
  if (diff === -1) return 'فردا';
  if (diff > 1) return `${faNum(diff)} روز پیش`;
  return `${faNum(-diff)} روز بعد`;
}

// Iranian week starts Saturday (شنبه)
export function getWeekDays(centerIso: string): Array<{ iso: string; weekdayName: string; dayNum: number }> {
  const p = parseIso(centerIso);
  if (!p) return [];
  const dt = new Date(p[0], p[1] - 1, p[2]);
  const jsDay = dt.getDay(); // 0 is Sunday, 6 is Saturday
  const faOffset = (jsDay + 1) % 7; // Saturday -> 0, Sunday -> 1, ..., Friday -> 6

  const startIso = addDays(centerIso, -faOffset);
  const weekNames = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  const result = [];
  for (let i = 0; i < 7; i++) {
    const curIso = addDays(startIso, i);
    const jp = jalaliPartsFromIso(curIso);
    result.push({
      iso: curIso,
      weekdayName: weekNames[i],
      dayNum: jp ? jp[2] : 1,
    });
  }
  return result;
}

export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${faNum(String(h).padStart(2, '0'))}:${faNum(String(m).padStart(2, '0'))}:${faNum(String(sec).padStart(2, '0'))}`;
}

export function fmtHM(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${faNum(String(h).padStart(2, '0'))}:${faNum(String(min).padStart(2, '0'))}`;
}

export function fmtPercent(val: number): string {
  if (!Number.isFinite(val)) return '۰٪';
  return `${faNum(val.toFixed(1))}٪`;
}

// Konkoor standard negative grading formula:
// Score % = ((3 * Correct - Wrong) / (3 * Total)) * 100
export function calcKonkoorPercent(correct: number, wrong: number, blank: number): number {
  const total = correct + wrong + blank;
  if (total <= 0) return 0;
  const score = ((3 * correct - wrong) / (3 * total)) * 100;
  return Math.round(score * 10) / 10;
}

// Streak calculation adhering to study day boundary
export function computeStreak(sessions: Array<{ day: string; deleted_at: number | null }>): number {
  if (!Array.isArray(sessions) || !sessions.length) return 0;
  const days = new Set(
    sessions.filter((s) => s && !s.deleted_at && s.day).map((s) => s.day)
  );
  if (!days.size) return 0;

  let cursor = studyDayKey(new Date());
  if (!days.has(cursor)) {
    cursor = addDays(cursor, -1);
  }
  let count = 0;
  let guard = 0;
  while (days.has(cursor) && guard < 1000) {
    count++;
    cursor = addDays(cursor, -1);
    guard++;
  }
  return count;
}
