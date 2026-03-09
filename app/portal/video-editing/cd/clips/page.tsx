import { createServerClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import { ExternalLink } from 'lucide-react'

export default async function CDClipsPage() {
  const supabase = createServerClient()
  const { data: clips } = await supabase
    .from('clips')
    .select(`
      *,
      assigned_editor:profiles!clips_assigned_editor_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1>All Clips</h1>
        <p className="text-gray-500 text-sm mt-0.5">Complete list of every clip in the system</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Name','Editor','Due Date','Status','Example Reel','Created'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(clips || []).map(clip => (
              <tr key={clip.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{clip.name}</td>
                <td className="px-4 py-3 text-gray-600">{clip.assigned_editor?.full_name || <span className="text-gray-300">Unassigned</span>}</td>
                <td className="px-4 py-3 text-gray-500">{clip.due_date}</td>
                <td className="px-4 py-3"><StatusBadge status={clip.status} /></td>
                <td className="px-4 py-3">
                  {clip.example_reel_url ? (
                    <a href={clip.example_reel_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium">
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(clip.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
