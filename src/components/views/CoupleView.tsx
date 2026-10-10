import React, { useState, useEffect } from 'react';
import {
  Heart,
  Clock,
  Trophy,
  Users,
  Settings,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Award,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
  Database,
  Radio,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AppSettings, Session } from '../../types';
import { faNum, fmtHM, fmtPercent, getWeekDays, studyDayKey } from '../../lib/jalali';
import {
  CoupleMemberState,
  getCoupleSettings,
  saveCoupleSettings,
  getStoredPartnerState,
  savePartnerState,
  broadcastMyState,
  fetchRemotePartnerState,
  subscribeToPartnerRealtime,
  DEFAULT_PAIR_CODE,
} from '../../lib/coupleSync';
import { testSupabaseConnection } from '../../lib/supabase';
import { getSubject } from '../../lib/constants';
import { Avatar3DBadge } from '../common/Avatar3DBadge';

interface CoupleViewProps {
  sessions: Session[];
  liveTimerSeconds: number;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  activeTimerSubject?: string;
  isTimerRunning?: boolean;
}

export const CoupleView: React.FC<CoupleViewProps> = ({
  sessions,
  liveTimerSeconds,
  activeTimerSubject = 'bio',
  isTimerRunning = false,
}) => {
  const today = studyDayKey();
  const weekDays = getWeekDays(today);
  const coupleConfig = getCoupleSettings();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'today' | 'weekly' | 'monthly' | 'settings'>('today');

  // Pair Settings State
  const [myRole, setMyRole] = useState<'husband' | 'wife'>(coupleConfig.myRole);
  const [myEmail, setMyEmail] = useState(coupleConfig.myEmail || '');
  const [partnerEmail, setPartnerEmail] = useState(coupleConfig.partnerEmail || '');
  const [myName, setMyName] = useState(coupleConfig.myName);
  const [partnerName, setPartnerName] = useState(coupleConfig.partnerName);
  const [pairCode, setPairCode] = useState(coupleConfig.pairCode);
  const [pairSavedSuccess, setPairSavedSuccess] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Partner State (Live & Synced via Supabase)
  const [partnerState, setPartnerState] = useState<CoupleMemberState>(() => getStoredPartnerState());
  const [isSyncing, setIsSyncing] = useState(false);

  // Supabase status
  const [sbStatus, setSbStatus] = useState<string | null>(null);

  // Calculate my own today statistics
  const todaySessions = (sessions || []).filter(
    (s) => s && !s.deleted_at && s.day === today
  );
  const ownTodaySessionSeconds = todaySessions.reduce((sum, s) => sum + (s.seconds || 0), 0);
  const ownTodayTotalSeconds = ownTodaySessionSeconds + (liveTimerSeconds || 0);
  const ownTodayMinutes = Math.round(ownTodayTotalSeconds / 60);

  const ownTodayTests = todaySessions.reduce(
    (sum, s) => sum + (s.correct || 0) + (s.wrong || 0) + (s.blank || 0),
    0
  );

  // 1. Initial remote fetch from Supabase
  useEffect(() => {
    let isMounted = true;
    fetchRemotePartnerState().then((remote) => {
      if (remote && isMounted) {
        setPartnerState(remote);
      }
    });

    // 2. Realtime subscription to Supabase broadcast and table changes
    const unsubscribe = subscribeToPartnerRealtime((incoming) => {
      if (isMounted) {
        setPartnerState(incoming);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [pairCode, myRole]);

  // 3. Local tick if partner is actively studying
  useEffect(() => {
    const timer = setInterval(() => {
      setPartnerState((prev) => {
        if (!prev.isStudying) return prev;
        const next = {
          ...prev,
          sessionElapsedSeconds: prev.sessionElapsedSeconds + 1,
          todaySeconds: prev.todaySeconds + 1,
          lastHeartbeat: Date.now(),
        };
        savePartnerState(next);
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 4. Broadcast my state to Supabase whenever my timer ticks or status updates
  useEffect(() => {
    broadcastMyState({
      isStudying: isTimerRunning,
      subject: activeTimerSubject,
      subjectName: getSubject(activeTimerSubject).name,
      sessionElapsedSeconds: liveTimerSeconds,
      todaySeconds: ownTodayTotalSeconds,
      todayTests: ownTodayTests,
    });
  }, [isTimerRunning, liveTimerSeconds, activeTimerSubject, ownTodayTotalSeconds, ownTodayTests]);

  const partnerTodayMinutes = Math.round(partnerState.todaySeconds / 60);
  const diffMinutes = ownTodayMinutes - partnerTodayMinutes;
  const isAhead = diffMinutes >= 0;

  const handleSavePairSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMyEmail = myEmail.trim();
    const cleanPartnerEmail = partnerEmail.trim();
    const cleanMyName = myName.trim() || (cleanMyEmail.toLowerCase().includes('amir') ? 'امیرمحمد' : 'امیرمحمد');
    const cleanPartnerName = partnerName.trim() || 'همسرم';
    const cleanPairCode = pairCode.trim() || DEFAULT_PAIR_CODE;

    saveCoupleSettings({
      myRole,
      pairCode: cleanPairCode,
      myName: cleanMyName,
      partnerName: cleanPartnerName,
      myEmail: cleanMyEmail,
      partnerEmail: cleanPartnerEmail,
    });
    setPairSavedSuccess(true);
    setTimeout(() => setPairSavedSuccess(false), 2500);

    // Re-fetch after settings save
    fetchRemotePartnerState().then((remote) => {
      if (remote) setPartnerState(remote);
    });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSbStatus('در حال اتصال و همگام‌سازی با سرور Supabase...');
    const res = await testSupabaseConnection();
    const remote = await fetchRemotePartnerState();
    if (remote) {
      setPartnerState(remote);
      setSbStatus('همگام‌سازی داده‌های زنده با موفقیت انجام شد.');
    } else {
      setSbStatus(res.message);
    }
    setTimeout(() => setIsSyncing(false), 600);
  };

  // Generate Weekly Comparative Data for Recharts
  const weeklyData = weekDays.map((wd) => {
    const daySessions = (sessions || []).filter(
      (s) => s && !s.deleted_at && s.day === wd.iso
    );
    const daySecs = daySessions.reduce((sum, s) => sum + (s.seconds || 0), 0);
    const isToday = wd.iso === today;
    const myMins = Math.round((daySecs + (isToday ? liveTimerSeconds : 0)) / 60);

    const partnerMins = isToday ? partnerTodayMinutes : 0;

    return {
      day: wd.weekdayName,
      [myName]: myMins,
      [partnerName]: partnerMins,
      myTests: daySessions.reduce((s, it) => s + (it.correct || 0) + (it.wrong || 0), 0),
      partnerTests: isToday ? partnerState.todayTests : 0,
    };
  });

  const totalWeekMyMinutes = weeklyData.reduce((sum, d) => sum + (Number(d[myName]) || 0), 0);
  const totalWeekPartnerMinutes = weeklyData.reduce((sum, d) => sum + (Number(d[partnerName]) || 0), 0);
  const weekWinner = totalWeekMyMinutes >= totalWeekPartnerMinutes ? myName : partnerName;

  return (
    <div className="space-y-6 pb-14 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight break-words">
              رقابت مطالعه دونفره من و همسرم
            </h2>
            <span className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 shadow-xs shrink-0">
              <Heart className="w-4 h-4 fill-blue-600 dark:fill-blue-400 text-blue-600 dark:text-blue-400" />
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            مشاهده زنده تایمر هم‌مسیر، مقایسه روزانه و هفتگی بدون پیام‌های واسطه
          </p>
        </div>

        {/* Live sync indicator & trigger */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl neu-inset text-[11px] font-bold text-blue-700 dark:text-blue-300">
            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
            <span>اتصال زنده دونفره فعال</span>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="p-2 rounded-xl neu-raised-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer transition-all disabled:opacity-50"
            title="بروزرسانی داده‌های زنده"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="p-1 rounded-2xl neu-inset flex gap-1 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'today'
              ? 'neu-raised text-blue-700 dark:text-blue-300 font-extrabold shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>تایمرهای زنده امروز</span>
        </button>

        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'weekly'
              ? 'neu-raised text-blue-700 dark:text-blue-300 font-extrabold shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>مقایسه هفتگی (Recharts)</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'monthly'
              ? 'neu-raised text-blue-700 dark:text-blue-300 font-extrabold shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          <span>مقایسه ماهانه</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'settings'
              ? 'neu-raised text-blue-700 dark:text-blue-300 font-extrabold shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5 shrink-0" />
          <span>اتصال و تنظیمات</span>
        </button>
      </div>

      {/* TAB 1: TODAY LIVE BATTLE */}
      {activeTab === 'today' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Who is Ahead Banner */}
          <div className="neu-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
                <Trophy className="w-5 h-5 text-yellow-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  وضعیت رقابت امروز
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                  {diffMinutes === 0
                    ? 'هر دو نفر در وضعیت مطالعه همگام و برابر هستید.'
                    : isAhead
                    ? `شما در حال حاضر ${faNum(Math.abs(diffMinutes))} دقیقه در مطالعه امروز جلوتر هستید.`
                    : `${partnerName} در حال حاضر ${faNum(Math.abs(diffMinutes))} دقیقه جلوتر است.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                اختلاف: {faNum(Math.abs(diffMinutes))} دقیقه
              </span>
            </div>
          </div>

          {/* Side-by-Side Dual Live Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. MY CARD */}
            <div className="neu-card p-6 space-y-5 border-t-4 border-t-blue-600">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar3DBadge role={myRole} size="md" isStudying={isTimerRunning} />
                  <div className="min-w-0">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white block truncate">
                      {myName}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {isTimerRunning ? 'در حال مطالعه روی این دستگاه' : 'تایمر در حالت توقف'}
                    </span>
                  </div>
                </div>

                <span
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    isTimerRunning
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isTimerRunning ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span>{isTimerRunning ? 'در حال مطالعه' : 'آماده پارت'}</span>
                </span>
              </div>

              {/* Big Timer Display */}
              <div className="p-4 rounded-2xl neu-inset text-center space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">
                  مجموع خالص مطالعه امروز
                </span>
                <div className="text-3xl font-black font-mono text-blue-600 dark:text-blue-400" dir="ltr">
                  {fmtHM(ownTodayMinutes)}
                </div>
                {isTimerRunning && (
                  <span className="text-xs font-bold text-blue-500 block mt-1 break-words">
                    درس جاری: {getSubject(activeTimerSubject).name} ({faNum(Math.floor(liveTimerSeconds / 60))} دقیقه)
                  </span>
                )}
              </div>

              {/* Sub metrics */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl neu-raised-sm">
                  <span className="text-[10px] text-slate-400 block mb-0.5">تست‌های امروز</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
                    {faNum(ownTodayTests)}
                  </span>
                </div>
                <div className="p-3 rounded-xl neu-raised-sm">
                  <span className="text-[10px] text-slate-400 block mb-0.5">پارت‌های پایان‌یافته</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
                    {faNum(todaySessions.length)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. PARTNER CARD */}
            <div className="neu-card p-6 space-y-5 border-t-4 border-t-sky-500">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar3DBadge role={myRole === 'husband' ? 'wife' : 'husband'} size="md" isStudying={partnerState.isStudying} />
                  <div className="min-w-0">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white block truncate">
                      {partnerName}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {partnerState.isStudying ? `در حال مطالعه ${partnerState.subjectName}` : 'آنلاین و آماده'}
                    </span>
                  </div>
                </div>

                <span
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    partnerState.isStudying
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      partnerState.isStudying ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span>{partnerState.isStudying ? 'در حال مطالعه زنده' : 'استراحت'}</span>
                </span>
              </div>

              {/* Partner Big Timer Display */}
              <div className="p-4 rounded-2xl neu-inset text-center space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">
                  مجموع مطالعه امروز همسر
                </span>
                <div className="text-3xl font-black font-mono text-sky-600 dark:text-sky-400" dir="ltr">
                  {fmtHM(partnerTodayMinutes)}
                </div>
                {partnerState.isStudying && (
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400 block mt-1 break-words">
                    درس جاری: {partnerState.subjectName} ({faNum(Math.floor(partnerState.sessionElapsedSeconds / 60))} دقیقه تیک‌تاک زنده)
                  </span>
                )}
              </div>

              {/* Sub metrics */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl neu-raised-sm">
                  <span className="text-[10px] text-slate-400 block mb-0.5">تست‌های حل‌شده</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
                    {faNum(partnerState.todayTests)}
                  </span>
                </div>
                <div className="p-3 rounded-xl neu-raised-sm">
                  <span className="text-[10px] text-slate-400 block mb-0.5">وضعیت اتصال</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {partnerState.online ? 'متصل به سرور' : 'در انتظار اتصال'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparative Progress Bar */}
          <div className="neu-card p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold gap-2">
              <span className="text-slate-700 dark:text-slate-200 break-words">
                نسبت حجم مطالعه امروز: {myName} ({fmtPercent((ownTodayMinutes / Math.max(1, ownTodayMinutes + partnerTodayMinutes)) * 100)}) به {partnerName} ({fmtPercent((partnerTodayMinutes / Math.max(1, ownTodayMinutes + partnerTodayMinutes)) * 100)})
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-mono text-xs shrink-0">
                مجموع: {fmtHM(ownTodayMinutes + partnerTodayMinutes)}
              </span>
            </div>

            <div className="w-full h-3.5 rounded-full neu-inset p-0.5 flex overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300 shadow-xs"
                style={{
                  width: `${(ownTodayMinutes / Math.max(1, ownTodayMinutes + partnerTodayMinutes)) * 100}%`,
                }}
              />
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-300 shadow-xs"
                style={{
                  width: `${(partnerTodayMinutes / Math.max(1, ownTodayMinutes + partnerTodayMinutes)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY COMPARISON (RECHARTS DUAL BAR CHART) */}
      {activeTab === 'weekly' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Summary Winner Card */}
          <div className="neu-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Award className="w-6 h-6 text-yellow-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                  رتبه‌برتر هفته جاری: {weekWinner}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                  مجموع مطالعه شما: {fmtHM(totalWeekMyMinutes)} | مجموع مطالعه همسر: {fmtHM(totalWeekPartnerMinutes)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                مجموع مطالعه مشترک: {fmtHM(totalWeekMyMinutes + totalWeekPartnerMinutes)}
              </span>
            </div>
          </div>

          {/* Recharts Side-by-Side Dual Bar Chart */}
          <div className="neu-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800 gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  نمودار شانه به شانه مطالعه در طول هفته (شنبه تا جمعه)
                </h3>
                <p className="text-xs text-slate-400">مقایسه دقیق دقایق ثبت‌شده به تفکیک روز</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                <div className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-3 h-3 rounded-md bg-blue-600 shrink-0" />
                  <span className="truncate max-w-[100px]">{myName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sky-500">
                  <span className="w-3 h-3 rounded-md bg-sky-500 shrink-0" />
                  <span className="truncate max-w-[100px]">{partnerName}</span>
                </div>
              </div>
            </div>

            <div className="w-full h-72 pt-4" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 22, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${val}د`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as any;
                        return (
                          <div
                            dir="rtl"
                            className="bg-slate-900/95 text-white text-xs p-3 rounded-2xl shadow-xl border border-slate-700 space-y-1.5"
                          >
                            <span className="font-bold block text-blue-300 pb-1 border-b border-slate-700">
                              {data.day}
                            </span>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-blue-400 font-bold">{myName}:</span>
                              <span className="font-mono text-white font-bold">
                                {fmtHM(data[myName])} ({faNum(data[myName])} دقیقه)
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sky-400 font-bold">{partnerName}:</span>
                              <span className="font-mono text-white font-bold">
                                {fmtHM(data[partnerName])} ({faNum(data[partnerName])} دقیقه)
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey={myName} fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey={partnerName} fill="#38bdf8" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY COMPARISON */}
      {activeTab === 'monthly' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="neu-card p-5 text-center space-y-2">
              <span className="text-xs font-bold text-slate-500 block">میانگین روزانه مطالعه من</span>
              <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                {fmtHM(Math.round(totalWeekMyMinutes / 7))}
              </div>
              <span className="text-[11px] text-slate-400 block">بر اساس داده‌های هفته جاری</span>
            </div>

            <div className="neu-card p-5 text-center space-y-2">
              <span className="text-xs font-bold text-slate-500 block">میانگین روزانه مطالعه همسر</span>
              <div className="text-2xl font-black font-mono text-sky-500">
                {fmtHM(Math.round(totalWeekPartnerMinutes / 7))}
              </div>
              <span className="text-[11px] text-slate-400 block">بر اساس داده‌های همگام‌شده</span>
            </div>

            <div className="neu-card p-5 text-center space-y-2">
              <span className="text-xs font-bold text-slate-500 block">تست‌های حل‌شده امروز</span>
              <div className="text-2xl font-black font-mono text-slate-800 dark:text-slate-100">
                {faNum(ownTodayTests + partnerState.todayTests)}
              </div>
              <span className="text-[11px] text-slate-400 block">مجموع دو نفره</span>
            </div>
          </div>

          <div className="neu-card p-6 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              برنامه رشد و پیشرفت دو نفره در ماه
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              با مطالعه مستمر دونفره و بررسی شانه به شانه ساعت مطالعه، تمرکز و انگیزه شما تا روز کنکور در بالاترین سطح ممکن حفظ می‌شود.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: PAIR SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-200 max-w-xl">
          <div className="neu-card p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
              <Settings className="w-4 h-4 text-blue-600 shrink-0" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                شخصی‌سازی نام‌ها و کد اتاق دونفره
              </h3>
            </div>

            <form onSubmit={handleSavePairSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  نقش من روی این دستگاه:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMyRole('husband');
                      setMyName('امیرمحمد');
                      setMyEmail('am.moradidaem@gmail.com');
                      setPartnerName('آرمیتا');
                      setPartnerEmail('amirtaplans@gmail.com');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                      myRole === 'husband'
                        ? 'neu-btn-primary'
                        : 'neu-raised-sm text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    همسر ۱ (امیرمحمد)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMyRole('wife');
                      setMyName('آرمیتا');
                      setMyEmail('amirtaplans@gmail.com');
                      setPartnerName('امیرمحمد');
                      setPartnerEmail('am.moradidaem@gmail.com');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                      myRole === 'wife'
                        ? 'neu-btn-primary'
                        : 'neu-raised-sm text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    همسر ۲ (آرمیتا)
                  </button>
                </div>
              </div>

              {/* My Email & Auto Name Resolution */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  ایمیل ورودی من (شناسایی هوشمند حساب)
                </label>
                <input
                  type="email"
                  value={myEmail}
                  placeholder="am.moradidaem@gmail.com"
                  onChange={(e) => {
                    const val = e.target.value;
                    setMyEmail(val);
                    if (val.toLowerCase().includes('amir') || val.toLowerCase().includes('moradi')) {
                      setMyName('امیرمحمد');
                    } else if (val.toLowerCase().includes('armita') || val.toLowerCase().includes('amirtaplan')) {
                      setMyName('آرمیتا');
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl neu-inset font-medium text-slate-800 dark:text-slate-100"
                  dir="ltr"
                />
                <span className="text-[10px] text-blue-600 dark:text-blue-400 block">
                  با وارد کردن ایمیل شما، نام حساب به طور خودکار به «امیرمحمد» متصل می‌شود.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  نام نمایشی من
                </label>
                <input
                  type="text"
                  value={myName}
                  placeholder="امیرمحمد"
                  onChange={(e) => setMyName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl neu-inset font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Partner Email & Name */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  ایمیل همسرم
                </label>
                <input
                  type="email"
                  value={partnerEmail}
                  placeholder="amirtaplans@gmail.com"
                  onChange={(e) => {
                    const val = e.target.value;
                    setPartnerEmail(val);
                    if (val.toLowerCase().includes('armita') || val.toLowerCase().includes('amirtaplan')) {
                      setPartnerName('آرمیتا');
                    } else if (val.toLowerCase().includes('amir') || val.toLowerCase().includes('moradi')) {
                      setPartnerName('امیرمحمد');
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl neu-inset font-medium text-slate-800 dark:text-slate-100"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  نام نمایشی همسرم
                </label>
                <input
                  type="text"
                  value={partnerName}
                  placeholder="آرمیتا"
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl neu-inset font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  کد اختصاصی اتصال اتاق مطالعه (Pair Code)
                </label>
                <input
                  type="text"
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl neu-inset font-mono text-center font-bold text-blue-700 dark:text-blue-300"
                  dir="ltr"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  همین کد را روی دستگاه همسرتان نیز وارد کنید تا داده‌های زنده مستقیماً همگام شوند.
                </span>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl neu-btn-primary font-bold cursor-pointer"
                >
                  ذخیره تنظیمات دونفره
                </button>

                {pairSavedSuccess && (
                  <span className="text-blue-600 font-bold flex items-center gap-1 text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تنظیمات ذخیره شد!</span>
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Database Connection Diagnostic & SQL Schema */}
          <div className="neu-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  وضعیت سرور پایگاه‌داده ابری Supabase Realtime
                </h4>
              </div>
              <button
                type="button"
                onClick={handleManualSync}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                تست مجدد اتصال
              </button>
            </div>

            {sbStatus && (
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">{sbStatus}</p>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                  کد SQL کامل ساخت تمام جداول (Sessions, Exams, Mistakes, Plans, Live States)
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  کد آماده را کپی کرده یا فایل را دانلود کنید و در پنل Supabase (بخش SQL Editor) اجرا نمایید تا ذخیره‌سازی ابری ۱۰۰٪ فعال شود.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fullSql = `-- ==============================================================================
-- اسکریپت SQL جامع و کامل دیتابیس سوپابیس (Supabase) برای اپلیکیشن کنکور دو نفره
-- این کد را مستقیماً در بخش SQL Editor در پنل Supabase کپی کرده و Run کنید.
-- ==============================================================================

-- ۰. حذف جداول قدیمی یا ناقص در صورت وجود (برای جلوگیری از خطای ستون‌های تکراری یا ناسازگار)
DROP TABLE IF EXISTS public.couple_live_states CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.exams CASCADE;
DROP TABLE IF EXISTS public.mistakes CASCADE;
DROP TABLE IF EXISTS public.daily_plans CASCADE;

-- ۱. جدول وضعیت رقابت و مطالعه زنده دو نفره (Couple Live States)
CREATE TABLE public.couple_live_states (
  pair_code text NOT NULL,
  role text NOT NULL,
  display_name text DEFAULT 'کاربر',
  email text,
  is_studying boolean DEFAULT false,
  subject text DEFAULT 'bio',
  subject_name text DEFAULT 'زیست‌شناسی',
  session_elapsed_seconds integer DEFAULT 0,
  today_seconds integer DEFAULT 0,
  today_tests integer DEFAULT 0,
  study_day text,
  online boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (pair_code, role)
);

-- ۲. جدول پارت‌ها و جلسات مطالعه (Sessions)
CREATE TABLE IF NOT EXISTS public.sessions (
  id text PRIMARY KEY,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  deleted_at bigint,
  device_id text DEFAULT 'client',
  pair_code text DEFAULT 'KONKOOR-DUO',
  user_email text,
  subject text NOT NULL,
  chapter text,
  goftar text,
  seconds integer NOT NULL DEFAULT 0,
  correct integer DEFAULT 0,
  wrong integer DEFAULT 0,
  blank integer DEFAULT 0,
  note text DEFAULT '',
  day text NOT NULL,
  type text DEFAULT 'آموزش و مطالعه'
);

-- ۳. جدول کارنامه و آزمون‌ها (Exams)
CREATE TABLE IF NOT EXISTS public.exams (
  id text PRIMARY KEY,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  deleted_at bigint,
  device_id text DEFAULT 'client',
  pair_code text DEFAULT 'KONKOOR-DUO',
  user_email text,
  subject text NOT NULL,
  day text NOT NULL,
  correct integer DEFAULT 0,
  wrong integer DEFAULT 0,
  blank integer DEFAULT 0,
  duration integer DEFAULT 0,
  percent numeric DEFAULT 0,
  note text DEFAULT ''
);

-- ۴. جدول جعبه لایتنر و دفترچه اشتباهات (Mistakes)
CREATE TABLE IF NOT EXISTS public.mistakes (
  id text PRIMARY KEY,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  deleted_at bigint,
  device_id text DEFAULT 'client',
  pair_code text DEFAULT 'KONKOOR-DUO',
  user_email text,
  subject text NOT NULL,
  chapter text,
  cause text NOT NULL,
  question text NOT NULL,
  source text,
  importance integer DEFAULT 3,
  image_data text,
  box integer DEFAULT 1,
  next_review text NOT NULL,
  history jsonb DEFAULT '[]'::jsonb
);

-- ۵. جدول برنامه‌ریزی روزانه (Daily Plans)
CREATE TABLE IF NOT EXISTS public.daily_plans (
  id text PRIMARY KEY,
  pair_code text DEFAULT 'KONKOOR-DUO',
  user_email text,
  day text NOT NULL,
  wake_time text DEFAULT '06:00',
  items jsonb DEFAULT '[]'::jsonb,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  device_id text DEFAULT 'client',
  deleted_at bigint
);

-- ۶. ایندکس‌های سریع
CREATE INDEX IF NOT EXISTS idx_sessions_pair ON public.sessions(pair_code);
CREATE INDEX IF NOT EXISTS idx_sessions_day ON public.sessions(day);
CREATE INDEX IF NOT EXISTS idx_exams_pair ON public.exams(pair_code);
CREATE INDEX IF NOT EXISTS idx_mistakes_pair ON public.mistakes(pair_code);
CREATE INDEX IF NOT EXISTS idx_daily_plans_pair ON public.daily_plans(pair_code);

-- ۷. امنیت سطحی RLS و دسترسی
ALTER TABLE public.couple_live_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Couple' AND tablename = 'couple_live_states') THEN CREATE POLICY "Public Couple" ON public.couple_live_states FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Sessions' AND tablename = 'sessions') THEN CREATE POLICY "Public Sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Exams' AND tablename = 'exams') THEN CREATE POLICY "Public Exams" ON public.exams FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Mistakes' AND tablename = 'mistakes') THEN CREATE POLICY "Public Mistakes" ON public.mistakes FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Plans' AND tablename = 'daily_plans') THEN CREATE POLICY "Public Plans" ON public.daily_plans FOR ALL USING (true) WITH CHECK (true); END IF;
END $$;

-- ۸. فعال‌سازی Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_live_states;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
`;
                    navigator.clipboard.writeText(fullSql);
                    setSqlCopied(true);
                    setTimeout(() => setSqlCopied(false), 3000);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors cursor-pointer shrink-0 shadow-sm"
                >
                  {sqlCopied ? 'کد SQL کپی شد!' : 'کپی اسکریپت SQL کامل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
