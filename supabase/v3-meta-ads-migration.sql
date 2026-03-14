-- ============================================================
-- V3 Meta Ads Migration
-- Run this in your Supabase SQL editor
-- Creates all tables needed for the Meta Ads portal
-- ============================================================

-- ============================================================
-- TABLE 1: meta_ads_reels
-- Replaces AirTable "Realkatiemae" table (152 records)
-- Tracks Instagram reels, their boost status, and performance
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meta_ads_reels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  name TEXT,
  attachment_url TEXT,
  status TEXT CHECK (status IN ('Active', 'Posted')),
  trial_boosted TEXT CHECK (trial_boosted IN ('Yes', 'No')),
  eligible_for_reboost TEXT CHECK (eligible_for_reboost IN ('YES', 'NO')),
  boosted_after_trial TEXT CHECK (boosted_after_trial IN ('Currently active', 'No')),
  date_reel_posted DATE,
  notes TEXT,
  expect_daily_spend DECIMAL(10,2) DEFAULT 0,
  expected_days_ran INTEGER DEFAULT 0,
  total_expected_spend DECIMAL(10,2) GENERATED ALWAYS AS (expect_daily_spend * expected_days_ran) STORED,
  days_remaining INTEGER DEFAULT 0,
  link_to_reel TEXT,
  total_views INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  view_to_like_ratio DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE WHEN total_likes > 0 THEN ROUND(total_views::DECIMAL / total_likes, 2) ELSE NULL END
  ) STORED,
  scrape TEXT CHECK (scrape IN ('YES'))
);

-- Enable RLS
ALTER TABLE public.meta_ads_reels ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can read
CREATE POLICY "Authenticated users can view reels"
  ON public.meta_ads_reels FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS: Admins can insert
CREATE POLICY "Admins can insert reels"
  ON public.meta_ads_reels FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS: Admins can update
CREATE POLICY "Admins can update reels"
  ON public.meta_ads_reels FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS: Admins can delete
CREATE POLICY "Admins can delete reels"
  ON public.meta_ads_reels FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- TABLE 2: meta_ads_account_logs
-- Replaces AirTable "Meta Ads Account Logs" (46 records)
-- Daily follower tracking for @realkatiemae
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meta_ads_account_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  date DATE NOT NULL,
  followers INTEGER,
  all_time_followers_gained INTEGER GENERATED ALWAYS AS (followers - 1200) STORED,
  twenty_four_hr_gain INTEGER,
  cpf DECIMAL(10,6)
);

-- Enable RLS
ALTER TABLE public.meta_ads_account_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view account logs"
  ON public.meta_ads_account_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert account logs"
  ON public.meta_ads_account_logs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update account logs"
  ON public.meta_ads_account_logs FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete account logs"
  ON public.meta_ads_account_logs FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- TABLE 3: meta_ads_realcambliss
-- Replaces AirTable "Realcambliss" (22 records)
-- Daily follower tracking for @realcambliss
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meta_ads_realcambliss (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  date DATE NOT NULL,
  followers INTEGER,
  twenty_four_hr_gain INTEGER
);

-- Enable RLS
ALTER TABLE public.meta_ads_realcambliss ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view realcambliss"
  ON public.meta_ads_realcambliss FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert realcambliss"
  ON public.meta_ads_realcambliss FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update realcambliss"
  ON public.meta_ads_realcambliss FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete realcambliss"
  ON public.meta_ads_realcambliss FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- TABLE 4: meta_ads_expenses
-- Replaces AirTable "Meta Ads Expenses" (57 records)
-- Funded vs Paid expense tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meta_ads_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  date DATE NOT NULL,
  amount DECIMAL(10,2),
  notes TEXT,
  type TEXT CHECK (type IN ('Funded', 'Paid'))
);

-- Enable RLS
ALTER TABLE public.meta_ads_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view expenses"
  ON public.meta_ads_expenses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert expenses"
  ON public.meta_ads_expenses FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update expenses"
  ON public.meta_ads_expenses FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete expenses"
  ON public.meta_ads_expenses FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Also allow service_role to bypass RLS for cron jobs
-- (service_role already bypasses RLS by default in Supabase)
-- ============================================================

-- ============================================================
-- INDEXES for common query patterns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_meta_ads_reels_status ON public.meta_ads_reels(status);
CREATE INDEX IF NOT EXISTS idx_meta_ads_reels_scrape ON public.meta_ads_reels(scrape);
CREATE INDEX IF NOT EXISTS idx_meta_ads_reels_boosted ON public.meta_ads_reels(boosted_after_trial);
CREATE INDEX IF NOT EXISTS idx_meta_ads_account_logs_date ON public.meta_ads_account_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ads_realcambliss_date ON public.meta_ads_realcambliss(date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ads_expenses_date ON public.meta_ads_expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ads_expenses_type ON public.meta_ads_expenses(type);
