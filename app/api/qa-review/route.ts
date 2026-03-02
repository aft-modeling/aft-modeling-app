import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { moveFileToFinished, deleteFileFromDrive } from '@/lib/google-drive'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify user is QA
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'qa') {
      return NextResponse.json({ error: 'Only QA analysts can review clips' }, { status: 403 })
    }

    const body = await req.json()
    const { submissionId, clipId, editorId, decision, is_4k_60fps, is_appropriate_length, is_subtitle_style_correct, is_overall_quality_good, qa_notes } = body

    const reviewerId = session.user.id

    // 1. Insert QA review
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
      // ================================================
      // APPROVAL FLOW
      // ================================================

      // Get submission details for Drive move
      const { data: submission } = await supabase
        .from('submissions')
        .select('*, clip:clips(*), editor:profiles(*)')
        .eq('id', submissionId)
        .single()

      // Move file from Pending to Finished folder in Google Drive
      let driveViewLink = submission?.drive_view_link || ''
      if (submission?.drive_file_id && submission?.editor?.full_name) {
        try {
          console.log('[DRIVE] Moving file to Finished folder:', submission.drive_file_id)
          driveViewLink = await moveFileToFinished(
            submission.drive_file_id,
            submission.editor.full_name
          )
          console.log('[DRIVE] File moved successfully:', driveViewLink)
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
          drive_view_link: driveViewLink,
          finished_at: new Date().toISOString(),
        })

      if (finishedError) throw new Error(finishedError.message)

      // Update clip status to finished
      await supabase
        .from('clips')
        .update({ status: 'finished', updated_at: new Date().toISOString() })
        .eq('id', clipId)

      // Notify creative director(s) about approved clip
      const { data: cdUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'creative_director')

      if (cdUsers && cdUsers.length > 0) {
        const { data: editor } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', editorId)
          .single()

        const { data: clip } = await supabase
          .from('clips')
          .select('name')
          .eq('id', clipId)
          .single()

        const editorName = editor?.full_name || 'An editor'
        const clipName = clip?.name || 'A clip'

        const notifPayload = cdUsers.map((u) => ({
          user_id: u.id,
          message: `${editorName}'s clip "${clipName}" has been approved by QA`,
          type: 'clip_approved',
          clip_id: clipId,
        }))

        await supabase.from('notifications').insert(notifPayload)
      }

    } else {
      // REVISION FLOW - update clip status back to in_progress
      await supabase
        .from('clips')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', clipId)

      // Delete the file from Google Drive Pending folder (best-effort)
      const { data: submission } = await supabase
        .from('submissions')
        .select('drive_view_link')
        .eq('id', submissionId)
        .single()

      if (submission?.drive_view_link) {
        try {
          console.log('[DRIVE] Deleting denied submission file from Pending folder')
          await deleteFileFromDrive(submission.drive_view_link)
          console.log('[DRIVE] File deleted from Pending folder')
        } catch (driveErr) {
          console.error('Drive delete failed (non-fatal):', driveErr)
        }
      }

      // Notify editor about revision needed
      const { data: clip } = await supabase
        .from('clips')
        .select('name')
        .eq('id', clipId)
        .single()

      const clipName = clip?.name || 'A clip'

      await supabase.from('notifications').insert({
        user_id: editorId,
        message: '"' + clipName + '" needs revision: ' + (qa_notes || 'Please review QA feedback'),
        type: 'revision_needed',
        clip_id: clipId,
      })
    }

    return NextResponse.json({ success: true, review })
  } catch (error) {
    console.error('QA review error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}
