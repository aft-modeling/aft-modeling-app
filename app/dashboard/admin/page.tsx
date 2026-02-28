import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: clips } = await supabase
    .from('clips')
    .select('*, assigned_editor:profiles(id, full_name, email)')
    .order('created_at', { ascending: false })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .order('created_at', { ascending: false })

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: finishedClips } = await supabase
    .from('finished_clips')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <AdminDashboard
      clips={clips ?? []}
      profiles={profiles ?? []}
      submissions={submissions ?? []}
      finishedClips={finishedClips ?? []}
    />
  )
}
