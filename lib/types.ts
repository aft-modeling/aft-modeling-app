export type Role = 'creative_director' | 'editor' | 'qa'

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
