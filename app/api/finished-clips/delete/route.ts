import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { deleteFileFromDrive } from '@/lib/google-drive'

export async function POST(request: Request) {
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

  const { finishedClipId } = await request.json()
  if (!finishedClipId) {
    return NextResponse.json({ error: 'Missing finishedClipId' }, { status: 400 })
  }

  // Use service role client for cascading deletes
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Get the finished clip record
  const { data: finishedClip, error: fetchError } = await adminClient
    .from('finished_clips')
    .select('id, clip_id, submission_id, drive_view_link')
    .eq('id', finishedClipId)
    .single()

  if (fetchError || !finishedClip) {
    return NextResponse.json({ error: 'Finished clip not found' }, { status: 404 })
  }

  // 2. Delete from Google Drive (best-effort)
  if (finishedClip.drive_view_link) {
    try {
      await deleteFileFromDrive(finishedClip.drive_view_link)
    } catch (e) {
      console.error('Drive deletion error (non-fatal):', e)
    }
  }

  // 3. Delete finished_clips record
  await adminClient
    .from('finished_clips')
    .delete()
    .eq('id', finishedClipId)

  // 4. Delete qa_reviews for this submission
  if (finishedClip.submission_id) {
    await adminClient
      .from('qa_reviews')
      .delete()
      .eq('submission_id', finishedClip.submission_id)
  }

  // 5. Delete files from Supabase Storage (best-effort)
  if (finishedClip.clip_id) {
    try {
      const { data: storageFiles } = await adminClient.storage
        .from('clip-submissions')
        .list(finishedClip.clip_id)
      if (storageFiles && storageFiles.length > 0) {
        const filePaths = storageFiles.map(f => `${finishedClip.clip_id}/${f.name}`)
        await adminClient.storage
          .from('clip-submissions')
          .remove(filePaths)
      }
    } catch (e) {
      console.error('Storage cleanup error (non-fatal):', e)
    }
  }

  // 6. Delete submissions for this clip
  await adminClient
    .from('submissions')
    .delete()
    .eq('clip_id', finishedClip.clip_id)

  // 7. Delete the clip itself
  const { error: clipError } = await adminClient
    .from('clips')
    .delete()
    .eq('id', finishedClip.clip_id)

  if (clipError) {
    return NextResponse.json({ error: clipError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
