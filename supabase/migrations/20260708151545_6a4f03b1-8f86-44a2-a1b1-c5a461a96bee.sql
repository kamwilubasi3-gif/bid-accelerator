
-- Profiles table keyed by firebase_uid (text) since auth is Firebase, not Supabase
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  has_company BOOLEAN DEFAULT false,
  company_name TEXT,
  company_reg_number TEXT,
  tpin TEXT,
  company_contacts TEXT,
  company_address TEXT,
  company_reg_doc_url TEXT,
  plan TEXT NOT NULL DEFAULT 'none',
  plan_expires_at TIMESTAMPTZ,
  free_trial_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles open" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firebase_uid TEXT NOT NULL,
  type TEXT NOT NULL, -- 'technical' | 'financial' | 'summary'
  title TEXT NOT NULL,
  content TEXT,
  winning_tips TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX proposals_uid_idx ON public.proposals(firebase_uid);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO anon, authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposals open" ON public.proposals FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.daily_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firebase_uid TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  proposals_count INTEGER NOT NULL DEFAULT 0,
  summaries_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(firebase_uid, usage_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_usage TO anon, authenticated;
GRANT ALL ON public.daily_usage TO service_role;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage open" ON public.daily_usage FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firebase_uid TEXT NOT NULL,
  deposit_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO anon, authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments open" ON public.payments FOR ALL USING (true) WITH CHECK (true);
