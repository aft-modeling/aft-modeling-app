'use client'

import Link from 'next/link'
import { ALL_PORTALS } from '@/lib/portals'
import type { Profile } from '@/lib/types'
import {
  Film,
  Calendar,
  DollarSign,
  MessageSquare,
  Users,
  Info,
} from 'lucide-react'

interface EmployeeHomepageProps {
  profile: Profile
  grantedPortalIds: string[]
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Film,
  Calendar,
  DollarSign,
  MessageSquare,
  Users,
}

export default function EmployeeHomepage({
  profile,
  grantedPortalIds,
}: EmployeeHomepageProps) {
  // Filter portals to only show granted ones
  const grantedPortals = ALL_PORTALS.filter(
    portal => grantedPortalIds.includes(portal.id)
  )

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {profile.full_name}
        </h1>
        <p className="text-gray-600">
          Access your assigned portals and tools below.
        </p>
      </div>

      {/* Portals Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Your Portals
        </h2>

          {grantedPortals.length === 0 ? (
            // No portals assigned state
            <div className="flex justify-center items-center py-16">
              <div className="card p-8 max-w-md text-center bg-gray-100 border-gray-300">
                <div className="flex justify-center mb-4">
                  <Info className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-gray-600 text-base">
                  No portals assigned yet. Contact your admin.
                </p>
              </div>
            </div>
          ) : (
            // Portals grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {grantedPortals.map(portal => {
                const IconComponent = ICON_MAP[portal.icon]

                return (
                  <Link
                    key={portal.id}
                    href={portal.href}
                    className="group"
                  >
                    <div className="card p-6 h-full flex flex-col bg-white hover:shadow-md transition-shadow duration-150 border-l-4 border-l-brand-600">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {portal.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {portal.description}
                          </p>
                        </div>
                        {IconComponent && (
                          <div className="ml-4 flex-shrink-0">
                            <IconComponent className="w-6 h-6 text-brand-600" />
                          </div>
                        )}
                      </div>

                      <div className="mt-auto pt-4">
                        <button className="btn-primary w-full justify-center">
                          Enter
                        </button>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
      </div>
    </div>
  )
}
