'use client'
import { useState } from 'react'
import StatusBadge from '@/components/StatusBadge'
import SubmitClipModal from '@/components/editor/SubmitClipModal'
import { Film, Clock, AlertCircle, ExternalLink, MessageSquare } from 'lucide-react'

interface EditorDashboardProps {
  clips: any[]
  submissions: any[]
  editorId: string
}

export default function EditorDashboard({ clips, submissions, editorId }: EditorDashboardProps) {
  const [selectedClip, setSelectedClip] = useState<any>(null)

  const pending = clips.filter(c => c.status === 'assigned' || c.status === 'in_progress')
  const revisions = clips.filter(c => c.status === 'needs_revision')

  return (
    <div className="space-y-6">
      <div>
        <h1>My Assignments</h1>
        <p className="text-gray-500 text-sm mt-0.5">Clips assigned to you that need your attention</p>
      </div>

      {/* Revision Alert */}
      {revisions.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">
              {revisions.length} clip{revisions.length > 1 ? 's' : ''} need{revisions.length === 1 ? 's' : ''} revision
            </span>
          </div>
          <div className="space-y-2">
            {revisions.map(clip => {
              const latestSub = submissions.find(s => s.clip_id === clip.id)
              const latestReview = latestSub?.qa_reviews?.[0]
              return (
                <div key={clip.id} className="bg-white rounded-lg p-3 border border-red-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{clip.name}</p>
                      {latestReview?.qa_notes && (
                        <div className="mt-1.5 flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-gray-600">{latestReview.qa_notes}</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedClip(clip)}
                      className="btn-danger text-xs py-1.5 px-3 shrink-0"
                    >
                      Resubmit
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pending Clips */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base">To-Do</h2>
          <span className="badge bg-blue-50 text-blue-700">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <div className="card p-10 text-center">
            <Film className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No pending clips. Great work!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {pending.map(clip => (
              <div key={clip.id} className="card p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{clip.name}</p>
                    <StatusBadge status={clip.status} />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      Due: {clip.due_date}
                    </div>
                    {clip.example_reel_url && (
                      <a
                        href={clip.example_reel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Example Reel
                      </a>
                    )}
                  </div>
                  {clip.additional_notes && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                      📝 {clip.additional_notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedClip(clip)}
                  className="btn-primary shrink-0"
                >
                  Submit Clip
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Submissions */}
      {submissions.length > 0 && (
        <div>
          <h2 className="text-base mb-3">Recent Submissions</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clip</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Round</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Drive Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {submissions.slice(0,10).map(sub => (
                  <tr key={sub.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{sub.clip?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">#{sub.round}</td>
                    <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {sub.drive_view_link ? (
                        <a href={sub.drive_view_link} target="_blank" rel="noopener noreferrer"
                          className="text-brand-600 hover:text-brand-700 text-xs font-medium flex items-center gap-1">
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
      )}

      {selectedClip && (
        <SubmitClipModal
          clip={selectedClip}
          editorId={editorId}
          onClose={() => setSelectedClip(null)}
        />
      )}
    </div>
  )
}
