'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Clip, Profile, Submission, FinishedClip, ClipStatus } from '@/lib/types'
import clsx from 'clsx'

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
                          <p className="text-sm font-medium text-gray-900 truncate">{clip.name || clip.clip_name}</p>
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
      </div>
    </div>
  )
}
