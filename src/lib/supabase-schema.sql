-- ==============================================================================
-- اسکریپت SQL جامع و کامل دیتابیس سوپابیس (Supabase) برای اپلیکیشن کنکور دو نفره
-- این کد را مستقیماً در بخش SQL Editor در پنل Supabase کپی کرده و Run کنید.
-- ==============================================================================

-- ۰. ایجاد جداول به‌شکل غیرمخرب؛ این اسکریپت نباید برای اجراهای مجدد داده‌های قبلی را حذف کند.
-- ۱. جدول وضعیت رقابت و مطالعه زنده دو نفره (Couple Live States)
CREATE TABLE IF NOT EXISTS public.couple_live_states (
  pair_code text NOT NULL,
  role text NOT NULL, -- 'husband' | 'wife'
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
  day text NOT NULL, -- YYYY-MM-DD
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

-- ۶. ساخت ایندکس‌های سریع برای جستجو بر اساس کد اتصال دونفره، روز و تاریخ
CREATE INDEX IF NOT EXISTS idx_sessions_pair_code ON public.sessions(pair_code);
CREATE INDEX IF NOT EXISTS idx_sessions_day ON public.sessions(day);
CREATE INDEX IF NOT EXISTS idx_exams_pair_code ON public.exams(pair_code);
CREATE INDEX IF NOT EXISTS idx_mistakes_pair_code ON public.mistakes(pair_code);
CREATE INDEX IF NOT EXISTS idx_daily_plans_pair_code ON public.daily_plans(pair_code);
CREATE INDEX IF NOT EXISTS idx_couple_states_pair ON public.couple_live_states(pair_code);

-- ۷. فعال‌سازی سیاست‌های امنیتی سطح ردیف (Row Level Security - RLS)
ALTER TABLE public.couple_live_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;

-- هشدار امنیتی مهم: سیاست‌های عمومی زیر به هر دارنده anon key اجازه خواندن/نوشتن همه ردیف‌ها را می‌دهند.
-- این الگوی بدون ورود کاربر فقط برای نمونه شخصی/آزمایشی است؛ برای انتشار عمومی، احراز هویت و RLS مبتنی بر کاربر لازم است.
-- دسترسی آزاد فعلاً برای سازگاری با همگام‌سازی فعلی اپ حفظ شده است.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Couple States' AND tablename = 'couple_live_states') THEN
    CREATE POLICY "Public Access Couple States" ON public.couple_live_states FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Sessions' AND tablename = 'sessions') THEN
    CREATE POLICY "Public Access Sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Exams' AND tablename = 'exams') THEN
    CREATE POLICY "Public Access Exams" ON public.exams FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Mistakes' AND tablename = 'mistakes') THEN
    CREATE POLICY "Public Access Mistakes" ON public.mistakes FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Plans' AND tablename = 'daily_plans') THEN
    CREATE POLICY "Public Access Plans" ON public.daily_plans FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ۸. فعال‌سازی قابلیت Realtime فقط وقتی جدول هنوز عضو publication نیست.
-- این بلوک برای اجرای مجدد اسکریپت خطا نمی‌دهد.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'couple_live_states'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_live_states;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;
END $$;
