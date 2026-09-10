'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User, School } from '@/types'
import Link from 'next/link'

interface SchoolWithCredentials extends School {
  admin_email?: string
  admin_password?: string
  students_count?: number
  staff_count?: number
}

interface ShareDetailsForm {
  whatsapp: boolean
  email: boolean
}

export default function SchoolsManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [schools, setSchools] = useState<SchoolWithCredentials[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'SUSPENDED'>('ALL')
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithCredentials | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showShareDetails, setShowShareDetails] = useState(false)
  const [showViewDetails, setShowViewDetails] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareForm, setShareForm] = useState<ShareDetailsForm>({
    whatsapp: false,
    email: false,
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser()
        if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
          router.push('/landing')
          return
        }
        setUser(currentUser)
        await fetchSchools()
      } catch (err) {
        console.error('Error checking auth:', err)
        router.push('/landing')
      } finally {
        setLoading(false)
      }
    }

    const fetchSchools = async () => {
      try {
        setError(null)
        console.log('🔄 [DASHBOARD] Starting to fetch schools...')
        
        // Get a fresh token from Supabase session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          console.error('Session error:', sessionError)
          throw new Error('No active session')
        }

        const token = session.access_token
        console.log('✅ [DASHBOARD] Got valid session token')

        // Fetch all schools from the correct endpoint
        console.log('📡 [DASHBOARD] Calling /api/schools endpoint...')
        const response = await fetch('/api/schools', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        console.log(`📊 [DASHBOARD] Response status: ${response.status}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch schools (${response.status})`)
        }
        
        const data = await response.json()
        console.log('✅ [DASHBOARD] Received data from /api/schools:', data)
        
        if (!Array.isArray(data)) {
          console.error('❌ [DASHBOARD] Invalid data format, expected array:', typeof data, data)
          throw new Error('Invalid schools data format')
        }
        
        console.log(`📋 [DASHBOARD] Got ${data.length} schools`)
        
        // Fetch counts for each school
        const schoolsWithCounts = await Promise.all(
          data.map(async (school: SchoolWithCredentials) => {
            try {
              const counts = await fetch(`/api/superadmin/schools/${school.id}/stats`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              })
              if (counts.ok) {
                const countData = await counts.json()
                return { ...school, ...countData }
              }
            } catch (err) {
              console.error(`Error fetching counts for school ${school.id}:`, err)
            }
            return school
          })
        )
        console.log(`✅ [DASHBOARD] Set ${schoolsWithCounts.length} schools in state`)
        setSchools(schoolsWithCounts)
      } catch (err) {
        console.error('❌ [DASHBOARD] Error fetching schools:', err)
        setError(err instanceof Error ? err.message : 'Failed to load schools. Please try again.')
      }
    }

    checkAuth()
  }, [router])

  const handleDelete = async (schoolId: string) => {
    setDeleting(true)
    try {
      // Get a fresh token from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError)
        setError('No active session. Please log in again.')
        setDeleting(false)
        return
      }

      const token = session.access_token
      console.log('Using token for delete:', token.substring(0, 20) + '...')

      const response = await fetch(`/api/superadmin/schools/${schoolId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setSchools(schools.filter(s => s.id !== schoolId))
        setShowDeleteConfirm(false)
        setSelectedSchool(null)
        setSuccess('✅ School deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.message || `Failed to delete school (${response.status})`)
        console.error('Delete response error:', errorData)
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError(err instanceof Error ? err.message : 'Error deleting school')
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusChange = async (schoolId: string, newStatus: string) => {
    setUpdating(true)
    try {
      // Get a fresh token from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError)
        setError('No active session. Please log in again.')
        setUpdating(false)
        return
      }

      const token = session.access_token
      console.log('Using token for status update:', token.substring(0, 20) + '...')

      const response = await fetch(`/api/superadmin/schools/${schoolId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setSchools(schools.map(s =>
          s.id === schoolId ? { ...s, status: newStatus as any } : s
        ))
        setSuccess(`✅ School status changed to ${newStatus}`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.message || `Failed to update school status (${response.status})`)
        console.error('Status update response error:', errorData)
      }
    } catch (err) {
      console.error('Error updating status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update school status')
    } finally {
      setUpdating(false)
    }
  }

  const handleShareDetails = async () => {
    if (!selectedSchool || (!shareForm.whatsapp && !shareForm.email)) {
      setError('Please select at least one sharing method')
      return
    }

    setSharing(true)
    try {
      // Get a fresh token from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError)
        setError('No active session. Please log in again.')
        setSharing(false)
        return
      }

      const token = session.access_token

      const response = await fetch(`/api/superadmin/schools/${selectedSchool.id}/share-details`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          share_via_whatsapp: shareForm.whatsapp,
          share_via_email: shareForm.email,
        }),
      })

      if (response.ok) {
        setSuccess('✅ School details shared successfully')
        setShowShareDetails(false)
        setShareForm({ whatsapp: false, email: false })
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await response.json().catch(() => ({}))
        setError(data.message || 'Failed to share details')
      }
    } catch (err) {
      console.error('Error sharing details:', err)
      setError(err instanceof Error ? err.message : 'Failed to share details')
    } finally {
      setSharing(false)
    }
  }

  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'ALL' || school.status === filterStatus
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading schools...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Unauthorized</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Schools Management</h1>
              <p className="text-purple-100 mt-2">Manage all registered schools and their settings</p>
            </div>
            <Link href="/superadmin/register-school">
              <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition">
                ➕ Register School
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-900 font-bold">×</button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex justify-between items-center">
            <span>✓ {success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-900 font-bold">×</button>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="ALL">All Schools</option>
                <option value="ACTIVE">Active Only</option>
                <option value="PAUSED">Paused Only</option>
                <option value="SUSPENDED">Suspended Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Results</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-semibold">
                {filteredSchools.length} school{filteredSchools.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Stats</label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 text-sm">
                <div>Schools: {schools.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Schools Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredSchools.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 text-lg mb-4">No schools found</p>
              <Link href="/superadmin/register-school">
                <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition">
                  Register First School
                </button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Logo</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">School Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Admin Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Plan</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Students</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Staff</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSchools.map((school) => (
                    <tr key={school.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        {school.logo_url ? (
                          <img src={school.logo_url} alt={school.name} className="h-10 w-10 rounded-full object-cover border border-gray-200" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
                            {school.name.charAt(0)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{school.name}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{school.email || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{school.admin_email || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          school.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          school.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {school.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                          {school.subscription_plan || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="font-semibold text-gray-900">{school.students_count || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="font-semibold text-gray-900">{school.staff_count || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-sm space-x-1">
                        <button
                          onClick={() => {
                            setSelectedSchool(school)
                            setShowViewDetails(true)
                          }}
                          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs transition"
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSchool(school)
                            setShowShareDetails(true)
                          }}
                          className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs transition"
                          title="Share Details"
                        >
                          📤
                        </button>
                        {school.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleStatusChange(school.id, 'PAUSED')}
                            disabled={updating}
                            className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded text-xs transition disabled:opacity-50"
                            title="Pause School"
                          >
                            ⏸️
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(school.id, 'ACTIVE')}
                            disabled={updating}
                            className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs transition disabled:opacity-50"
                            title="Resume School"
                          >
                            ▶️
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSchool(school)
                            setShowDeleteConfirm(true)
                          }}
                          className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs transition"
                          title="Delete School"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      {showViewDetails && selectedSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{selectedSchool.name}</h2>
              <button
                onClick={() => setShowViewDetails(false)}
                className="text-2xl hover:opacity-80"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">School Email</p>
                  <p className="font-semibold text-gray-900">{selectedSchool.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-900">{selectedSchool.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">School Type</p>
                  <p className="font-semibold text-gray-900">{selectedSchool.type || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold text-gray-900">{selectedSchool.status}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-semibold text-gray-900">{selectedSchool.address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Subscription Plan</p>
                  <p className="font-semibold text-gray-900">{selectedSchool.subscription_plan || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created At</p>
                  <p className="font-semibold text-gray-900">{selectedSchool.created_at ? new Date(selectedSchool.created_at).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Students</p>
                  <p className="font-semibold text-gray-900">{selectedSchool.students_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Staff Members</p>
                  <p className="font-semibold text-gray-900">{selectedSchool.staff_count || 0}</p>
                </div>
              </div>

              {selectedSchool.admin_email && (
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <h4 className="font-bold text-blue-900 mb-2">Admin Credentials</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-600">Email:</p>
                      <p className="font-mono bg-white p-2 rounded border border-blue-200">{selectedSchool.admin_email}</p>
                    </div>
                    {selectedSchool.admin_password && (
                      <div>
                        <p className="text-gray-600">Password:</p>
                        <p className="font-mono bg-white p-2 rounded border border-blue-200">{selectedSchool.admin_password}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowViewDetails(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Details Modal */}
      {showShareDetails && selectedSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
              <h2 className="text-2xl font-bold">Share School Details</h2>
              <p className="text-green-100 mt-1">{selectedSchool.name}</p>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700 text-sm">
                Select how you want to share the school registration details:
              </p>

              <div className="space-y-3">
                <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareForm.whatsapp}
                    onChange={(e) => setShareForm({ ...shareForm, whatsapp: e.target.checked })}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="ml-3 text-gray-900 font-medium">Share via WhatsApp</span>
                </label>

                <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareForm.email}
                    onChange={(e) => setShareForm({ ...shareForm, email: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 text-gray-900 font-medium">Share via Email</span>
                </label>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                <strong>⚠️ Warning:</strong> The shared message will include admin credentials. Share only with authorized recipients.
              </div>
            </div>

            <div className="border-t p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowShareDetails(false)
                  setShareForm({ whatsapp: false, email: false })
                }}
                disabled={sharing}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleShareDetails}
                disabled={sharing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded transition disabled:opacity-50"
              >
                {sharing ? 'Sharing...' : 'Share Details'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-red-50 border-b border-red-200 p-6">
              <h3 className="text-xl font-bold text-red-900">Delete School?</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <strong>{selectedSchool.name}</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                <strong>⚠️ Warning:</strong> This will permanently delete the school, all students, staff, and associated data. This action cannot be undone.
              </div>
            </div>
            <div className="border-t p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setSelectedSchool(null)
                }}
                disabled={deleting}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedSchool.id)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

