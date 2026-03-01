import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FinishedClipsTable from '@/components/cd/FinishedClipsTable'

export default async function AdminFinishedClipsPage() {
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
    .from('finished_clips')
    .select(`
      *,
      clip:clips(name, example_reel_url, due_date),
      editor:profiles!finished_clips_editor_id_fkey(full_name)
    `)
    .order('finished_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1>Finished Clips</h1>
          <p className="text-gray-500 text-sm mt-0.5">All QA-approved clips ready to be published</p>
        </div>
        <span className="badge bg-emerald-50 text-emerald-700 text-sm px-3 py-1">
          {clips?.length || 0} total
        </span>
      </div>

      <FinishedClipsTable clips={clips ?? []} />
    </div>
  )
}
