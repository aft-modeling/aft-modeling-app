import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { moveFileToApproved } from '@/lib/google-drive'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      submissionId, clipId, editorId, reviewerId,
      is_4k_60fps, is_appropriate_length, is_subtitle_style_correct, is_overall_quality_good,
      qa_notes, decision
    } = body

    // 1. Create QA Review record
    const { data: review, error: reviewError } = await supabase
      .from('qa_reviews')
      .insert({
        submission_id: submissionId,
        reviewer_id: reviewerId,
        is_4k_60fps,
        is_appropriate_length,
        is_subtitle_style_correct,
        is_overall_quality_good,
        qa_notes: qa_notes || null,
        decision,
      })
      .select()
      .single()

    if (reviewError) throw new Error(reviewError.message)

    // 2. Update submission status
    await supabase
      .from('submissions')
      .update({ status: decision })
      .eq('id', submissionId)

    if (decision === 'approved') {
      // =============================================
      // APPROVAL FLOW
      // =============================================

      // Get submission details for Drive move
      const { data: submission } = await supabase
        .from('submissions')
        .select('*, clip:clips(*), editor:profiles(*)')
        .eq('id', submissionId)
        .single()

      // Move file to Approved folder in Drive
      if (submission?.drive_file_id && submission?.editor?.full_name) {
        try {
          await moveFileToApproved(submission.drive_file_id, submission.editor.full_name)
        } catch (driveErr) {
          console.error('Drive move failed (non-fatal):', driveErr)
        }
      }

      // Create finished clip record
      const { error: finishedError } = await supabase
        .from('finished_clips')
        .insert({
          clip_id: clipId,
          submission_id: submissionId,
          final_review_id: review.id,
          editor_id: editorId,
          drive_view_link: submission?.drive_view_link || '',
          finished_at: new Date().toISOString(),
        })
      if (finishedError) throw new Error(finishedError.message)

      // Update clip status to finished
      await supabase
        .from('clips')
        .update({ status: 'finished', updated_at: new Date().toISOString() })
        .eq('id', clipId)

    } else {
      // =============================================
      // REVISION FLOW
      // =============================================

      // Update clip status back to needs_revision
      await supabase
        .from('clips')
        .update({ status: 'needs_revision', updated_at: new Date().toISOString() })
        .eq('id', clipId)

      // The editor will see this in their dashboard and resubmit
      // No duplicate records — same clip record is reused
    }

    return NextResponse.json({ success: true, review })
  } catch (err: any) {
    console.error('qa-review error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
