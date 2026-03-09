import { createServerClient } from '@/lib/supabase/server'
import CDDashboard from '@/components/cd/CDDashboard'

export default async function CDPage() {
  const supabase = createServerClient()

  const [clipsRes, editorsRes, finishedRes] = await Promise.all([
    supabase
      .from('clips')
      .select(`*, assigned_editor:profiles!clips_assigned_editor_id_fkey(id, full_name, email)`)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('role', 'editor'),
    supabase
      .from('finished_clips')
      .select(`*, clip:clips(*), editor:profiles(*)`)
      .order('finished_at', { ascending: false })
      .limit(20),
  ])

  return (
    <CDDashboard
      clips={clipsRes.data || []}
      editors={editorsRes.data || []}
      finishedClips={finishedRes.data || []}
    />
  )
}
