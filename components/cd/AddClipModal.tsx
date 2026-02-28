'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface AddClipModalProps {
  editors: any[]
  onClose: () => void
}

export default function AddClipModal({ editors, onClose }: AddClipModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    example_reel_url: '',
    additional_notes: '',
    due_date: '',
    assigned_editor_id: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not authenticated'); setLoading(false); return }

    const { error: insertError } = await supabase.from('clips').insert({
      name: form.name,
      example_reel_url: form.example_reel_url,
      additional_notes: form.additional_notes || null,
      due_date: form.due_date || null,
      assigned_editor_id: form.assigned_editor_id || null,
      status: form.assigned_editor_id ? 'assigned' : 'assigned',
      created_by: session.user.id,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      router.refresh()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2>Add New Clip</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Clip Name <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="e.g. Clip #1"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Example Reel URL <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="https://www.instagram.com/reel/..."
              value={form.example_reel_url}
              onChange={e => setForm(f => ({ ...f, example_reel_url: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                className="input"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Assign to Editor</label>
              <select
                className="input"
                value={form.assigned_editor_id}
                onChange={e => setForm(f => ({ ...f, assigned_editor_id: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {editors.map(e => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Additional Notes</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Any special instructions for the editor..."
              value={form.additional_notes}
              onChange={e => setForm(f => ({ ...f, additional_notes: e.target.value }))}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? 'Adding...' : 'Add Clip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
