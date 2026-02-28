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

      // Accept JSON body (file already uploaded directly to Supabase Storage from client)
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

      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('clip_id', clipId)
      const round = (count || 0) + 1

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
          { error: 'Failed to create submission: ' + subError.message },
          { status: 500 }
        )
      }

      // Update clip status
      await supabaseAdmin
        .from('clips')
        .update({ status: 'submitted' })
        .eq('id', clipId)

      return NextResponse.json({ success: true, round })

    } catch (innerError: any) {
      console.error('Submit clip inner error:', innerError)
      return NextResponse.json(
        { error: innerError.message || 'Internal error' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Submit clip error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
