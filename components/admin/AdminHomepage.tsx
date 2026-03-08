'use client'

import Link from 'next/link'
import clsx from 'clsx'
import { Film, Calendar, DollarSign, MessageSquare, Users } from 'lucide-react'
import { ALL_PORTALS } from '@/lib/portals'

interface AdminHomepageProps {
  employeeCount: number
  portalAccessCounts: Record<string, number>
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Film,
  Calendar,
  DollarSign,
  MessageSquare,
  Users,
}

export default function AdminHomepage({ employeeCount, portalAccessCounts }: AdminHomepageProps) {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage portals, teams, and employee access</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Total Employees Card */}
        <div className="card p-6">
          <p className="text-gray-600 text-sm font-medium mb-2">Total Employees</p>
          <div className="flex items-baseline gap-3">
            <p className="text-4xl font-bold text-gray-900">{employeeCount}</p>
            <p className="text-gray-500 text-sm">active users</p>
          </div>
        </div>

        {/* Total Estimated Payroll Card */}
        <div className="card p-6">
          <p className="text-gray-600 text-sm font-medium mb-2">Total Estimated Payroll</p>
          <div className="flex items-baseline gap-3">
            <p className="text-4xl font-bold text-gray-900">$0.00</p>
            <p className="text-gray-500 text-sm">per pay period</p>
          </div>
        </div>
      </div>

      {/* Portal Cards Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Portals</h2>
        <div className="grid grid-cols-3 gap-6">
          {ALL_PORTALS.map((portal) => {
            const IconComponent = iconMap[portal.icon] || Users
            const accessCount = portalAccessCounts[portal.id] || 0
            const isActive = portal.active

            if (isActive) {
              return (
                <Link key={portal.id} href={portal.href}>
                  <div className="card p-6 cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 border-l-brand-600">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{portal.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{portal.description}</p>
                      </div>
                      <div className="ml-4 p-3 bg-brand-50 rounded-lg">
                        <IconComponent className="w-6 h-6 text-brand-600" />
                      </div>
                    </div>

                    {/* Employee Count with Access */}
                    <div className="py-3 border-t border-gray-100">
                      <p className="text-2xl font-bold text-gray-900">{accessCount}</p>
                      <p className="text-gray-600 text-sm">employees with access</p>
                    </div>

                    {/* Manage Button */}
                    <button className="btn-primary w-full mt-4 justify-center">
                      Manage
                    </button>
                  </div>
                </Link>
              )
            }

            return (
              <div key={portal.id} className="card p-6 opacity-60">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{portal.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{portal.description}</p>
                  </div>
                  <div className="ml-4 p-3 bg-gray-100 rounded-lg">
                    <IconComponent className="w-6 h-6 text-gray-400" />
                  </div>
                </div>

                {/* Coming Soon Badge */}
                <div className="py-3 border-t border-gray-100">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                    Coming Soon
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
