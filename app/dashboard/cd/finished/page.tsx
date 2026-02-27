import { createServerClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import { Trophy, ExternalLink } from 'lucide-react'

export default async function FinishedClipsPage() {
  const supabase = createServerClient()
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

      {!clips || clips.length === 0 ? (
        <div className="card p-16 text-center">
          <Trophy className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No finished clips yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Clip','Editor','Due Date','Finished At','Drive Link','Used On'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clips.map(fc => (
                <tr key={fc.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{fc.clip?.name}</td>
                  <td className="px-4 py-3 text-gray-600">{fc.editor?.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{fc.clip?.due_date}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(fc.finished_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {fc.drive_view_link ? (
                      <a href={fc.drive_view_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium">
                        <ExternalLink className="w-3 h-3" /> View
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fc.used_on || <span className="text-gray-300">Not set</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
