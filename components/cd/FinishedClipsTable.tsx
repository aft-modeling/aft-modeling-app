'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, ExternalLink, Pencil, Trash2, Check, X, Plus, Tag } from 'lucide-react'

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

function parseTags(usedOn: string | null): string[] {
  if (!usedOn) return []
  return usedOn.split(',').map(t => t.trim()).filter(Boolean)
}

export default function FinishedClipsTable({ clips }: FinishedClipsTableProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  // Tag editing state
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null)
  const [editTags, setEditTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [savingTags, setSavingTags] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Fetch available tags on mount
  useEffect(() => {
    fetch('/api/finished-clips/get-tags')
      .then(res => res.json())
      .then(data => {
        if (data.tags) setAvailableTags(data.tags)
      })
      .catch(() => {})
  }, [])

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          tagInputRef.current && !tagInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredSuggestions = availableTags.filter(
    tag => tag.toLowerCase().includes(tagInput.toLowerCase()) &&
           !editTags.some(t => t.toLowerCase() === tag.toLowerCase())
  ).slice(0, 8)

  function startEditTags(fc: FinishedClipRow) {
    setEditingTagsId(fc.id)
    setEditTags(parseTags(fc.used_on))
    setTagInput('')
    setShowSuggestions(false)
    setTimeout(() => tagInputRef.current?.focus(), 50)
  }

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed) return
    if (editTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) return
    setEditTags([...editTags, trimmed])
    setTagInput('')
    setShowSuggestions(false)
    tagInputRef.current?.focus()
  }

  function removeTag(index: number) {
    setEditTags(editTags.filter((_, i) => i !== index))
  }

  async function saveTags() {
    setSavingTags(true)
    try {
      const usedOn = editTags.length > 0 ? editTags.join(', ') : ''
      const res = await fetch('/api/finished-clips/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finishedClipId: editingTagsId, usedOn }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert('Failed to save tags: ' + (data.error || 'Unknown error'))
      } else {
        // Add any new tags to available tags
        editTags.forEach(tag => {
          if (!availableTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
            setAvailableTags(prev => [...prev, tag].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())))
          }
        })
      }
    } catch {
      alert('Failed to save tags')
    } finally {
      setEditingTagsId(null)
      setSavingTags(false)
      router.refresh()
    }
  }

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
                ) : '\u2014'}
              </td>

              {/* Used On - Tag Editor */}
              <td className="px-4 py-3 min-w-[200px]">
                {editingTagsId === fc.id ? (
                  <div className="relative">
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {editTags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-0.5 bg-brand-100 text-brand-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          {tag}
                          <button onClick={() => removeTag(i)} className="hover:text-red-600 ml-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="relative">
                      <input
                        ref={tagInputRef}
                        type="text"
                        value={tagInput}
                        onChange={e => {
                          setTagInput(e.target.value)
                          setShowSuggestions(true)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (tagInput.trim()) addTag(tagInput)
                          }
                          if (e.key === 'Escape') {
                            setEditingTagsId(null)
                          }
                          if (e.key === 'Backspace' && !tagInput && editTags.length > 0) {
                            removeTag(editTags.length - 1)
                          }
                        }}
                        placeholder="Type tag name..."
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      {showSuggestions && (tagInput || filteredSuggestions.length > 0) && (
                        <div ref={suggestionsRef} className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-32 overflow-y-auto">
                          {filteredSuggestions.map(tag => (
                            <button
                              key={tag}
                              onClick={() => addTag(tag)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-brand-50 hover:text-brand-700 transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                          {tagInput.trim() && !filteredSuggestions.some(t => t.toLowerCase() === tagInput.trim().toLowerCase()) && (
                            <button
                              onClick={() => addTag(tagInput)}
                              className="w-full text-left px-3 py-1.5 text-xs text-brand-600 hover:bg-brand-50 font-medium flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Create \"{tagInput.trim()}\"
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <button
                        onClick={saveTags}
                        disabled={savingTags}
                        className="px-2 py-0.5 bg-brand-600 text-white text-xs rounded hover:bg-brand-700 disabled:opacity-50"
                      >
                        {savingTags ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingTagsId(null)}
                        className="px-2 py-0.5 text-gray-500 text-xs rounded hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => startEditTags(fc)}
                    className="cursor-pointer group min-h-[24px] flex flex-wrap gap-1 items-center"
                    title="Click to edit tags"
                  >
                    {parseTags(fc.used_on).length > 0 ? (
                      parseTags(fc.used_on).map((tag, i) => (
                        <span key={i} className="inline-flex items-center bg-brand-50 text-brand-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-300 text-xs group-hover:text-brand-500 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Add tags
                      </span>
                    )}
                  </div>
                )}
              </td>

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
