'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { MetaAdsRealcambliss } from '@/lib/types'
import { Users, Plus, X } from 'lucide-react'

function AddEntryModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    followers: '',
    twenty_four_hr_gain: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('meta_ads_realcambliss').insert({
      date: form.date,
      followers: form.followers ? parseInt(form.followers) : null,
      twenty_four_hr_gain: form.twenty_four_hr_gain ? parseInt(form.twenty_four_hr_gain) : null,
    })
    setSaving(false)
    if (!error) {
      onSaved()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Realcambliss Entry</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Followers</label>
            <input
              type="number"
              value={form.followers}
              onChange={(e) => setForm({ ...form, followers: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">24hr Gain</label>
            <input
              type="number"
              value={form.twenty_four_hr_gain}
              onChange={(e) => setForm({ ...form, twenty_four_hr_gain: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Entry'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function RealcamblissTable({
  initialEntries,
}: {
  initialEntries: MetaAdsRealcambliss[]
}) {
  const [entries, setEntries] = useState(initialEntries)
  const [showAddModal, setShowAddModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function refreshData() {
    router.refresh()
    supabase
      .from('meta_ads_realcambliss')
      .select('*')
      .order('date', { ascending: false })
      .then(({ data }) => {
        if (data) setEntries(data)
      })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            Realcambliss
          </h1>
          <p className="text-gray-500 mt-1">Daily follower tracking for @realcambliss</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Followers</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">24hr Gain</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900 font-medium">{entry.date}</td>
                  <td className="px-4 py-2 text-right text-gray-900">
                    {entry.followers?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={
                        (entry.twenty_four_hr_gain ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {entry.twenty_four_hr_gain != null
                        ? (entry.twenty_four_hr_gain >= 0 ? '+' : '') + entry.twenty_four_hr_gain
                        : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddEntryModal onClose={() => setShowAddModal(false)} onSaved={refreshData} />
      )}
    </div>
  )
}
