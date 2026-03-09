import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function PortalAdminPage() {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const [clipsRes, profilesRes, submissionsRes, finishedRes] = await Promise.all([
    supabase
      .from('clips')
      .select('*, assigned_editor:profiles!clips_assigned_editor_id_fkey(id, full_name, email)')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('finished_clips')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  return (
    <AdminDashboard
      clips={clipsRes.data ?? []}
      profiles={profilesRes.data ?? []}
      submissions={submissionsRes.data ?? []}
      finishedClips={finishedRes.data ?? []}
      basePath="/portal/video-editing/admin"
    />
  )
}
