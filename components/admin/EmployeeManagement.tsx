'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, PortalAccess } from '@/lib/types'
import { ALL_PORTALS } from '@/lib/portals'
import { Search, Shield, Users, Filter, Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface EmployeeManagementProps {
  employees: Profile[]
  portalAccess: PortalAccess[]
  adminId: string
}

export default function EmployeeManagement({
  employees,
  portalAccess,
  adminId,
}: EmployeeManagementProps) {
  const router = useRouter()
  const supabase = createClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  // Filter employees based on search and role
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = roleFilter === 'all' || emp.role === roleFilter

    return matchesSearch && matchesRole
  })

  // Build a map of user_id -> portal_id[] for quick lookup
  const employeePortalMap = new Map<string, string[]>()
  portalAccess.forEach((access) => {
    if (!employeePortalMap.has(access.user_id)) {
      employeePortalMap.set(access.user_id, [])
    }
    employeePortalMap.get(access.user_id)!.push(access.portal_id)
  })

  // Handle portal access toggle
  const handleTogglePortalAccess = async (
    userId: string,
    portalId: string
  ) => {
    const loadingKey = `${userId}-${portalId}`
    setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }))

    try {
      const userPortals = employeePortalMap.get(userId) || []
      const hasAccess = userPortals.includes(portalId)

      if (hasAccess) {
        // Revoke access
        const { error } = await supabase
          .from('employee_portal_access')
          .delete()
          .eq('user_id', userId)
          .eq('portal_id', portalId)

        if (error) throw error
      } else {
        // Grant access
        const { error } = await supabase
          .from('employee_portal_access')
          .insert({
            user_id: userId,
            portal_id: portalId,
            granted_by: adminId,
          })

        if (error) throw error
      }

      // Update local state immediately for optimistic UI
      if (hasAccess) {
        employeePortalMap.set(
          userId,
          userPortals.filter((p) => p !== portalId)
        )
      } else {
        employeePortalMap.set(userId, [...userPortals, portalId])
      }

      // Refresh server data
      router.refresh()
    } catch (error) {
      console.error('Error toggling portal access:', error)
    } finally {
      setLoadingStates((prev) => {
        const newState = { ...prev }
        delete newState[loadingKey]
        return newState
      })
    }
  }

  const getRoleBadgeClasses = (role: string) => {
    switch (role) {
      case 'creative_director':
        return 'bg-brand-100 text-brand-700'
      case 'editor':
        return 'bg-blue-100 text-blue-700'
      case 'qa':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'creative_director':
        return 'Creative Director'
      case 'editor':
        return 'Editor'
      case 'qa':
        return 'QA Analyst'
      default:
        return role
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-6 h-6 text-brand-600" />
          <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
        </div>
        <p className="text-gray-600 mt-2">
          Manage employee portal access and roles
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input py-2"
            >
              <option value="all">All Roles</option>
              <option value="creative_director">Creative Director</option>
              <option value="editor">Editor</option>
              <option value="qa">QA Analyst</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-600">
          Showing {filteredEmployees.length} of {employees.length} employees
        </p>
      </div>

      {/* Employee Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Portal Access
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500 font-medium">
                        {searchQuery || roleFilter !== 'all'
                          ? 'No employees found'
                          : 'No employees'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const userPortals = employeePortalMap.get(employee.id) || []

                  return (
                    <tr
                      key={employee.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      {/* Name */}
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {employee.full_name}
                        </p>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{employee.email}</p>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <div
                          className={clsx(
                            'badge',
                            getRoleBadgeClasses(employee.role)
                          )}
                        >
                          {getRoleLabel(employee.role)}
                        </div>
                      </td>

                      {/* Portal Access Checkboxes */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-3">
                          {ALL_PORTALS.map((portal) => {
                            const hasAccess = userPortals.includes(portal.id)
                            const loadingKey = `${employee.id}-${portal.id}`
                            const isLoading = loadingStates[loadingKey]

                            return (
                              <div
                                key={portal.id}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="checkbox"
                                  id={`portal-${employee.id}-${portal.id}`}
                                  checked={hasAccess}
                                  onChange={() =>
                                    handleTogglePortalAccess(
                                      employee.id,
                                      portal.id
                                    )
                                  }
                                  disabled={isLoading}
                                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-2 focus:ring-brand-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <label
                                  htmlFor={`portal-${employee.id}-${portal.id}`}
                                  className="text-sm text-gray-700 cursor-pointer flex items-center gap-1"
                                >
                                  {portal.name}
                                  {isLoading && (
                                    <Loader2 className="w-3 h-3 animate-spin text-brand-600" />
                                  )}
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-brand-100"></div>
            <span className="text-gray-700">Creative Director</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-100"></div>
            <span className="text-gray-700">Editor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-100"></div>
            <span className="text-gray-700">QA Analyst</span>
          </div>
        </div>
      </div>
    </div>
  )
}
