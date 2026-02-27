import { createServerClient } from '@/lib/supabase/server'
import EditorDashboard from '@/components/editor/EditorDashboard'

export default async function EditorPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  const [clipsRes, submissionsRes] = await Promise.all([
    supabase
      .from('clips')
      .select('*')
      .eq('assigned_editor_id', session!.user.id)
      .in('status', ['assigned', 'in_progress', 'needs_revision'])
      .order('due_date', { ascending: true }),
    supabase
      .from('submissions')
      .select(`*, qa_reviews(*), clip:clips(*)`)
      .eq('editor_id', session!.user.id)
      .order('submitted_at', { ascending: false })
      .limit(30),
  ])

  return (
    <EditorDashboard
      clips={clipsRes.data || []}
      submissions={submissionsRes.data || []}
      editorId={session!.user.id}
    />
  )
}
