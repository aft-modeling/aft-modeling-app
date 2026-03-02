import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { deleteFileFromDrive } from '@/lib/google-drive'

export async function POST(request: Request) {
  // Verify the requester is an admin or creative_director
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'creative_director')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { clipId } = await request.json()
  if (!clipId) {
    return NextResponse.json({ error: 'Missing clipId' }, { status: 400 })
  }

  // Use service role client for cascading deletes
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Get all submissions for this clip (for Drive cleanup)
  const { data: submissions } = await adminClient
    .from('submissions')
    .select('id, drive_view_link')
    .eq('clip_id', clipId)

  const submissionIds = submissions?.map(s => s.id) || []

  // 2. Delete finished_clips for this clip
  await adminClient
    .from('finished_clips')
    .delete()
    .eq('clip_id', clipId)

  // 3. Delete qa_reviews referencing these submissions
  if (submissionIds.length > 0) {
    await adminClient
      .from('qa_reviews')
      .delete()
      .in('submission_id', submissionIds)
  }

  // 4. Delete files from Google Drive (best-effort)
  if (submissions && submissions.length > 0) {
    for (const sub of submissions) {
      if (sub.drive_view_link) {
        try {
          await deleteFileFromDrive(sub.drive_view_link)
        } catch (e) {
          console.error('Drive cleanup error (non-fatal):', e)
        }
      }
    }
  }

  // 5. Delete files from Supabase Storage (best-effort, for legacy data)
  try {
    const { data: storageFiles } = await adminClient.storage
      .from('clip-submissions')
      .list(clipId)
    if (storageFiles && storageFiles.length > 0) {
      const filePaths = storageFiles.map(f => clipId + '/' + f.name)
      await adminClient.storage
        .from('clip-submissions')
        .remove(filePaths)
    }
  } catch (e) {
    // Storage cleanup is best-effort; don't fail the whole delete
    console.error('Storage cleanup error:', e)
  }

  // 6. Delete submissions for this clip
  await adminClient
    .from('submissions')
    .delete()
    .eq('clip_id', clipId)

  // 7. Delete the clip itself
  const { error: clipError } = await adminClient
    .from('clips')
    .delete()
    .eq('id', clipId)

  if (clipError) {
    return NextResponse.json({ error: clipError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
