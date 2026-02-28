'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import AddClipModal from '@/components/cd/AddClipModal'
import EditClipModal from '@/components/cd/EditClipModal'
import { Film, Plus, TrendingUp, Clock, CheckCircle, AlertCircle, Trophy, Pencil, Trash2 } from 'lucide-react'

interface CDDashboardProps {
  clips: any[]
  editors: any[]
  finishedClips: any[]
}

const COLUMNS = [
  { key: 'assigned', label: 'Assigned', color: 'border-blue-400' },
  { key: 'in_progress', label: 'In Progress', color: 'border-amber-400' },
  { key: 'in_qa', label: 'In QA', color: 'border-orange-400' },
  { key: 'needs_revision', label: 'Needs Revision', color: 'border-red-400' },
  { key: 'approved', label: 'Approved', color: 'border-emerald-400' },
]

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'finished' || status === 'approved') return false
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

export default function CDDashboard({ clips, editors, finishedClips }: CDDashboardProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingClip, setEditingClip] = useState<any>(null)
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDeleteClip(clipId: string, clipName: string) {
    if (!confirm(`Are you sure you want to delete "${clipName}"? This will remove all submissions, reviews, and files. This cannot be undone.`)) return
    setDeleting(clipId)
    try {
      const res = await fetch('/api/clips/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete clip')
      router.refresh()
    } catch (err: any) {
      alert('Delete failed: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  const [selectedEditor, setSelectedEditor] = useState('all')
  const filtered = selectedEditor === 'all' ? clips : clips.filter(c => c.assigned_editor_id === selectedEditor)

  const stats = {
    total: clips.length,
    inProgress: clips.filter(c => c.status === 'in_progress').length,
    inQA: clips.filter(c => c.status === 'in_qa' || c.status === 'submitted').length,
    needsRevision: clips.filter(c => c.status === 'needs_revision').length,
    finished: finishedClips.length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Pipeline Overview</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track all clips across your content workflow</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Clip
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Clips', value: stats.total, icon: Film, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'In QA', value: stats.inQA, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Revisions', value: stats.needsRevision,icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Finished', value: stats.finished, icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Filter by editor:</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setSelectedEditor('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedEditor === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {editors.map(e => (
            <button
              key={e.id}
              onClick={() => setSelectedEditor(e.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedEditor === e.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {e.full_name}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-4">
        {COLUMNS.map(col => {
          const colClips = col.key === 'in_qa'
            ? filtered.filter(c => c.status === 'in_qa' || c.status === 'submitted')
            : filtered.filter(c => c.status === col.key)
          return (
            <div key={col.key} className="space-y-2">
              <div className={`card px-3 py-2.5 border-t-2 ${col.color} flex items-center justify-between`}>
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{col.label}</span>
                <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{colClips.length}</span>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {colClips.map(clip => (
                  <div key={clip.id} className={`card p-3 space-y-2 hover:shadow-md transition-shadow ${isOverdue(clip.due_date, clip.status) ? 'ring-2 ring-red-300 bg-red-50/30' : ''}`}>
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-medium text-gray-900 leading-tight">{clip.name}
                        <button onClick={(e) => { e.stopPropagation(); setEditingClip(clip); }} className="ml-2 p-1 text-gray-400 hover:text-indigo-600 rounded" title="Edit clip"><Pencil size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClip(clip.id, clip.name); }} className="ml-1 p-1 text-gray-400 hover:text-red-600 rounded" title="Delete clip" disabled={deleting === clip.id}>
                          {deleting === clip.id ? (<span className="inline-block w-3.5 h-3.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />) : (<Trash2 size={14} />)}
                        </button>
                      </p>
                    </div>
                    {clip.assigned_editor && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 bg-brand-100 rounded-full flex items-center justify-center">
                          <span className="text-brand-700 text-[9px] font-bold">
                            {clip.assigned_editor.full_name?.[0]}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{clip.assigned_editor.full_name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isOverdue(clip.due_date, clip.status) ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                        {isOverdue(clip.due_date, clip.status) ? '\u26a0 Overdue: ' : 'Due: '}{clip.due_date}
                      </span>
                      {clip.example_reel_url && (
                        <a href={clip.example_reel_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                          Example \u2197
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {colClips.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-400">No clips</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showAddModal && (
        <AddClipModal editors={editors} onClose={() => setShowAddModal(false)} />
      )}
      {editingClip && (
        <EditClipModal clip={editingClip} editors={editors} onClose={() => setEditingClip(null)} />
      )}
    </div>
  )
}'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import AddClipModal from '@/components/cd/AddClipModal'
import EditClipModal from '@/components/cd/EditClipModal'
import { Film, Plus, TrendingUp, Clock, CheckCircle, AlertCircle, Trophy, Pencil, Trash2 } from 'lucide-react'

interface CDDashboardProps {
  clips: any[]
  editors: any[]
  finishedClips: any[]
}

const STATUSES = ['assigned','in_progress','submitted','in_qa','needs_revision','approved','finished']
const COLUMNS = [
  { key: 'assigned',        label: 'Assigned',       color: 'border-blue-400' },
  { key: 'in_progress',     label: 'In Progress',    color: 'border-amber-400' },
  { key: 'in_qa',           label: 'In QA',          color: 'border-orange-400' },
  { key: 'needs_revision',  label: 'Needs Revision', color: 'border-red-400' },
  { key: 'approved',        label: 'Approved',       color: 'border-emerald-400' },
]

export default function CDDashboard({ clips, editors, finishedClips }: CDDashboardProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingClip, setEditingClip] = useState<any>(null)
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDeleteClip(clipId: string, clipName: string) {
    if (!confirm(`Are you sure you want to delete "${clipName}"? This will remove all submissions, reviews, and files. This cannot be undone.`)) return
    setDeleting(clipId)
    try {
      const res = await fetch('/api/clips/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete clip')
      router.refresh()
    } catch (err: any) {
      alert('Delete failed: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }
  const [selectedEditor, setSelectedEditor] = useState('all')

  const filtered = selectedEditor === 'all'
    ? clips
    : clips.filter(c => c.assigned_editor_id === selectedEditor)

  const stats = {
    total: clips.length,
    inProgress: clips.filter(c => c.status === 'in_progress').length,
    inQA: clips.filter(c => c.status === 'in_qa' || c.status === 'submitted').length,
    needsRevision: clips.filter(c => c.status === 'needs_revision').length,
    finished: finishedClips.length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Pipeline Overview</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track all clips across your content workflow</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Clip
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Clips', value: stats.total,        icon: Film,        color: 'text-brand-600',   bg: 'bg-brand-50' },
          { label: 'In Progress', value: stats.inProgress,   icon: TrendingUp,  color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'In QA',       value: stats.inQA,         icon: Clock,       color: 'text-orange-600',  bg: 'bg-orange-50' },
          { label: 'Revisions',   value: stats.needsRevision,icon: AlertCircle, color: 'text-red-600',     bg: 'bg-red-50' },
          { label: 'Finished',    value: stats.finished,     icon: Trophy,      color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Filter by editor:</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setSelectedEditor('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedEditor === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {editors.map(e => (
            <button
              key={e.id}
              onClick={() => setSelectedEditor(e.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedEditor === e.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {e.full_name}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-4">
        {COLUMNS.map(col => {
          const colClips = filtered.filter(c => c.status === col.key)
          return (
            <div key={col.key} className="space-y-2">
              <div className={`card px-3 py-2.5 border-t-2 ${col.color} flex items-center justify-between`}>
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{col.label}</span>
                <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{colClips.length}</span>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {colClips.map(clip => (
                  <div key={clip.id} className="card p-3 space-y-2 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-medium text-gray-900 leading-tight">{clip.name}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingClip(clip); }}
                      className="ml-2 p-1 text-gray-400 hover:text-indigo-600 rounded"
                      title="Edit clip"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClip(clip.id, clip.name); }}
                      className="ml-1 p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Delete clip"
                      disabled={deleting === clip.id}
                    >
                      {deleting === clip.id ? (
                        <span className="inline-block w-3.5 h-3.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button></p>
                    </div>
                    {clip.assigned_editor && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 bg-brand-100 rounded-full flex items-center justify-center">
                          <span className="text-brand-700 text-[9px] font-bold">
                            {clip.assigned_editor.full_name?.[0]}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{clip.assigned_editor.full_name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Due: {clip.due_date}</span>
                      {clip.example_reel_url && (
                        <a href={clip.example_reel_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                          Example Ã¢ÂÂ
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {colClips.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-400">No clips</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showAddModal && (
        <AddClipModal editors={editors} onClose={() => setShowAddModal(false)} />
      )}

      {editingClip && (
        <EditClipModal
          clip={editingClip}
          editors={editors}
          onClose={() => setEditingClip(null)}
        />
      )}
    </div>
  )
}
