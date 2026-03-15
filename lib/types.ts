
// ── Scheduling & Tasks ──────────────────────────────────────────

export interface Schedule {
  id: string
  user_id: string
  day_of_week: number // 0=Sun, 6=Sat
  is_off_day: boolean
  created_by: string | null
  updated_at: string
}

export interface ScheduleBlock {
  id: string
  schedule_id: string
  start_time: string // HH:MM:SS
  end_time: string   // HH:MM:SS
  label: string
  is_break: boolean
  notes: string
  created_by: string | null
}

export interface DailyTask {
  id: string
  title: string
  assigned_to: string | null // null = everyone
  created_by: string | null
  is_active: boolean
  created_at: string
}

export interface DailyTaskCompletion {
  id: string
  task_id: string
  user_id: string
  completed_on: string // DATE
  completed_at: string
}

export interface DailyTaskReport {
  id: string
  user_id: string
  report_date: string
  tasks_completed: { task_id: string; title: string; completed_at: string }[]
  tasks_missed: { task_id: string; title: string }[]
  total_assigned: number
  total_completed: number
  email_sent: boolean
  created_at: string
}

export interface OneTimeTask {
  id: string
  title: string
  notes: string
  assigned_to: string
  due_date: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_complete: boolean
  completed_at: string | null
  created_by: string | null
  created_at: string
}
export type Role = 'creative_director' | 'editor' | 'qa' | 'admin'

export type PortalId = 'video-editing' | 'scheduling' | 'payroll' | 'chatting' | 'client-portal' | 'meta-ads'

export interface PortalAccess {
  id: string
  user_id: string
  portal_id: PortalId
  granted_at: string
  granted_by: string | null
}

export interface PortalConfig {
  id: PortalId
  name: string
  description: string
  icon: string
  href: string
  active: boolean
  adminOnly?: boolean
}

export type ClipStatus =
  | 'assigned'        // CD assigned to editor
  | 'in_progress'     // Editor is working on it
  | 'submitted'       // Editor submitted, waiting for QA
  | 'in_qa'           // QA is reviewing
  | 'needs_revision'  // QA sent back
  | 'approved'        // QA approved
  | 'finished'        // Moved to finished clips

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  created_at: string
}

export interface Clip {
  id: string
  name: string
  example_reel_url: string
  additional_notes: string | null
  due_date: string
  assigned_editor_id: string | null
  assigned_editor?: Profile
  status: ClipStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface Submission {
  id: string
  clip_id: string
  clip?: Clip
  editor_id: string
  editor?: Profile
  round: number                    // revision round number (1, 2, 3...)
  drive_file_id: string | null
  drive_view_link: string | null
  drive_used_content_link: string | null
  status: 'pending_qa' | 'approved' | 'needs_revision'
  submitted_at: string
}

export interface QAReview {
  id: string
  submission_id: string
  submission?: Submission
  reviewer_id: string
  reviewer?: Profile
  is_4k_60fps: boolean
  is_appropriate_length: boolean
  is_subtitle_style_correct: boolean
  is_overall_quality_good: boolean
  qa_notes: string | null
  decision: 'approved' | 'needs_revision'
  reviewed_at: string
}

export interface FinishedClip {
  id: string
  clip_id: string
  clip?: Clip
  submission_id: string
  submission?: Submission
  final_review_id: string
  final_review?: QAReview
  editor_id: string
  editor?: Profile
  drive_view_link: string
  used_on: string | null
  finished_at: string
}

// ── Payroll ─────────────────────────────────────────────────────

export interface PayPeriod {
  id: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
  created_by: string
  created_at: string
  closed_at: string | null
}

export interface EditorCommission {
  id: string
  pay_period_id: string
  editor_id: string
  amount: number
  note: string | null
  created_by: string
  created_at: string
}

export interface PayrollSnapshot {
  id: string
  pay_period_id: string
  editor_id: string
  finished_clips_count: number
  base_pay: number
  commission_amount: number
  total_pay: number
  snapshot_at: string
}

// ── Meta Ads ────────────────────────────────────────────────────

export type ReelStatus = 'Active' | 'Posted'
export type ExpenseType = 'Funded' | 'Paid'

export interface MetaAdsReel {
  id: string
  created_at: string
  name: string | null
  attachment_url: string | null
  status: ReelStatus | null
  trial_boosted: 'Yes' | 'No' | null
  eligible_for_reboost: 'YES' | 'NO' | null
  boosted_after_trial: 'Currently active' | 'No' | null
  date_reel_posted: string | null
  notes: string | null
  expect_daily_spend: number
  expected_days_ran: number
  total_expected_spend: number  // generated column
  days_remaining: number
  link_to_reel: string | null
  total_views: number
  total_likes: number
  view_to_like_ratio: number | null  // generated column
  scrape: 'YES' | null
}

export interface MetaAdsAccountLog {
  id: string
  created_at: string
  date: string
  followers: number | null
  all_time_followers_gained: number | null  // generated column
  twenty_four_hr_gain: number | null
  cpf: number | null
}

export interface MetaAdsRealcambliss {
  id: string
  created_at: string
  date: string
  followers: number | null
  twenty_four_hr_gain: number | null
}

export interface MetaAdsExpense {
  id: string
  created_at: string
  date: string
  amount: number | null
  notes: string | null
  type: ExpenseType | null
}
