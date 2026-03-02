import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { deleteFileFromDrive, deleteFileFromDriveById } from '@/lib/google-drive'

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

  // 2. Delete from Google Drive — try multiple approaches for robustness
  const deletedFileIds = new Set<string>()

  // 2a. Try using the finished clip's drive_view_link
  if (finishedClip.drive_view_link) {
    try {
      console.log('[DRIVE DELETE] Trying finished clip drive_view_link:', finishedClip.drive_view_link)
      await deleteFileFromDrive(finishedClip.drive_view_link)
      // Track which file IDs we've already attempted
      const match = finishedClip.drive_view_link.match(/\/file\/d\/([^/]+)/)
      if (match) deletedFileIds.add(match[1])
    } catch (e) {
      console.error('[DRIVE DELETE] Error from drive_view_link (non-fatal):', e)
    }
  }

  // 2b. Also try using submissions' drive_file_id (the actual Drive file ID)
  if (finishedClip.clip_id) {
    try {
      const { data: submissions } = await adminClient
        .from('submissions')
        .select('drive_file_id, drive_view_link')
        .eq('clip_id', finishedClip.clip_id)

      if (submissions && submissions.length > 0) {
        for (const sub of submissions) {
          // Try the direct Drive file ID first (most reliable)
          if (sub.drive_file_id && !deletedFileIds.has(sub.drive_file_id)) {
            try {
              console.log('[DRIVE DELETE] Trying submission drive_file_id:', sub.drive_file_id)
              await deleteFileFromDriveById(sub.drive_file_id)
              deletedFileIds.add(sub.drive_file_id)
            } catch (e) {
              console.error('[DRIVE DELETE] Error from drive_file_id (non-fatal):', e)
            }
          }
          // Also try the submission's drive_view_link if different
          if (sub.drive_view_link) {
            const match = sub.drive_view_link.match(/\/file\/d\/([^/]+)/)
            const subFileId = match ? match[1] : null
            if (subFileId && !deletedFileIds.has(subFileId)) {
              try {
                console.log('[DRIVE DELETE] Trying submission drive_view_link:', sub.drive_view_link)
                await deleteFileFromDrive(sub.drive_view_link)
                deletedFileIds.add(subFileId)
              } catch (e) {
                console.error('[DRIVE DELETE] Error from submission drive_view_link (non-fatal):', e)
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('[DRIVE DELETE] Error querying submissions for Drive cleanup (non-fatal):', e)
    }
  }

  console.log('[DRIVE DELETE] Attempted deletion of file IDs:', Array.from(deletedFileIds))

  // 3. Delete finished_clips record
  await adminClient.from('finished_clips').delete().eq('id', finishedClipId)

  // 4. Delete qa_reviews for this submission
  if (finishedClip.submission_id) {
    await adminClient.from('qa_reviews').delete().eq('submission_id', finishedClip.submission_id)
  }

  // 5. Delete files from Supabase Storage (best-effort, for legacy data)
  if (finishedClip.clip_id) {
    try {
      const { data: storageFiles } = await adminClient.storage
        .from('clip-submissions')
        .list(finishedClip.clip_id)
      if (storageFiles && storageFiles.length > 0) {
        const filePaths = storageFiles.map(f => `${finishedClip.clip_id}/${f.name}`)
        await adminClient.storage.from('clip-submissions').remove(filePaths)
      }
    } catch (e) {
      console.error('Storage cleanup error (non-fatal):', e)
    }
  }

  // 6. Delete submissions for this clip
  await adminClient.from('submissions').delete().eq('clip_id', finishedClip.clip_id)

  // 7. Delete the clip itself
  const { error: clipError } = await adminClient.from('clips').delete().eq('id', finishedClip.clip_id)
  if (clipError) {
    return NextResponse.json({ error: clipError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
