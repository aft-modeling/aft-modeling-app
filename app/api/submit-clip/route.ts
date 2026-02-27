import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

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

      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const clipId = formData.get('clipId') as string
      const clipName = formData.get('clipName') as string
      const editorId = formData.get('editorId') as string
      const driveUsedContentLink = formData.get('driveUsedContentLink') as string

      if (!clipId) {
        return NextResponse.json({ error: 'Missing clip ID' }, { status: 400 })
      }

      const { data: editor } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', editorId)
        .single()

      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('clip_id', clipId)
      const round = (count || 0) + 1

      let fileUrl = null
      let storagePath = null

      if (file && file.size > 0) {
        const editorName = editor?.full_name || 'unknown'
        const safeName = editorName.replace(/[^a-zA-Z0-9]/g, '_')
        const safeClipName = (clipName || 'clip').replace(/[^a-zA-Z0-9]/g, '_')
        const ext = file.name.split('.').pop() || 'mp4'
        storagePath = safeName + '/' + safeClipName + '/round_' + round + '.' + ext

        const buffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadError } = await supabaseAdmin.storage
          .from('clip-submissions')
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: true,
          })

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          return NextResponse.json(
            { error: 'File upload failed: ' + uploadError.message },
            { status: 500 }
          )
        }

        const { data: urlData } = supabaseAdmin.storage
          .from('clip-submissions')
          .getPublicUrl(storagePath)
        fileUrl = urlData.publicUrl
      }

      const { error: subError } = await supabaseAdmin
        .from('submissions')
        .insert({
          clip_id: clipId,
          editor_id: editorId,
          round,
          drive_file_id: storagePath || null,
          drive_view_link: fileUrl || null,
          drive_used_content_link: driveUsedContentLink || null,
          status: 'pending_qa',
        })

      if (subError) {
        console.error('Submission insert error:', subError)
        return NextResponse.json(
          { error: 'Failed to create submission' },
          { status: 500 }
        )
      }

      await supabaseAdmin
        .from('clips')
        .update({ status: 'in_qa', updated_at: new Date().toISOString() })
        .eq('id', clipId)

      return NextResponse.json({ success: true, round, fileUrl })

    } catch (innerError: any) {
      console.error('submit-clip error:', innerError)
      return NextResponse.json(
        { error: innerError.message },
        { status: 500 }
      )
    }
  } catch (outerError: any) {
    console.error('submit-clip outer error:', outerError)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
