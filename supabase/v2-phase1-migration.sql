-- ============================================================
-- V2 Phase 1 Migration: Foundation Restructure
-- Run this in your Supabase SQL editor
-- ============================================================

-- ============================================================
-- TASK 1: Add 'admin' role to the profiles table constraint
-- ============================================================

-- Drop old constraint and add new one with 'admin' included
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('creative_director', 'editor', 'qa', 'admin'));

-- Update RLS policies to give admin full access on ALL tables

-- ---- PROFILES ----
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---- CLIPS ----
CREATE POLICY "Admins can insert clips"
  ON public.clips FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete clips"
  ON public.clips FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---- SUBMISSIONS ----
CREATE POLICY "Admins can insert submissions"
  ON public.submissions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete submissions"
  ON public.submissions FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---- QA REVIEWS ----
CREATE POLICY "Admins can insert reviews"
  ON public.qa_reviews FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update reviews"
  ON public.qa_reviews FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete reviews"
  ON public.qa_reviews FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---- FINISHED CLIPS ----
CREATE POLICY "Admins can update finished clips"
  ON public.finished_clips FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete finished clips"
  ON public.finished_clips FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- TASK 2: Set admin@aftmodeling.com role to 'admin'
-- ============================================================
UPDATE public.profiles
  SET role = 'admin'
  WHERE email = 'admin@aftmodeling.com';

-- ============================================================
-- TASK 3: Create employee_portal_access table
-- ============================================================
CREATE TABLE public.employee_portal_access (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  portal_id text NOT NULL,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES public.profiles(id),
  UNIQUE(user_id, portal_id)
);

ALTER TABLE public.employee_portal_access ENABLE ROW LEVEL SECURITY;

-- Only admins can insert
CREATE POLICY "Admins can insert portal access"
  ON public.employee_portal_access FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can update
CREATE POLICY "Admins can update portal access"
  ON public.employee_portal_access FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can delete
CREATE POLICY "Admins can delete portal access"
  ON public.employee_portal_access FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- All authenticated users can select their own rows
CREATE POLICY "Users can view own portal access"
  ON public.employee_portal_access FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- SEED: Grant all non-admin employees access to 'video-editing'
-- ============================================================
INSERT INTO public.employee_portal_access (user_id, portal_id, granted_by)
SELECT
  p.id,
  'video-editing',
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
FROM public.profiles p
WHERE p.role != 'admin';
