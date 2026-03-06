import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const TAG_COLORS = [
  'blue', 'green', 'purple', 'red', 'yellow', 'pink', 'indigo', 'orange', 'teal', 'cyan'
]

export async function POST(request: Request) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  // Only admin can create new tag options
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can create tags' }, { status: 403 })
  }

  const { name } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if tag already exists
  const { data: existing } = await adminClient
    .from('tag_options')
    .select('id')
    .eq('name', name.trim())
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Tag already exists' }, { status: 409 })
  }

  // Get count of existing tags to pick a color
  const { count } = await adminClient
    .from('tag_options')
    .select('*', { count: 'exact', head: true })

  const color = TAG_COLORS[(count || 0) % TAG_COLORS.length]

  const { data: tag, error } = await adminClient
    .from('tag_options')
    .insert({ name: name.trim(), color })
    .select('id, name, color')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ tag })
}
