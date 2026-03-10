import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
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

  const { userId, email, password, full_name } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Build the auth update payload (only include fields that were provided)
    const authUpdate: Record<string, any> = {}
    if (email) authUpdate.email = email
    if (password) authUpdate.password = password

    // Update auth user if email or password changed
    if (Object.keys(authUpdate).length > 0) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(userId, authUpdate)
      if (authError) throw new Error(authError.message)
    }

    // Build the profile update payload
    const profileUpdate: Record<string, any> = {}
    if (email) profileUpdate.email = email
    if (full_name) profileUpdate.full_name = full_name

    // Update profile if name or email changed
    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await adminClient
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId)
      if (profileError) throw new Error(profileError.message)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
