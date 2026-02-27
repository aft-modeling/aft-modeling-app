import { createServerClient } from '@/lib/supabase/server'
import QADashboard from '@/components/qa/QADashboard'

export default async function QAPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  const submissionsRes = await supabase
    .from('submissions')
    .select(`
      *,
      clip:clips(*),
      editor:profiles!submissions_editor_id_fkey(id, full_name),
      qa_reviews(*)
    `)
    .eq('status', 'pending_qa')
    .order('submitted_at', { ascending: true })

  return (
    <QADashboard
      submissions={submissionsRes.data || []}
      reviewerId={session!.user.id}
    />
  )
}
