import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { uploadFileToDrivePending } from '@/lib/google-drive'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const body = await req.json()
      const { clipId, clipName, editorId, driveUsedContentLink, storagePath, fileUrl } = body

      if (!clipId) {
        return NextResponse.json({ error: 'Missing clip ID' }, { status: 400 })
      }

      const { data: editor } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', editorId)
        .single()

      // Count existing submissions for round number
      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('clip_id', clipId)

      const round = (count || 0) + 1

      // Download file from Supabase Storage and upload to Google Drive Pending folder
      let driveFileId: string | null = null
      let driveViewLink: string | null = null

      if (storagePath) {
        try {
          const editorName = editor?.full_name || 'Unknown Editor'
          console.log('[DRIVE] Downloading from Supabase Storage:', storagePath)

          const { data: fileData, error: downloadError } = await supabaseAdmin.storage
            .from('clip-submissions')
            .download(storagePath)

          if (downloadError || !fileData) {
            console.error('[DRIVE] Supabase download error:', downloadError)
          } else {
            const buffer = Buffer.from(await fileData.arrayBuffer())

            // Build descriptive filename: "EditorName ClipName Month Dayth.ext"
            const ext = (storagePath.split('.').pop() || 'mp4').toLowerCase()
            const now = new Date()
            const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
            const day = now.getDate()
            const ordinal = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'
            const dateStr = months[now.getMonth()] + ' ' + day + ordinal
            const filename = (editorName + ' ' + (clipName || 'Clip') + ' ' + dateStr + '.' + ext).replace(/[/\\?%*:|"<>]/g, '')

            const mimeType = fileData.type || 'video/mp4'

            console.log('[DRIVE] Uploading to Google Drive Pending folder...')
            const driveResult = await uploadFileToDrivePending(buffer, filename, mimeType, editorName)
            driveFileId = driveResult.id
            driveViewLink = driveResult.webViewLink
            console.log('[DRIVE] Uploaded to Drive:', driveFileId, driveViewLink)

            // Delete from Supabase Storage (best-effort)
            try {
              await supabaseAdmin.storage
                .from('clip-submissions')
                .remove([storagePath])
              console.log('[DRIVE] Cleaned up Supabase Storage:', storagePath)
            } catch (cleanupErr) {
              console.error('[DRIVE] Supabase cleanup error (non-fatal):', cleanupErr)
            }
          }
        } catch (driveErr) {
          console.error('[DRIVE] Drive upload error (non-fatal, falling back to Supabase refs):', driveErr)
          // Fall back to Supabase references if Drive upload fails
          driveFileId = storagePath
          driveViewLink = fileUrl
        }
      }

      // Insert submission with Drive references (or Supabase fallback)
      const { error: subError } = await supabaseAdmin
        .from('submissions')
        .insert({
          clip_id: clipId,
          editor_id: editorId,
          round,
          drive_file_id: driveFileId || storagePath || null,
          drive_view_link: driveViewLink || fileUrl || null,
          drive_used_content_link: driveUsedContentLink || null,
          status: 'pending_qa',
        })

      if (subError) {
        console.error('Submission insert error:', subError)
        return NextResponse.json(
          { error: 'Failed to create submission: ' + subError.message },
          { status: 500 }
        )
      }

      // Update clip status
      const { error: clipUpdateError } = await supabaseAdmin
        .from('clips')
        .update({ status: 'submitted' })
        .eq('id', clipId)

      if (clipUpdateError) {
        console.error('Clip update error:', clipUpdateError)
      }

      // Notify all QA users about new submission
      console.log('[NOTIFY] Starting QA notification for clip:', clipId)

      const { data: qaUsers, error: qaError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'qa')

      console.log('[NOTIFY] QA users found:', JSON.stringify(qaUsers), 'error:', JSON.stringify(qaError))

      if (qaUsers && qaUsers.length > 0) {
        const editorName = editor?.full_name || 'An editor'
        const notifPayload = qaUsers.map((u) => ({
          user_id: u.id,
          message: `${editorName} submitted "${clipName || 'a clip'}" for QA review (Round ${round})`,
          type: 'submission_reviewed',
          clip_id: clipId,
        }))

        console.log('[NOTIFY] Inserting notifications:', JSON.stringify(notifPayload))

        const { data: notifData, error: notifError } = await supabaseAdmin
          .from('notifications')
          .insert(notifPayload)
          .select()

        if (notifError) {
          console.error('[NOTIFY] Insert error:', JSON.stringify(notifError))
        } else {
          console.log('[NOTIFY] Notifications inserted successfully:', JSON.stringify(notifData))
        }
      } else {
        console.log('[NOTIFY] No QA users found, skipping notification')
      }

      return NextResponse.json({ success: true, round })
    } catch (innerError) {
      console.error('Submit clip inner error:', innerError)
      return NextResponse.json(
        { error: innerError instanceof Error ? innerError.message : 'Internal error' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Submit clip error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}
