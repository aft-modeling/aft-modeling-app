import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { uploadFileToDrive } from '@/lib/google-drive'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const clipId = formData.get('clipId') as string
    const clipName = formData.get('clipName') as string
    const editorId = formData.get('editorId') as string
    const driveUsedContentLink = formData.get('driveUsedContentLink') as string

    if (!file || !clipId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    // Get editor name for Drive folder
    const { data: editor } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', editorId)
      .single()

    // Determine round number (count existing submissions for this clip)
    const { count } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('clip_id', clipId)

    const round = (count || 0) + 1

    // Upload file to Google Drive
    const buffer = Buffer.from(await file.arrayBuffer())
    const { id: driveFileId, webViewLink } = await uploadFileToDrive(
      buffer,
      `${clipName}_Round${round}_${file.name}`,
      file.type || 'video/mp4',
      editor?.full_name || 'Unknown',
      clipName
    )

    // Create submission record
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .insert({
        clip_id: clipId,
        editor_id: editorId,
        round,
        drive_file_id: driveFileId,
        drive_view_link: webViewLink,
        drive_used_content_link: driveUsedContentLink || null,
        status: 'pending_qa',
      })
      .select()
      .single()

    if (subError) throw new Error(subError.message)

    // Update clip status to 'submitted'
    await supabase
      .from('clips')
      .update({ status: 'in_qa', updated_at: new Date().toISOString() })
      .eq('id', clipId)

    return NextResponse.json({ success: true, submission })
  } catch (err: any) {
    console.error('submit-clip error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
