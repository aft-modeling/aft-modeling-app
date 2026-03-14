'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { MetaAdsReel } from '@/lib/types'
import {
  Film,
  ExternalLink,
  Plus,
  X,
  ChevronDown,
  Grid3X3,
  LayoutGrid,
  Save,
} from 'lucide-react'
import clsx from 'clsx'

// ── View Definitions (replicate AirTable's 14 views) ──

interface ViewDef {
  id: string
  label: string
  filter: (r: MetaAdsReel) => boolean
  sort: (a: MetaAdsReel, b: MetaAdsReel) => number
  gallery?: boolean
}

const VIEWS: ViewDef[] = [
  {
    id: 'all',
    label: 'All Reels',
    filter: () => true,
    sort: (a, b) => new Date(b.date_reel_posted || 0).getTime() - new Date(a.date_reel_posted || 0).getTime(),
  },
  {
    id: 'like-view-low-high',
    label: 'Like/View LOWEST→HIGHEST',
    filter: (r) => (r.total_views || 0) > 0 && r.boosted_after_trial != null,
    sort: (a, b) => (a.view_to_like_ratio || 999999) - (b.view_to_like_ratio || 999999),
  },
  {
    id: 'most-views',
    label: 'Most → Least Views',
    filter: () => true,
    sort: (a, b) => (b.total_views || 0) - (a.total_views || 0),
  },
  {
    id: 'scrape-inactive',
    label: 'Like/View Scrape INACTIVE',
    filter: (r) => r.scrape !== 'YES',
    sort: (a, b) => (a.view_to_like_ratio || 999999) - (b.view_to_like_ratio || 999999),
  },
  {
    id: 'scrape-active',
    label: 'Like/View Scrape ACTIVE',
    filter: (r) => r.scrape === 'YES',
    sort: (a, b) => (a.view_to_like_ratio || 999999) - (b.view_to_like_ratio || 999999),
  },
  {
    id: 'ads-active-all',
    label: 'Ads - ACTIVE ALL',
    filter: (r) => r.status === 'Active',
    sort: (a, b) => new Date(b.date_reel_posted || 0).getTime() - new Date(a.date_reel_posted || 0).getTime(),
    gallery: true,
  },
  {
    id: 'ads-active-no-trial',
    label: '1. Ads - ACTIVE + NO TRIAL',
    filter: (r) => r.status === 'Active' && (!r.trial_boosted || r.trial_boosted === 'No'),
    sort: (a, b) => new Date(b.date_reel_posted || 0).getTime() - new Date(a.date_reel_posted || 0).getTime(),
    gallery: true,
  },
  {
    id: 'ads-active-trial',
    label: '2. Ads - ACTIVE TRIAL',
    filter: (r) => r.status === 'Active' && r.trial_boosted === 'Yes',
    sort: (a, b) => new Date(b.date_reel_posted || 0).getTime() - new Date(a.date_reel_posted || 0).getTime(),
    gallery: true,
  },
  {
    id: 'ads-no-boost-after-trial',
    label: '3. Ads - NO BOOST AFTER TRIAL',
    filter: (r) =>
      r.status === 'Active' &&
      r.trial_boosted === 'Yes' &&
      r.boosted_after_trial === 'No',
    sort: (a, b) => new Date(b.date_reel_posted || 0).getTime() - new Date(a.date_reel_posted || 0).getTime(),
    gallery: true,
  },
  {
    id: 'ads-big-boost-active',
    label: '4. Ads - BIG BOOST ACTIVE',
    filter: (r) => r.status === 'Active' && r.boosted_after_trial === 'Currently active',
    sort: (a, b) => new Date(b.date_reel_posted || 0).getTime() - new Date(a.date_reel_posted || 0).getTime(),
    gallery: true,
  },
  {
    id: 'ads-done',
    label: 'Ads DONE',
    filter: (r) => r.status !== 'Active',
    sort: (a, b) => new Date(b.date_reel_posted || 0).getTime() - new Date(a.date_reel_posted || 0).getTime(),
    gallery: true,
  },
  {
    id: 'ads-not-eligible',
    label: 'ADS - Not Eligible',
    filter: (r) => r.eligible_for_reboost === 'NO',
    sort: (a, b) => new Date(b.date_reel_posted || 0).getTime() - new Date(a.date_reel_posted || 0).getTime(),
    gallery: true,
  },
]

// ── Add Reel Modal ──

function AddReelModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    link_to_reel: '',
    status: 'Posted' as 'Active' | 'Posted',
    date_reel_posted: new Date().toISOString().split('T')[0],
    notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('meta_ads_reels').insert({
      name: form.name || null,
      link_to_reel: form.link_to_reel || null,
      status: form.status,
      date_reel_posted: form.date_reel_posted || null,
      notes: form.notes || null,
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
          <h3 className="text-lg font-semibold">Add New Reel</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name / Caption</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Reel caption or title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link to Reel</label>
            <input
              type="url"
              value={form.link_to_reel}
              onChange={(e) => setForm({ ...form, link_to_reel: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="https://www.instagram.com/reel/..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'Posted' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="Posted">Posted</option>
                <option value="Active">Active</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Posted</label>
              <input
                type="date"
                value={form.date_reel_posted}
                onChange={(e) => setForm({ ...form, date_reel_posted: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={3}
              placeholder="Activity log..."
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Reel'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Inline Edit Cell ──

function EditableSelect({
  reelId,
  field,
  value,
  options,
  onSaved,
}: {
  reelId: string
  field: string
  value: string | null
  options: { label: string; value: string | null }[]
  onSaved: () => void
}) {
  const supabase = createClient()

  async function handleChange(newVal: string) {
    const val = newVal === '' ? null : newVal
    await supabase.from('meta_ads_reels').update({ [field]: val }).eq('id', reelId)
    onSaved()
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => handleChange(e.target.value)}
      className="border-0 bg-transparent text-sm py-0 px-1 cursor-pointer hover:bg-gray-100 rounded"
    >
      <option value="">—</option>
      {options.map((opt) => (
        <option key={opt.value || 'null'} value={opt.value || ''}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

// ── Gallery Card ──

function ReelCard({ reel }: { reel: MetaAdsReel }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="mb-3">
        <p className="font-medium text-gray-900 text-sm line-clamp-2">{reel.name || 'Untitled'}</p>
        {reel.date_reel_posted && (
          <p className="text-xs text-gray-500 mt-1">{reel.date_reel_posted}</p>
        )}
      </div>
      <div className="space-y-1 text-xs text-gray-600">
        {reel.status && (
          <span
            className={clsx(
              'inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-1',
              reel.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            )}
          >
            {reel.status}
          </span>
        )}
        {reel.trial_boosted === 'Yes' && (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mr-1">
            Trial
          </span>
        )}
        {reel.boosted_after_trial === 'Currently active' && (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mr-1">
            Big Boost
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Views:</span>{' '}
          <span className="font-medium">{(reel.total_views || 0).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-500">Likes:</span>{' '}
          <span className="font-medium">{(reel.total_likes || 0).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-500">V/L Ratio:</span>{' '}
          <span className="font-medium">{reel.view_to_like_ratio ?? '—'}</span>
        </div>
        {reel.expect_daily_spend > 0 && (
          <div>
            <span className="text-gray-500">Daily:</span>{' '}
            <span className="font-medium">${reel.expect_daily_spend}</span>
          </div>
        )}
      </div>
      {reel.link_to_reel && (
        <a
          href={reel.link_to_reel}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
        >
          <ExternalLink className="w-3 h-3" />
          View Reel
        </a>
      )}
    </div>
  )
}

// ── Main Component ──

export default function ReelsTable({ initialReels }: { initialReels: MetaAdsReel[] }) {
  const [reels, setReels] = useState(initialReels)
  const [activeView, setActiveView] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const currentView = VIEWS.find((v) => v.id === activeView) || VIEWS[0]

  const filteredReels = useMemo(() => {
    return reels.filter(currentView.filter).sort(currentView.sort)
  }, [reels, currentView])

  // Totals for footer
  const totalViews = filteredReels.reduce((s, r) => s + (r.total_views || 0), 0)
  const totalLikes = filteredReels.reduce((s, r) => s + (r.total_likes || 0), 0)
  const totalExpectedSpend = filteredReels.reduce((s, r) => s + (r.expect_daily_spend || 0), 0)

  function refreshData() {
    router.refresh()
    // Also fetch fresh data client-side
    supabase
      .from('meta_ads_reels')
      .select('*')
      .order('date_reel_posted', { ascending: false })
      .then(({ data }) => {
        if (data) setReels(data)
      })
  }

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Film className="w-6 h-6 text-brand-600" />
            Reels
          </h1>
          <p className="text-gray-500 mt-1">{filteredReels.length} reels</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Selector */}
          <div className="relative">
            <button
              onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              {currentView.gallery ? (
                <LayoutGrid className="w-4 h-4 text-gray-500" />
              ) : (
                <Grid3X3 className="w-4 h-4 text-gray-500" />
              )}
              {currentView.label}
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {viewDropdownOpen && (
              <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-40 max-h-80 overflow-y-auto">
                {VIEWS.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => {
                      setActiveView(view.id)
                      setViewDropdownOpen(false)
                    }}
                    className={clsx(
                      'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2',
                      activeView === view.id && 'bg-brand-50 text-brand-700'
                    )}
                  >
                    {view.gallery ? (
                      <LayoutGrid className="w-3 h-3 text-gray-400" />
                    ) : (
                      <Grid3X3 className="w-3 h-3 text-gray-400" />
                    )}
                    {view.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" />
            Add Reel
          </button>
        </div>
      </div>

      {/* Gallery View */}
      {currentView.gallery ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredReels.map((reel) => (
            <ReelCard key={reel.id} reel={reel} />
          ))}
          {filteredReels.length === 0 && (
            <p className="text-gray-500 col-span-full text-center py-8">No reels match this view.</p>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[200px]">Name</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 min-w-[80px]">Status</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 min-w-[80px]">Trial?</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 min-w-[100px]">Reboost?</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 min-w-[120px]">Boost After Trial</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 min-w-[90px]">Daily $</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 min-w-[70px]">Days</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 min-w-[100px]">Total Exp $</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 min-w-[80px]">Days Left</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600 min-w-[50px]">Link</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 min-w-[90px]">Views</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 min-w-[80px]">Likes</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 min-w-[80px]">V/L Ratio</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 min-w-[60px]">Scrape</th>
                </tr>
              </thead>
              <tbody>
                {filteredReels.map((reel) => (
                  <tr key={reel.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900 sticky left-0 bg-white font-medium max-w-[250px] truncate">
                      {reel.name || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <EditableSelect
                        reelId={reel.id}
                        field="status"
                        value={reel.status}
                        options={[
                          { label: 'Active', value: 'Active' },
                          { label: 'Posted', value: 'Posted' },
                        ]}
                        onSaved={refreshData}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableSelect
                        reelId={reel.id}
                        field="trial_boosted"
                        value={reel.trial_boosted}
                        options={[
                          { label: 'Yes', value: 'Yes' },
                          { label: 'No', value: 'No' },
                        ]}
                        onSaved={refreshData}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableSelect
                        reelId={reel.id}
                        field="eligible_for_reboost"
                        value={reel.eligible_for_reboost}
                        options={[
                          { label: 'YES', value: 'YES' },
                          { label: 'NO', value: 'NO' },
                        ]}
                        onSaved={refreshData}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableSelect
                        reelId={reel.id}
                        field="boosted_after_trial"
                        value={reel.boosted_after_trial}
                        options={[
                          { label: 'Currently active', value: 'Currently active' },
                          { label: 'No', value: 'No' },
                        ]}
                        onSaved={refreshData}
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {reel.expect_daily_spend > 0 ? `$${reel.expect_daily_spend}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {reel.expected_days_ran || '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {reel.total_expected_spend > 0 ? `$${reel.total_expected_spend}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {reel.days_remaining || '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {reel.link_to_reel ? (
                        <a
                          href={reel.link_to_reel}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:text-brand-700"
                        >
                          <ExternalLink className="w-4 h-4 inline" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {(reel.total_views || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {(reel.total_likes || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {reel.view_to_like_ratio ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <EditableSelect
                        reelId={reel.id}
                        field="scrape"
                        value={reel.scrape}
                        options={[{ label: 'YES', value: 'YES' }]}
                        onSaved={refreshData}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer with sums */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                  <td className="px-3 py-2 text-gray-600 sticky left-0 bg-gray-50">
                    {filteredReels.length} records
                  </td>
                  <td colSpan={4}></td>
                  <td className="px-3 py-2 text-right text-gray-900">
                    ${totalExpectedSpend.toFixed(2)}
                  </td>
                  <td colSpan={4}></td>
                  <td className="px-3 py-2 text-right text-gray-900">
                    {totalViews.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900">
                    {totalLikes.toLocaleString()}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      {showAddModal && (
        <AddReelModal onClose={() => setShowAddModal(false)} onSaved={refreshData} />
      )}
    </div>
  )
}
