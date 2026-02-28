'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import StatusBadge from '@/components/StatusBadge'
import SubmitClipModal from '@/components/editor/SubmitClipModal'
import ClipDetailModal from '@/components/ClipDetailModal'
import { Film, Clock, AlertCircle, ExternalLink, MessageSquare, Play, AlertTriangle, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react'

interface EditorDashboardProps {
  clips: any[]
  submissions: any[]
  editorId: string
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'finished' || status === 'approved') return false
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}
export default function EditorDashboard({ clips, submissions, editorId }: EditorDashboardProps) {
  const [selectedClip, setSelectedClip] = useState<any>(null)
  const [detailClip, setDetailClip] = useState<any>(null)
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set())
  const supabase = createClient()
  const router = useRouter()

  const toggleHistory = (clipId: string) => {
    setExpandedHistory(prev => {
      const next = new Set(prev)
      if (next.has(clipId)) next.delete(clipId)
      else next.add(clipId)
      return next
    })
  }

  const getClipSubmissions = (clipId: string) => {
    return submissions.filter(s => s.clip_id === clipId).sort((a: any, b: any) => b.round - a.round)
  }

  const startWorking = async (clipId: string) => {
    const { error } = await supabase
      .from('clips')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', clipId)
    if (!error) router.refresh()
  }

  const pending = clips.filter(c => c.status === 'assigned' || c.status === 'in_progress')
  const revisions = clips.filter(c => c.status === 'needs_revision')
  return (
    <div className="space-y-6">

      {/* Needs Revision Section */}
      {revisions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">
              {revisions.length} clip{revisions.length === 1 ? '' : 's'} need{revisions.length === 1 ? 's' : ''} revision
            </span>
          </div>
          <div className="space-y-2">
            {revisions.map((clip: any) => {
              const latestSub = submissions.find((s: any) => s.clip_id === clip.id)
              const latestReview = latestSub?.qa_reviews?.[0]
              const clipSubs = getClipSubmissions(clip.id)
              const isExpanded = expandedHistory.has(clip.id)
              return (
                <div key={clip.id} className="bg-white rounded-lg p-3 border border-red-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 cursor-pointer hover:text-brand-600" onClick={() => setDetailClip(clip)}>{clip.name}</p>
                      {latestReview?.qa_notes && (
                        <div className="mt-1.5 flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-gray-600">{latestReview.qa_notes}</p>
                        </div>
                      )}
                      {clipSubs.length > 0 && (
                        <button onClick={() => toggleHistory(clip.id)} className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? 'Hide' : 'Show'} QA History ({clipSubs.length} round{clipSubs.length === 1 ? '' : 's'})
                        </button>
                      )}
                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-gray-100">
                          {clipSubs.map((sub: any) => {
                            const review = sub.qa_reviews?.[0]
                            return (
                              <div key={sub.id} className="text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-gray-700">Round #{sub.round}</span>
                                  {review ? (review.status === 'approved' ? (
                                    <span className="flex items-center gap-0.5 text-green-600"><CheckCircle className="w-3 h-3" /> Approved</span>
                                  ) : (
                                    <span className="flex items-center gap-0.5 text-red-600"><XCircle className="w-3 h-3" /> Denied</span>
                                  )) : <span className="text-amber-500">Pending QA</span>}
                                </div>
                                {review?.qa_notes && <p className="text-gray-500 mt-0.5 ml-4">{review.qa_notes}</p>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setSelectedClip(clip)} className="btn-danger text-xs py-1.5 px-3 shrink-0">
                      Resubmit
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {/* Active Clips */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Film className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-semibold text-gray-700">
            {pending.length} active clip{pending.length === 1 ? '' : 's'}
          </span>
        </div>
        {pending.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No clips assigned yet</div>
        ) : (
          <div className="space-y-2">
            {pending.map((clip: any) => {
              const clipSubs = getClipSubmissions(clip.id)
              const isExpanded = expandedHistory.has(clip.id)
              return (
                <div key={clip.id} className="card p-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-brand-600" onClick={() => setDetailClip(clip)}>{clip.name}</p>
                    <StatusBadge status={clip.status} />
                    {isOverdue(clip.due_date, clip.status) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" /> Overdue
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1 text-xs ${isOverdue(clip.due_date, clip.status) ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      <Clock className="w-3.5 h-3.5" />
                      Due: {clip.due_date}
                    </div>
                    {clip.example_reel_url && (
                      <a href={clip.example_reel_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                        <ExternalLink className="w-3.5 h-3.5" /> Example Reel
                      </a>
                    )}
                  </div>                  {clip.additional_notes && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                      📝 {clip.additional_notes}
                    </p>
                  )}

                  {clipSubs.length > 0 && (
                    <div>
                      <button onClick={() => toggleHistory(clip.id)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isExpanded ? 'Hide' : 'Show'} QA History ({clipSubs.length} round{clipSubs.length === 1 ? '' : 's'})
                      </button>
                      {isExpanded && (
                        <div className="mt-1.5 space-y-1.5 pl-2 border-l-2 border-gray-100">
                          {clipSubs.map((sub: any) => {
                            const review = sub.qa_reviews?.[0]
                            return (
                              <div key={sub.id} className="text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-gray-700">Round #{sub.round}</span>
                                  {review ? (review.status === 'approved' ? (
                                    <span className="flex items-center gap-0.5 text-green-600"><CheckCircle className="w-3 h-3" /> Approved</span>
                                  ) : (
                                    <span className="flex items-center gap-0.5 text-red-600"><XCircle className="w-3 h-3" /> Denied</span>
                                  )) : <span className="text-amber-500">Pending QA</span>}
                                </div>
                                {review?.qa_notes && <p className="text-gray-500 mt-0.5 ml-4">{review.qa_notes}</p>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {clip.status === 'assigned' && (
                    <button onClick={() => startWorking(clip.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-100 transition-colors">
                      <Play size={12} /> Start Working
                    </button>
                  )}
                  {clip.status === 'in_progress' && (
                    <button onClick={() => setSelectedClip(clip)} className="btn-primary text-xs py-1.5 px-3">
                      Submit for QA
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {/* Recent Submissions */}
      {submissions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Submissions</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-100">
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
                {submissions.slice(0,10).map((sub: any) => (
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

      {detailClip && (
        <ClipDetailModal
          clipId={detailClip.id}
          onClose={() => setDetailClip(null)}
        />
      )}
    </div>
  )
}
