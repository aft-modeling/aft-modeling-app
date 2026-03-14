'use client'

import { useState } from 'react'
import {
  TrendingUp,
  DollarSign,
  Film,
  Users,
  BarChart3,
  RefreshCw,
} from 'lucide-react'
import type {
  MetaAdsReel,
  MetaAdsAccountLog,
  MetaAdsExpense,
} from '@/lib/types'

interface DashboardProps {
  reels: MetaAdsReel[]
  accountLogs: MetaAdsAccountLog[]
  expenses: MetaAdsExpense[]
}

function KpiCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string
  value: string | number
  subtitle?: string
  color: 'green' | 'blue' | 'pink' | 'yellow' | 'purple'
}) {
  const colorMap = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    pink: 'bg-pink-50 border-pink-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-50 border-purple-200',
  }

  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

export default function MetaAdsDashboard({
  reels,
  accountLogs,
  expenses,
}: DashboardProps) {
  const totalFunded = expenses
    .filter((e) => e.type === 'Funded')
    .reduce((sum, e) => sum + (e.amount || 0), 0)
  const totalPaid = expenses
    .filter((e) => e.type === 'Paid')
    .reduce((sum, e) => sum + (e.amount || 0), 0)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const yesterdaySpend = expenses
    .filter((e) => e.type === 'Paid' && e.date === yesterdayStr)
    .reduce((sum, e) => sum + (e.amount || 0), 0)
  const activeBigBoostAds = reels.filter(
    (r) => r.status === 'Active' && r.boosted_after_trial === 'Currently active'
  ).length
  const expectedDailySpend = reels
    .filter((r) => r.status === 'Active')
    .reduce((sum, r) => sum + (r.expect_daily_spend || 0), 0)
  const sortedLogs = [...accountLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const latestLog = sortedLogs[0]
  const allTimeFollowersGained = latestLog?.all_time_followers_gained || 0
  const allTimeCpf = allTimeFollowersGained > 0 ? (totalPaid / allTimeFollowersGained).toFixed(2) : '—'
  const totalReels = reels.length
  const totalActiveTrialBoosts = reels.filter((r) => r.status === 'Active' && r.trial_boosted === 'Yes' && r.boosted_after_trial !== 'Currently active').length
  const totalBBEver = reels.filter((r) => r.boosted_after_trial === 'Currently active').length
  const totalTrialsEver = reels.filter((r) => r.trial_boosted === 'Yes').length
  const untrialedReels = reels.filter((r) => !r.trial_boosted || r.trial_boosted === 'No').length
  const latestFollowers = latestLog?.followers || 0
  const latestGain = latestLog?.twenty_four_hr_gain || 0
  const latestCpf = latestLog?.cpf
  return (<div className="p-6 max-w-7xl mx-auto"><div className="mb-8"><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BarChart3 className="w-6 h-6 text-brand-600" />Meta Ads Dashboard</h1><p className="text-gray-500 mt-1">Campaign performance overview</p></div><section className="mb-8"><h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" />Spend Overview</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><KpiCard title="Active Big Boost Ads" value={activeBigBoostAds} color="green" /><KpiCard title="Total Funded All-Time" value={`$${totalFunded.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} color="pink" /><KpiCard title="Expected Daily Spend" value={`$${expectedDailySpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} color="green" /><KpiCard title="Total Spend All-Time" value={`$${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} color="blue" /><KpiCard title="Yesterday's Spend" value={`$${yesterdaySpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} color="green" /><KpiCard title="All-Time CPF" value={allTimeCpf === '—' ? '—' : `$${allTimeCpf}`} subtitle="Cost Per Follower" color="yellow" /></div></section><section className="mb-8"><h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Film className="w-5 h-5 text-purple-600" />Content Overview</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><KpiCard title="Total Reels Posted" value={totalReels} color="green" /><KpiCard title="Total Active Big Boost Ads" value={activeBigBoostAds} color="blue" /><KpiCard title="Total Active Trial Boosts" value={totalActiveTrialBoosts} color="pink" /><KpiCard title="Total BB Ads Ever" value={totalBBEver} color="blue" /><KpiCard title="Total Trials Ever" value={totalTrialsEver} subtitle="Should always be slightly lower than total reels posted" color="pink" /><KpiCard title="Untrialed Reels" value={untrialedReels} color="pink" /></div></section><section className="mb-8"><h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" />Follower Tracking</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><KpiCard title="Current Followers" value={latestFollowers.toLocaleString()} subtitle={`As of ${latestLog?.date || '—'}`} color="blue" /><KpiCard title="24h Gain" value={latestGain >= 0 ? `+${latestGain}` : `${latestGain}`} color="green" /><KpiCard title="All-Time Gained" value={allTimeFollowersGained.toLocaleString()} subtitle="Started at 1,200" color="purple" /><KpiCard title="Current CPF" value={latestCpf != null ? `$${latestCpf.toFixed(4)}` : '—'} subtitle="Cost Per Follower" color="yellow" /></div><div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden"><div className="px-4 py-3 border-b border-gray-200 bg-gray-50"><h3 className="text-sm font-semibold text-gray-700">Recent Follower History</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-200"><th className="text-left px-4 py-2 font-medium text-gray-600">Date</th><th className="text-right px-4 py-2 font-medium text-gray-600">Followers</th><th className="text-right px-4 py-2 font-medium text-gray-600">All-Time Gained</th><th className="text-right px-4 py-2 font-medium text-gray-600">24h Gain</th><th className="text-right px-4 py-2 font-medium text-gray-600">CPF</th></tr></thead><tbody>{sortedLogs.slice(0, 10).map((log) => (<tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50"><td className="px-4 py-2 text-gray-900">{log.date}</td><td className="px-4 py-2 text-right text-gray-900">{log.followers?.toLocaleString() ?? '—'}</td><td className="px-4 py-2 text-right text-gray-900">{log.all_time_followers_gained?.toLocaleString() ?? '—'}</td><td className="px-4 py-2 text-right"><span className={(log.twenty_four_hr_gain ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>{log.twenty_four_hr_gain != null ? (log.twenty_four_hr_gain >= 0 ? '+' : '') + log.twenty_four_hr_gain : '—'}</span></td><td className="px-4 py-2 text-right text-gray-900">{log.cpf != null ? `$${log.cpf.toFixed(4)}` : '—'}</td></tr>))}</tbody></table></div></div></section></div>)
}
