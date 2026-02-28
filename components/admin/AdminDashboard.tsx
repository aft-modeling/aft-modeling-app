'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Clip, Profile, Submission, FinishedClip, ClipStatus } from '@/lib/types'
import clsx from 'clsx'
import { Trash2, Film, Plus, TrendingUp, Clock, CheckCircle, AlertCircle, Trophy, Pencil } from 'lucide-react'
import AddClipModal from '@/components/cd/AddClipModal'
import EditClipModal from '@/components/cd/EditClipModal'

interface AdminDashboardProps {
  clips: Clip[]
  profiles: Profile[]
  submissions: Submission[]
  finishedClips: FinishedClip[]
}

const STATUS_COLUMNS: { status: ClipStatus; label: string; color: string }[] = [
  { status: 'assigned', label: 'Assigned', color: 'bg-blue-100 text-blue-800' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  { status: 'submitted', label: 'Submitted', color: 'bg-purple-100 text-purple-800' },
  { status: 'in_qa', label: 'In QA', color: 'bg-orange-100 text-orange-800' },
  { status: 'needs_revision', label: 'Needs Revision', color: 'bg-red-100 text-red-800' },
  { status: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
  { status: 'finished', label: 'Finished', color: 'bg-emerald-100 text-emerald-800' },
]

export default function AdminDashboard({ clips, profiles, submissions, finishedClips }: AdminDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'pipeline'

  const [showAddEditor, setShowAddEditor] = useState(false)
  const [newEditor, setNewEditor] = useState({ full_name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedEditor, setSelectedEditor] = useState<string>('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingClip, setEditingClip] = useState<any>(null)
  const [cdEditorFilter, setCdEditorFilter] = useState('all')

  const editors = profiles.filter(p => p.role === 'editor')

  function setTab(tab: string) {
    const url = tab === 'pipeline' ? '/dashboard/admin' : `/dashboard/admin?tab=${tab}`
    router.push(url)
  }

  async function handleCreateEditor(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/create-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEditor),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create editor')
      setNewEditor({ full_name: '', email: '', password: '' })
      setShowAddEditor(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveEditor(editorId: string) {
    if (!confirm('Are you sure you want to remove this editor? Their clips will be unassigned.')) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/remove-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editorId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove editor')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
        <p className="text-gray-500 mb-6">Manage the entire content workflow</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { id: 'pipeline', label: 'Pipeline Overview' },
            { id: 'editors', label: 'Editor Portals' },
            { id: 'manage', label: 'Manage Editors' },
              { id: 'cd', label: 'Creative Director' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                currentTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pipeline Overview Tab */}
        {currentTab === 'pipeline' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {STATUS_COLUMNS.map(col => {
                const colClips = col.status === 'finished'
                  ? finishedClips.map(fc => ({ ...fc, status: 'finished' as ClipStatus, assigned_editor: profiles.find(p => p.id === (clips.find(c => c.name === fc.clip_name)?.assigned_editor_id)) }))
                  : clips.filter(c => c.status === col.status)
                return (
                  <div key={col.status} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', col.color)}>
                        {col.label}
                      </span>
                      <span className="text-xs text-gray-500">{colClips.length}</span>
                    </div>
                    <div className="space-y-2">
                      {colClips.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">No clips</p>
                      )}
                      {colClips.map((clip: any) => (
                        <div key={clip.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{clip.name || clip.clip_name}</p>
                            <button
                              onClick={() => handleDeleteClip(clip.id, clip.name || clip.clip_name)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded flex-shrink-0"
                              title="Delete clip"
                              disabled={deleting === clip.id}
                            >
                              {deleting === clip.id ? (
                                <span className="inline-block w-3.5 h-3.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                          {clip.assigned_editor && (
                            <p className="text-xs text-gray-500 mt-1">
                              Editor: {clip.assigned_editor.full_name || clip.assigned_editor.email}
                            </p>
                          )}
                          {clip.due_date && (
                            <p className="text-xs text-gray-400 mt-1">Due: {new Date(clip.due_date).toLocaleDateString()}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Editor Portals Tab */}
        {currentTab === 'editors' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select an Editor</label>
              <select
                value={selectedEditor}
                onChange={e => setSelectedEditor(e.target.value)}
                className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">-- Choose Editor --</option>
                {editors.map(editor => (
                  <option key={editor.id} value={editor.id}>{editor.full_name} ({editor.email})</option>
                ))}
              </select>
            </div>

            {selectedEditor && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editors.find(e => e.id === selectedEditor)?.full_name}&apos;s Clips
                </h3>
                <div className="space-y-3">
                  {clips.filter(c => c.assigned_editor_id === selectedEditor).length === 0 && (
                    <p className="text-sm text-gray-500">No clips assigned to this editor.</p>
                  )}
                  {clips.filter(c => c.assigned_editor_id === selectedEditor).map(clip => (
                    <div key={clip.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{clip.name}</p>
                        <p className="text-xs text-gray-500">Due: {new Date(clip.due_date).toLocaleDateString()}</p>
                      </div>
                      <span className={clsx(
                        'px-2.5 py-1 rounded-full text-xs font-medium',
                        STATUS_COLUMNS.find(s => s.status === clip.status)?.color || 'bg-gray-100 text-gray-800'
                      )}>
                        {STATUS_COLUMNS.find(s => s.status === clip.status)?.label || clip.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manage Editors Tab */}
        {currentTab === 'manage' && (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Editor Accounts</h3>
              <button
                onClick={() => setShowAddEditor(true)}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                + Add New Editor
              </button>
            </div>

            {/* Add Editor Modal */}
            {showAddEditor && (
              <div className="bg-white rounded-xl border-2 border-brand-200 p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Create New Editor Account</h4>
                <form onSubmit={handleCreateEditor} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newEditor.full_name}
                      onChange={e => setNewEditor(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Editor Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={newEditor.email}
                      onChange={e => setNewEditor(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="editor@aftmodeling.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="text"
                      required
                      value={newEditor.password}
                      onChange={e => setNewEditor(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Initial password"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Editor'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddEditor(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Editors Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clips</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {editors.map(editor => (
                    <tr key={editor.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{editor.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{editor.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {clips.filter(c => c.assigned_editor_id === editor.id).length}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(editor.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemoveEditor(editor.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {editors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                        No editor accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Creative Director Tab */}
        {currentTab === 'cd' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pipeline Overview</h2>
                <p className="text-sm text-gray-500">Track all clips across your content workflow</p>
              </div>
              <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
                <Plus size={16} /> New Clip
              </button>
            </div>

            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'TOTAL CLIPS', value: clips.length, icon: Film, color: 'text-brand-600' },
                { label: 'IN PROGRESS', value: clips.filter(x => x.status === 'in_progress').length, icon: TrendingUp, color: 'text-amber-500' },
                { label: 'IN QA', value: clips.filter(x => x.status === 'in_qa' || x.status === 'submitted').length, icon: Clock, color: 'text-orange-500' },
                { label: 'REVISIONS', value: clips.filter(x => x.status === 'needs_revision').length, icon: AlertCircle, color: 'text-red-500' },
                { label: 'FINISHED', value: finishedClips.length, icon: Trophy, color: 'text-emerald-500' },
              ].map(stat => (
                <div key={stat.label} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</span>
                    <stat.icon size={16} className={stat.color} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Filter by editor:</span>
              <button onClick={() => setCdEditorFilter('all')} className={`px-3 py-1 text-sm rounded-full ${cdEditorFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
              {editors.map(e => (
                <button key={e.id} onClick={() => setCdEditorFilter(e.id)} className={`px-3 py-1 text-sm rounded-full ${cdEditorFilter === e.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{e.full_name}</button>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-4">
              {[
                { key: 'assigned', label: 'Assigned', color: 'border-blue-400' },
                { key: 'in_progress', label: 'In Progress', color: 'border-amber-400' },
                { key: 'in_qa', label: 'In QA', color: 'border-orange-400' },
                { key: 'needs_revision', label: 'Needs Revision', color: 'border-red-400' },
                { key: 'approved', label: 'Approved', color: 'border-emerald-400' },
              ].map(col => {
                const fClips = cdEditorFilter === 'all' ? clips : clips.filter(x => x.assigned_editor_id === cdEditorFilter)
                const colClips = col.key === 'in_qa' ? fClips.filter(x => x.status === 'in_qa' || x.status === 'submitted') : fClips.filter(x => x.status === col.key)
                return (
                  <div key={col.key} className="space-y-2">
                    <div className={`card px-3 py-2.5 border-t-2 ${col.color} flex items-center justify-between`}>
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{col.label}</span>
                      <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{colClips.length}</span>
                    </div>
                    <div className="space-y-2 min-h-[200px]">
                      {colClips.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No clips</p>}
                      {colClips.map((clip: any) => (
                        <div key={clip.id} className="card p-3 space-y-2 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-sm font-medium text-gray-900 leading-tight">{clip.name}
                            <button onClick={(e) => { e.stopPropagation(); setEditingClip(clip); }} className="ml-2 p-1 text-gray-400 hover:text-indigo-600 rounded" title="Edit clip"><Pencil size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteClip(clip.id, clip.name); }} className="ml-1 p-1 text-gray-400 hover:text-red-600 rounded" title="Delete clip" disabled={deleting === clip.id}>
                              {deleting === clip.id ? <span className="inline-block w-3.5 h-3.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={14} />}
                            </button></p>
                          </div>
                          {clip.assigned_editor && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 bg-brand-100 rounded-full flex items-center justify-center">
                                <span className="text-[10px] font-medium text-brand-700">{(clip.assigned_editor.full_name || clip.assigned_editor.email || '?')[0].toUpperCase()}</span>
                              </div>
                              <span className="text-xs text-gray-500">{clip.assigned_editor.full_name}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Due: {clip.due_date}</span>
                            {clip.example_reel_url && <a href={clip.example_reel_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">Example</a>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {showAddModal && <AddClipModal editors={editors} onClose={() => setShowAddModal(false)} />}
            {editingClip && <EditClipModal clip={editingClip} editors={editors} onClose={() => setEditingClip(null)} />}
          </div>
        )}
      </div>
    </div>
  )
}
