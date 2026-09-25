'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { SchoolService } from '@/services/school.service'
import { UserRegistrationService } from '@/services/user-registration.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'

// NO DYNAMIC IMPORTS - This causes hook violations
import StaffHeader from '@/components/StaffHeader'

interface DashboardState {
  user: User | null
  school: any
  loading: boolean
  error: string
  activeTab: 'overview' | 'staff' | 'students' | 'results' | 'transactions' | 'broadcast'
  staffMembers: any[]
  students: any[]
  broadcastMessage: string
  sendingBroadcast: boolean
}

export default function SchoolAdminDashboard() {
  const router = useRouter()
  
  // All state declarations FIRST, BEFORE any conditional logic
  const [state, setState] = useState<DashboardState>({
    user: null,
    school: null,
    loading: true,
    error: '',
    activeTab: 'overview',
    staffMembers: [],
    students: [],
    broadcastMessage: '',
    sendingBroadcast: false,
  })

  // Load data only once
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser()
      console.log('[Dashboard] Current user:', { id: currentUser?.id, role: currentUser?.role, school_id: currentUser?.school_id })
      
      if (!currentUser || (currentUser.role !== 'SCHOOL_ADMIN' && currentUser.role !== 'ADMIN')) {
        router.push('/landing')
        return
      }

      setState(s => ({ ...s, user: currentUser }))

      if (!currentUser.school_id) {
        setState(s => ({ ...s, error: '❌ School ID not found - contact support', loading: false }))
        return
      }

      // Load school
      const schoolData = await SchoolService.getSchoolById(currentUser.school_id)
      console.log('[Dashboard] School data:', schoolData)
      setState(s => ({ ...s, school: schoolData }))

      // FETCH: Call backend API (bypasses RLS)
      console.log('[Dashboard] Calling backend API for staff/students...')
      const apiResponse = await fetch('/api/admin/dashboard-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: currentUser.school_id }),
      })

      if (!apiResponse.ok) {
        const error = await apiResponse.json()
        throw new Error(error.details || error.error || 'Failed to fetch data')
      }

      const { staff, students, staffCount, studentCount } = await apiResponse.json()
      console.log('[Dashboard] API Response:', { staffCount, studentCount })

      setState(s => ({
        ...s,
        staffMembers: staff || [],
        students: students || [],
        loading: false,
        error: staffCount === 0 && studentCount === 0 ? '⚠️ No staff or students found' : '',
      }))
    } catch (err: any) {
      console.error('[Dashboard] FATAL ERROR:', err)
      setState(s => ({ ...s, error: `❌ ${err.message}`, loading: false }))
    }
  }

  const handleSendBroadcast = async () => {
    if (!state.user?.school_id || !state.broadcastMessage.trim()) {
      setState(s => ({ ...s, error: 'Missing information' }))
      return
    }

    setState(s => ({ ...s, sendingBroadcast: true, error: '' }))
    try {
      const response = await fetch('/api/broadcasts/send-to-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: state.user.school_id,
          message: state.broadcastMessage,
          recipient_role: null,  // null = send to ALL users in school
          sender_id: state.user.id,
          sender_name: state.user.full_name || 'Admin',
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send broadcast')
      }

      console.log('[Broadcast] Success:', result)

      setState(s => ({
        ...s,
        broadcastMessage: '',
        error: `✅ Broadcast sent to ${result.recipients_count} recipient(s)!`,
        sendingBroadcast: false,
      }))

      setTimeout(() => setState(s => ({ ...s, error: '' })), 4000)
    } catch (err: any) {
      console.error('[Broadcast] Error:', err)
      setState(s => ({ ...s, error: `❌ ${err.message}`, sendingBroadcast: false }))
    }
  }

  // EARLY RETURN - BEFORE rendering anything
  if (state.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <StaffHeader
        staffName={state.user?.full_name || 'School Administrator'}
        schoolName={state.school?.name || 'School'}
        section="Administration Center"
      />

      {/* Navigation Tabs */}
      <div className="sticky top-16 z-30 bg-white shadow-md border-b border-gray-200 overflow-x-auto">
        <div className="min-w-max md:max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'staff', label: '👨‍🏫 Staff' },
              { id: 'students', label: '👨‍🎓 Students' },
              { id: 'broadcast', label: '📢 Broadcast' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setState(s => ({ ...s, activeTab: tab.id as any }))}
                className={`px-2 sm:px-4 py-3 font-semibold text-xs sm:text-sm whitespace-nowrap border-b-4 transition-all ${
                  state.activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {state.error && (
          <div className={`mb-6 p-4 rounded-lg border ${state.error.includes('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {state.error}
          </div>
        )}

        {/* Overview Tab */}
        {state.activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
              <p className="text-gray-600 text-sm font-semibold">Total Staff</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{state.staffMembers.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
              <p className="text-gray-600 text-sm font-semibold">Total Students</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{state.students.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-600">
              <p className="text-gray-600 text-sm font-semibold">School</p>
              <p className="text-lg font-bold text-purple-600 mt-2 truncate">{state.school?.name || 'N/A'}</p>
            </div>
          </div>
        )}

        {/* Staff Tab */}
        {state.activeTab === 'staff' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">👨‍🏫 Staff</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.staffMembers.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                  <p className="text-lg">No staff registered yet</p>
                </div>
              ) : (
                state.staffMembers.map((member: any) => (
                  <div key={member.id} className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900">{member.full_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{member.role}</p>
                    <p className="text-sm text-gray-600 mt-2">{member.email}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {state.activeTab === 'students' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">👨‍🎓 Students</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.students.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                  <p className="text-lg">No students registered yet</p>
                </div>
              ) : (
                state.students.map((student: any) => (
                  <div key={student.id} className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900">{student.full_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">Admission #: {student.admission_number || 'N/A'}</p>
                    <p className="text-sm text-gray-600 mt-2">{student.email}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Broadcast Tab */}
        {state.activeTab === 'broadcast' && (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">📢 Send Broadcast</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Message:</label>
                <textarea
                  value={state.broadcastMessage}
                  onChange={(e) => setState(s => ({ ...s, broadcastMessage: e.target.value }))}
                  placeholder="Type your message..."
                  rows={6}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>
              <button
                onClick={handleSendBroadcast}
                disabled={state.sendingBroadcast || !state.broadcastMessage.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
              >
                {state.sendingBroadcast ? '⏳ Sending...' : '📤 Send Broadcast'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
