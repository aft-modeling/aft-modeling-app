'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ExternalLink, CheckCircle, XCircle } from 'lucide-react'

interface QAReviewModalProps {
  submission: any
  reviewerId: string
  onClose: () => void
}

const CHECKS = [
  { key: 'is_4k_60fps',                label: '4K 60FPS',              desc: 'Video is exported in 4K resolution at 60 frames per second' },
  { key: 'is_appropriate_length',       label: 'Appropriate Length',    desc: 'Clip duration matches the expected format length' },
  { key: 'is_subtitle_style_correct',   label: 'Subtitle Style',        desc: 'Subtitles follow AFT Modeling style guidelines' },
  { key: 'is_overall_quality_good',     label: 'Overall Quality',       desc: 'General production quality meets standards' },
]

export default function QAReviewModal({ submission, reviewerId, onClose }: QAReviewModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [checks, setChecks] = useState<Record<string, boolean>>({
    is_4k_60fps: false,
    is_appropriate_length: false,
    is_subtitle_style_correct: false,
    is_overall_quality_good: false,
  })

  const allPassed = Object.values(checks).every(Boolean)

  async function handleDecision(decision: 'approved' | 'needs_revision') {
    if (decision === 'needs_revision' && !notes.trim()) {
      setError('Please provide revision notes so the editor knows what to fix.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/qa-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          clipId: submission.clip_id,
          editorId: submission.editor_id,
          reviewerId,
          ...checks,
          qa_notes: notes.trim() || null,
          decision,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Review failed')
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2>QA Review</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {submission.clip?.name} — {submission.editor?.full_name}
              {submission.round > 1 && <span className="ml-2 text-amber-600 font-medium">Revision #{submission.round}</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-2">
          {submission.drive_view_link && (
            <a href={submission.drive_view_link} target="_blank" rel="noopener noreferrer"
              className="btn-secondary text-xs py-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              View Clip in Drive
            </a>
          )}
          {submission.clip?.example_reel_url && (
            <a href={submission.clip.example_reel_url} target="_blank" rel="noopener noreferrer"
              className="btn-secondary text-xs py-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Example Reel
            </a>
          )}
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Quality Checklist</p>
          {CHECKS.map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  checked={checks[key]}
                  onChange={e => setChecks(c => ({ ...c, [key]: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              {checks[key]
                ? <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                : <XCircle className="w-4 h-4 text-gray-200 mt-0.5 shrink-0" />
              }
            </label>
          ))}
        </div>

        {/* Notes */}
        <div>
          <label className="label">
            QA Notes {!allPassed && <span className="text-red-500">*</span>}
          </label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder={allPassed ? "Optional notes for this clip..." : "Required: explain what needs to be fixed..."}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => handleDecision('needs_revision')}
            className="btn-danger flex-1 justify-center"
            disabled={loading}
          >
            <XCircle className="w-4 h-4" />
            {loading ? '...' : 'Needs Revision'}
          </button>
          <button
            onClick={() => handleDecision('approved')}
            className="btn-success flex-1 justify-center"
            disabled={loading}
          >
            <CheckCircle className="w-4 h-4" />
            {loading ? '...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}
