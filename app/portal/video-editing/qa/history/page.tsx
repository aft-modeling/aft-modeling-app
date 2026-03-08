import { createServerClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import { ExternalLink, CheckCircle, XCircle } from 'lucide-react'

export default async function QAHistoryPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: reviews } = await supabase
    .from('qa_reviews')
    .select(`
      *,
      submission:submissions(round, drive_view_link, clip:clips(name), editor:profiles!submissions_editor_id_fkey(full_name))
    `)
    .eq('reviewer_id', session!.user.id)
    .order('reviewed_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1>Review History</h1>
        <p className="text-gray-500 text-sm mt-0.5">All reviews you have completed</p>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Clip','Editor','Round','Decision','Notes','Reviewed','Link'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(reviews || []).map(r => (
              <tr key={r.id} className="hover:bg-gray-50/50 align-top">
                <td className="px-4 py-3 font-medium text-gray-900">{r.submission?.clip?.name}</td>
                <td className="px-4 py-3 text-gray-600">{r.submission?.editor?.full_name}</td>
                <td className="px-4 py-3 text-gray-500">#{r.submission?.round}</td>
                <td className="px-4 py-3">
                  {r.decision === 'approved' ? (
                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Approved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                      <XCircle className="w-3.5 h-3.5" /> Revision
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">{r.qa_notes || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.reviewed_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {r.submission?.drive_view_link ? (
                    <a href={r.submission.drive_view_link} target="_blank" rel="noopener noreferrer"
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
