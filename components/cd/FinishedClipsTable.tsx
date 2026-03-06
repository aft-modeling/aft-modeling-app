'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, ExternalLink, Pencil, Trash2, Check, X, Plus, Tag, ChevronDown } from 'lucide-react'

interface TagOption {
  id: string
  name: string
  color: string
}

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

const TAG_COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  green:  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400' },
  yellow: { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-700',   dot: 'bg-pink-400' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   dot: 'bg-teal-400' },
  cyan:   { bg: 'bg-cyan-50',   text: 'text-cyan-700',   dot: 'bg-cyan-400' },
}

function getTagColors(color: string) {
  return TAG_COLOR_MAP[color] || TAG_COLOR_MAP.blue
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
  const [tagOptions, setTagOptions] = useState<TagOption[]>([])
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)
  const [savingTags, setSavingTags] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/finished-clips/get-tags')
      .then(res => res.json())
      .then(data => { if (data.tags) setTagOptions(data.tags) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (editingTagsId) saveTags(editingTagsId, selectedTags)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingTagsId, selectedTags])

  function openTagDropdown(fc: FinishedClipRow) {
    setEditingTagsId(fc.id)
    setSelectedTags(parseTags(fc.used_on))
    setTagSearch('')
    setNewTagName('')
  }

  function toggleTag(tagName: string) {
    setSelectedTags(prev =>
      prev.some(t => t.toLowerCase() === tagName.toLowerCase())
        ? prev.filter(t => t.toLowerCase() !== tagName.toLowerCase())
        : [...prev, tagName]
    )
  }

  async function saveTags(clipId: string, tags: string[]) {
    setSavingTags(true)
    try {
      const usedOn = tags.length > 0 ? tags.join(', ') : ''
      await fetch('/api/finished-clips/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finishedClipId: clipId, usedOn }),
      })
    } catch { /* silent */ }
    finally { setEditingTagsId(null); setSavingTags(false); router.refresh() }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return
    setCreatingTag(true)
    try {
      const res = await fetch('/api/finished-clips/create-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.tag) {
        setTagOptions(prev => [...prev, data.tag].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())))
        setSelectedTags(prev => [...prev, data.tag.name])
        setNewTagName('')
      } else if (res.status === 403) {
        alert('Only admins can create new tags')
      } else if (res.status === 409) {
        setSelectedTags(prev => {
          if (prev.some(t => t.toLowerCase() === newTagName.trim().toLowerCase())) return prev
          return [...prev, newTagName.trim()]
        })
        setNewTagName('')
      } else { alert(data.error || 'Failed to create tag') }
    } catch { alert('Failed to create tag') }
    finally { setCreatingTag(false) }
  }

  function getTagOption(tagName: string): TagOption | undefined {
    return tagOptions.find(t => t.name.toLowerCase() === tagName.toLowerCase())
  }

  const filteredOptions = tagOptions.filter(opt => opt.name.toLowerCase().includes(tagSearch.toLowerCase()))

  async function handleRename(fc: FinishedClipRow) {
    if (!editName.trim() || editName.trim() === fc.clip?.name) { setEditingId(null); return }
    setLoading(fc.id)
    try {
      const res = await fetch('/api/finished-clips/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finishedClipId: fc.id, clipName: editName.trim() }),
      })
      if (!res.ok) { const data = await res.json(); alert('Failed to rename: ' + (data.error || 'Unknown error')) }
    } catch { alert('Failed to rename clip') }
    finally { setEditingId(null); setLoading(null); router.refresh() }
  }

  async function handleDelete(fc: FinishedClipRow) {
    const clipName = fc.clip?.name || 'this clip'
    if (!confirm('Delete "' + clipName + '"?\n\nThis will permanently remove the clip from the website and Google Drive.')) return
    setLoading(fc.id)
    try {
      const res = await fetch('/api/finished-clips/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finishedClipId: fc.id }),
      })
      if (!res.ok) { const data = await res.json(); alert('Failed to delete: ' + (data.error || 'Unknown error')) }
    } catch { alert('Failed to delete clip') }
    finally { setLoading(null); router.refresh() }
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
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(fc); if (e.key === 'Escape') setEditingId(null) }}
                      className="border border-gray-300 rounded px-2 py-1 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-brand-500" autoFocus />
                    <button onClick={() => handleRename(fc)} className="p-1 text-emerald-600 hover:text-emerald-700" title="Save"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600" title="Cancel"><X className="w-4 h-4" /></button>
                  </div>
                ) : fc.clip?.name}
              </td>
              <td className="px-4 py-3 text-gray-600">{fc.editor?.full_name}</td>
              <td className="px-4 py-3 text-gray-500">{fc.clip?.due_date}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{new Date(fc.finished_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                {fc.drive_view_link ? (
                  <a href={fc.drive_view_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium">
                    <ExternalLink className="w-3 h-3" /> View
                  </a>
                ) : '\u2014'}
              </td>
              {/* Used On - Airtable-style Multi-Select */}
              <td className="px-4 py-3 min-w-[220px]">
                <div className="relative" ref={editingTagsId === fc.id ? dropdownRef : undefined}>
                  <div onClick={() => editingTagsId === fc.id ? null : openTagDropdown(fc)}
                    className={`flex flex-wrap gap-1 items-center min-h-[28px] px-1.5 py-0.5 rounded cursor-pointer border transition-colors ${editingTagsId === fc.id ? 'border-brand-300 bg-white ring-2 ring-brand-100' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}>
                    {(editingTagsId === fc.id ? selectedTags : parseTags(fc.used_on)).length > 0 ? (
                      (editingTagsId === fc.id ? selectedTags : parseTags(fc.used_on)).map((tag, i) => {
                        const opt = getTagOption(tag)
                        const colors = getTagColors(opt?.color || 'blue')
                        return (
                          <span key={i} className={`inline-flex items-center gap-1 ${colors.bg} ${colors.text} text-xs font-medium px-2 py-0.5 rounded-full`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                            {tag}
                            {editingTagsId === fc.id && (
                              <button onClick={(e) => { e.stopPropagation(); toggleTag(tag) }} className="hover:opacity-70 ml-0.5"><X className="w-3 h-3" /></button>
                            )}
                          </span>
                        )
                      })
                    ) : (
                      <span className="text-gray-300 text-xs flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {editingTagsId === fc.id ? 'Select tags...' : 'Add tags'}
                      </span>
                    )}
                    {editingTagsId !== fc.id && <ChevronDown className="w-3 h-3 text-gray-300 ml-auto flex-shrink-0" />}
                  </div>
                  {editingTagsId === fc.id && (
                    <div className="absolute z-30 top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl">
                      <div className="p-2 border-b border-gray-100">
                        <input type="text" value={tagSearch} onChange={e => setTagSearch(e.target.value)}
                          placeholder="Search tags..." className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-300" autoFocus />
                      </div>
                      <div className="max-h-48 overflow-y-auto py-1">
                        {filteredOptions.length === 0 && !tagSearch.trim() && <p className="text-xs text-gray-400 px-3 py-2">No tags created yet</p>}
                        {filteredOptions.length === 0 && tagSearch.trim() && <p className="text-xs text-gray-400 px-3 py-2">No matching tags</p>}
                        {filteredOptions.map(opt => {
                          const isSelected = selectedTags.some(t => t.toLowerCase() === opt.name.toLowerCase())
                          const colors = getTagColors(opt.color)
                          return (
                            <button key={opt.id} onClick={() => toggleTag(opt.name)}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${isSelected ? 'bg-gray-50' : ''}`}>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className={`inline-flex items-center gap-1 ${colors.bg} ${colors.text} font-medium px-2 py-0.5 rounded-full`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                                {opt.name}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <div className="border-t border-gray-100 p-2">
                        <div className="flex items-center gap-1">
                          <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag() } }}
                            placeholder="Create new tag..." className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                          <button onClick={handleCreateTag} disabled={creatingTag || !newTagName.trim()}
                            className="p-1 text-brand-600 hover:text-brand-700 disabled:opacity-30" title="Create tag"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="border-t border-gray-100 p-2">
                        <button onClick={() => saveTags(fc.id, selectedTags)} disabled={savingTags}
                          className="w-full px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded hover:bg-brand-700 disabled:opacity-50">
                          {savingTags ? 'Saving...' : 'Done'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingId(fc.id); setEditName(fc.clip?.name || '') }} disabled={loading === fc.id}
                    className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50" title="Rename clip">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(fc)} disabled={loading === fc.id}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50" title="Delete clip">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {loading === fc.id && <span className="text-xs text-gray-400 ml-1">...</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
