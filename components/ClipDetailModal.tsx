'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/StatusBadge'
import { X, Clock, CheckCircle, XCircle, ExternalLink, Film, FileText, AlertTriangle } from 'lucide-react'

interface ClipDetailModalProps {
  clipId: string
  onClose: () => void
}

export default function ClipDetailModal({ clipId, onClose }: ClipDetailModalProps) {
  const [clip, setClip] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchDetails() {
      const [clipRes, subsRes] = await Promise.all([
        supabase
          .from('clips')
          .select('*, assigned_editor:profiles!clips_assigned_editor_id_fkey(id, full_name, email)')
          .eq('id', clipId)
          .single(),
        supabase
          .from('submissions')
          .select('*, editor:profiles!submissions_editor_id_fkey(full_name), qa_reviews(*)')
          .eq('clip_id', clipId)
          .order('round', { ascending: true }),
      ])
      if (clipRes.data) setClip(clipRes.data)
      if (subsRes.data) setSubmissions(subsRes.data)
      setLoading(false)
    }
    fetchDetails()
  }, [clipId])

  function isOverdue(dueDate: string | null, status: string): boolean {
    if (!dueDate || status === 'finished' || status === 'approved') return false
    const due = new Date(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)
    return due < today
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Clip Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6" style={{ maxHeight: 'calc(85vh - 64px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
            </div>
          ) : clip ? (
            <>
              {/* Clip Info */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{clip.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Assigned to {clip.assigned_editor?.full_name || 'Unassigned'}
                    </p>
                  </div>
                  <StatusBadge status={clip.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="text-gray-500">Due Date</span>
                    <p className={`font-medium ${isOverdue(clip.due_date, clip.status) ? 'text-red-600' : 'text-gray-900'}`}>
                      {clip.due_date ? new Date(clip.due_date).toLocaleDateString() : 'No date'}
                      {isOverdue(clip.due_date, clip.status) && ' (Overdue)'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="text-gray-500">Created</span>
                    <p className="font-medium text-gray-900">{new Date(clip.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-2">
                  {clip.example_reel_url && (
                    <a href={clip.example_reel_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-100">
                      <Film className="w-4 h-4" /> Example Reel <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {clip.additional_notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-800">Notes</p>
                    <p className="text-sm text-amber-700 mt-1">{clip.additional_notes}</p>
                  </div>
                )}
              </div>

              {/* Submission Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                  Submission History ({submissions.length} round{submissions.length !== 1 ? 's' : ''})
                </h4>
                {submissions.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No submissions yet</p>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((sub) => {
                      const review = sub.qa_reviews?.[0]
                      return (
                        <div key={sub.id} className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-700">Round #{sub.round}</span>
                              <span className="text-xs text-gray-400">
                                {new Date(sub.submitted_at).toLocaleString()}
                              </span>
                            </div>
                            {sub.drive_view_link && (
                              <a href={sub.drive_view_link} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                                View Clip <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          {review ? (
                            <div className={`px-4 py-3 ${review.decision === 'approved' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                {review.decision === 'approved' ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <span className={`text-sm font-medium ${review.decision === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {review.decision === 'approved' ? 'Approved' : 'Needs Revision'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(review.reviewed_at).toLocaleString()}
                                </span>
                              </div>
                              {review.notes && (
                                <p className="text-sm text-gray-700 mt-1 pl-6">{review.notes}</p>
                              )}
                              {review.decision === 'approved' && (
                                <div className="mt-2 pl-6 flex flex-wrap gap-2 text-xs">
                                  {review.check_4k && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">4K 60FPS</span>}
                                  {review.check_length && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Good Length</span>}
                                  {review.check_subtitles && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Subtitles OK</span>}
                                  {review.check_quality && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Quality OK</span>}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="px-4 py-3 bg-amber-50">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <span className="text-sm text-amber-700">Pending QA Review</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-400 py-8">Clip not found</p>
          )}
        </div>
      </div>
    </div>
  )
}
