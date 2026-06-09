-- Users table (extends auth.users)
CREATE TABLE public.users (
  id                      UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT        NOT NULL,
  plan                    TEXT        NOT NULL DEFAULT 'free',
  tailors_used            INTEGER     NOT NULL DEFAULT 0,
  tailors_limit           INTEGER     NOT NULL DEFAULT 3,
  razorpay_subscription_id TEXT,
  period_start            TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tailors log table
CREATE TABLE public.tailors (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  jd_snippet    TEXT,
  output_length INTEGER
);

-- Enable RLS
ALTER TABLE public.users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailors ENABLE ROW LEVEL SECURITY;

-- Users RLS policies
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Tailors RLS policies
CREATE POLICY "tailors_select_own" ON public.tailors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tailors_insert_own" ON public.tailors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create user record on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
