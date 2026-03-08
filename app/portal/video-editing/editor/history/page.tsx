import { createServerClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import { ExternalLink } from 'lucide-react'

export default async function EditorHistoryPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      clip:clips(name, due_date),
      qa_reviews(decision, qa_notes, reviewed_at)
    `)
    .eq('editor_id', session!.user.id)
    .order('submitted_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1>Submission History</h1>
        <p className="text-gray-500 text-sm mt-0.5">All your past clip submissions and their review outcomes</p>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Clip','Round','Status','QA Notes','Submitted','Drive Link'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(submissions || []).map(sub => (
              <tr key={sub.id} className="hover:bg-gray-50/50 align-top">
                <td className="px-4 py-3 font-medium text-gray-900">{sub.clip?.name}</td>
                <td className="px-4 py-3 text-gray-500">#{sub.round}</td>
                <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">
                  {sub.qa_reviews?.[0]?.qa_notes || <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(sub.submitted_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {sub.drive_view_link ? (
                    <a href={sub.drive_view_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium">
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
