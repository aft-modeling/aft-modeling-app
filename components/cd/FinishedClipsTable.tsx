'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, ExternalLink, Pencil, Trash2, Check, X } from 'lucide-react'

interface FinishedClipRow {
  id: string
  clip_id: string
  drive_view_link: string
  used_on: string | null
  finished_at: string
  clip?: { name: string; example_reel_url: string; due_date: string } | null
  editor?: { full_name: string } | null
}

interface FinishedClipsTableProps {
  clips: FinishedClipRow[]
}

export default function FinishedClipsTable({ clips }: FinishedClipsTableProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  async function handleRename(fc: FinishedClipRow) {
    if (!editName.trim() || editName.trim() === fc.clip?.name) {
      setEditingId(null)
      return
    }
    setLoading(fc.id)
    try {
      const res = await fetch('/api/finished-clips/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finishedClipId: fc.id, clipName: editName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert('Failed to rename: ' + (data.error || 'Unknown error'))
      }
    } catch {
      alert('Failed to rename clip')
    } finally {
      setEditingId(null)
      setLoading(null)
      router.refresh()
    }
  }

  async function handleDelete(fc: FinishedClipRow) {
    const clipName = fc.clip?.name || 'this clip'
    if (!confirm(`Delete "${clipName}"?\n\nThis will permanently remove the clip from the website and Google Drive.`)) {
      return
    }
    setLoading(fc.id)
    try {
      const res = await fetch('/api/finished-clips/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finishedClipId: fc.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert('Failed to delete: ' + (data.error || 'Unknown error'))
      }
    } catch {
      alert('Failed to delete clip')
    } finally {
      setLoading(null)
      router.refresh()
    }
  }

  if (!clips || clips.length === 0) {
    return (
      <div className="card p-16 text-center">
        <Trophy className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-500">No finished clips yet.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {['Clip', 'Editor', 'Due Date', 'Finished At', 'Drive Link', 'Used On', 'Actions'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {clips.map(fc => (
            <tr key={fc.id} className="hover:bg-gray-50/50">
              <td className="px-4 py-3 font-medium text-gray-900">
                {editingId === fc.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(fc)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="border border-gray-300 rounded px-2 py-1 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(fc)}
                      className="p-1 text-emerald-600 hover:text-emerald-700"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  fc.clip?.name
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">{fc.editor?.full_name}</td>
              <td className="px-4 py-3 text-gray-500">{fc.clip?.due_date}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{new Date(fc.finished_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                {fc.drive_view_link ? (
                  <a href={fc.drive_view_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium">
                    <ExternalLink className="w-3 h-3" /> View
                  </a>
                ) : 'â'}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">{fc.used_on || <span className="text-gray-300">Not set</span>}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingId(fc.id)
                      setEditName(fc.clip?.name || '')
                    }}
                    disabled={loading === fc.id}
                    className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50"
                    title="Rename clip"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(fc)}
                    disabled={loading === fc.id}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Delete clip"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {loading === fc.id && (
                    <span className="text-xs text-gray-400 ml-1">...</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
