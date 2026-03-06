import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
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

  // Fetch all used_on values from finished_clips
  const { data: clips, error } = await supabase
    .from('finished_clips')
    .select('used_on')
    .not('used_on', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Parse comma-separated tags, deduplicate, and sort
  const tagSet = new Set<string>()
  clips?.forEach(clip => {
    if (clip.used_on) {
      clip.used_on.split(',').forEach((tag: string) => {
        const trimmed = tag.trim()
        if (trimmed) tagSet.add(trimmed)
      })
    }
  })

  const tags = Array.from(tagSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))

  return NextResponse.json({ tags })
}
