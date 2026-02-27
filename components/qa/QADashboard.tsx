'use client'
import { useState } from 'react'
import StatusBadge from '@/components/StatusBadge'
import QAReviewModal from '@/components/qa/QAReviewModal'
import { CheckSquare, Clock, ExternalLink, User } from 'lucide-react'

interface QADashboardProps {
  submissions: any[]
  reviewerId: string
}

export default function QADashboard({ submissions, reviewerId }: QADashboardProps) {
  const [selectedSub, setSelectedSub] = useState<any>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Review Queue</h1>
          <p className="text-gray-500 text-sm mt-0.5">Clips submitted by editors awaiting QA review</p>
        </div>
        <div className="card px-4 py-2 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-semibold text-gray-700">{submissions.length} pending</span>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="card p-16 text-center">
          <CheckSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">All caught up!</p>
          <p className="text-gray-400 text-sm mt-1">No clips pending review right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => (
            <div key={sub.id} className="card p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{sub.clip?.name}</p>
                    <StatusBadge status="pending_qa" />
                    {sub.round > 1 && (
                      <span className="badge bg-amber-50 text-amber-700">Revision #{sub.round}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <User className="w-3.5 h-3.5" />
                      {sub.editor?.full_name}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      Due: {sub.clip?.due_date}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      Submitted: {new Date(sub.submitted_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {sub.drive_view_link && (
                      <a href={sub.drive_view_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Finished Clip
                      </a>
                    )}
                    {sub.clip?.example_reel_url && (
                      <a href={sub.clip.example_reel_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Example Reel
                      </a>
                    )}
                    {sub.drive_used_content_link && (
                      <a href={sub.drive_used_content_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Used Content
                      </a>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSub(sub)}
                  className="btn-primary shrink-0"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSub && (
        <QAReviewModal
          submission={selectedSub}
          reviewerId={reviewerId}
          onClose={() => setSelectedSub(null)}
        />
      )}
    </div>
  )
}
