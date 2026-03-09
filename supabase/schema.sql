-- ============================================================
-- AFT Modeling App - Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('creative_director', 'editor', 'qa', 'admin')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'editor')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- CLIPS (assigned by Creative Director)
-- ============================================================
create table public.clips (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  example_reel_url text not null,
  additional_notes text,
  due_date text not null,
  assigned_editor_id uuid references public.profiles(id) on delete set null,
  status text not null default 'assigned' check (
    status in ('assigned','in_progress','submitted','in_qa','needs_revision','approved','finished')
  ),
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.clips enable row level security;

create policy "All authenticated users can view clips"
  on public.clips for select using (auth.role() = 'authenticated');

create policy "Creative directors can insert clips"
  on public.clips for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'creative_director')
  );

create policy "Authenticated users can update clips"
  on public.clips for update using (auth.role() = 'authenticated');

-- ============================================================
-- SUBMISSIONS (editor submits a clip for QA)
-- ============================================================
create table public.submissions (
  id uuid default uuid_generate_v4() primary key,
  clip_id uuid references public.clips(id) on delete cascade not null,
  editor_id uuid references public.profiles(id) not null,
  round integer not null default 1,
  drive_file_id text,
  drive_view_link text,
  drive_used_content_link text,
  status text not null default 'pending_qa' check (
    status in ('pending_qa', 'approved', 'needs_revision')
  ),
  submitted_at timestamptz default now()
);

alter table public.submissions enable row level security;

create policy "All authenticated users can view submissions"
  on public.submissions for select using (auth.role() = 'authenticated');

create policy "Editors can insert submissions"
  on public.submissions for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('editor','creative_director'))
  );

create policy "Authenticated users can update submissions"
  on public.submissions for update using (auth.role() = 'authenticated');

-- ============================================================
-- QA REVIEWS
-- ============================================================
create table public.qa_reviews (
  id uuid default uuid_generate_v4() primary key,
  submission_id uuid references public.submissions(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) not null,
  is_4k_60fps boolean not null default false,
  is_appropriate_length boolean not null default false,
  is_subtitle_style_correct boolean not null default false,
  is_overall_quality_good boolean not null default false,
  qa_notes text,
  decision text not null check (decision in ('approved', 'needs_revision')),
  reviewed_at timestamptz default now()
);

alter table public.qa_reviews enable row level security;

create policy "All authenticated users can view qa_reviews"
  on public.qa_reviews for select using (auth.role() = 'authenticated');

create policy "QA users can insert reviews"
  on public.qa_reviews for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('qa','creative_director'))
  );

-- ============================================================
-- FINISHED CLIPS
-- ============================================================
create table public.finished_clips (
  id uuid default uuid_generate_v4() primary key,
  clip_id uuid references public.clips(id) on delete cascade not null,
  submission_id uuid references public.submissions(id) not null,
  final_review_id uuid references public.qa_reviews(id) not null,
  editor_id uuid references public.profiles(id) not null,
  drive_view_link text not null,
  used_on text,
  finished_at timestamptz default now()
);

alter table public.finished_clips enable row level security;

create policy "All authenticated users can view finished clips"
  on public.finished_clips for select using (auth.role() = 'authenticated');

create policy "System can insert finished clips"
  on public.finished_clips for insert with check (auth.role() = 'authenticated');

create policy "Creative directors can update finished clips"
  on public.finished_clips for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'creative_director')
  );

-- ============================================================
-- SEED: Placeholder Users
-- (Run AFTER creating accounts in Supabase Auth dashboard)
-- Replace UUIDs with actual user IDs from auth.users table
-- ============================================================

-- INSERT INTO public.profiles (id, email, full_name, role) VALUES
-- ('UUID_CD',   'cd@aftmodeling.com',      'Creative Director', 'creative_director'),
-- ('UUID_M',    'manuel@aftmodeling.com',  'Manuel',            'editor'),
-- ('UUID_R',    'rylan@aftmodeling.com',   'Rylan',             'editor'),
-- ('UUID_V',    'vince@aftmodeling.com',   'Vince',             'editor'),
-- ('UUID_E',    'emelen@aftmodeling.com',  'Emelen',            'editor'),
-- ('UUID_QA',   'qa@aftmodeling.com',      'QA Reviewer',       'qa');
