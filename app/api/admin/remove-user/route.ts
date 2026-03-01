import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Verify the requester is an admin
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, role } = await request.json()

  if (!userId || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Use service role client
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Role-specific cleanup before deletion
  if (role === 'editor') {
    // Unassign any clips belonging to this editor
    await adminClient
      .from('clips')
      .update({ assigned_editor_id: null, status: 'assigned' })
      .eq('assigned_editor_id', userId)
  }
  // For creative_director and qa: no cleanup needed
  // CD's created clips remain in the system
  // QA's reviews remain with original reviewer_id preserved

  // Delete the profile
  const { error: profileError } = await adminClient
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  // Delete the auth user
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
