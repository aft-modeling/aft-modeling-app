import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

  const { finishedClipId, clipName, usedOn } = await request.json()
  if (!finishedClipId) {
    return NextResponse.json({ error: 'Missing finishedClipId' }, { status: 400 })
  }

  if (!clipName?.trim() && usedOn === undefined) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // Get the clip_id from the finished clip
  const { data: finishedClip, error: fetchError } = await supabase
    .from('finished_clips')
    .select('clip_id')
    .eq('id', finishedClipId)
    .single()

  if (fetchError || !finishedClip) {
    return NextResponse.json({ error: 'Finished clip not found' }, { status: 404 })
  }

  // Update the clip name if provided
  if (clipName?.trim()) {
    const { error: updateError } = await supabase
      .from('clips')
      .update({ name: clipName.trim(), updated_at: new Date().toISOString() })
      .eq('id', finishedClip.clip_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }
  }

  // Update used_on tags if provided
  if (usedOn !== undefined) {
    const { error: tagError } = await supabase
      .from('finished_clips')
      .update({ used_on: usedOn || null })
      .eq('id', finishedClipId)

    if (tagError) {
      return NextResponse.json({ error: tagError.message }, { status: 400 })
    }
  }

  return NextResponse.json({ success: true })
}
