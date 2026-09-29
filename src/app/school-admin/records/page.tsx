'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

let supabase: any = null

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient()
  }
  return supabase
}

interface Student {
  id: string
  user_id: string
  school_id: string
  admission_number: string
  date_of_birth: string | null
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'SUSPENDED'
  user: {
    id: string
    full_name: string
    email: string
    phone: string | null
    photo_url: string | null
  }
}

interface Staff {
  id: string
  user_id: string
  school_id: string
  position: string
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'SUSPENDED'
  user: {
    id: string
    full_name: string
    email: string
    phone: string | null
    photo_url: string | null
    role: string
  }
}

const RecordsPage: React.FC = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'students' | 'staff' | 'broadcast'>('students')
  const [students, setStudents] = useState<Student[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [schoolId, setSchoolId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastEmail, setBroadcastEmail] = useState('')
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Get current user's school
  useEffect(() => {
    const getCurrentSchool = async () => {
      try {
        const { data: { user } } = await getSupabaseClient().auth.getUser()
        if (!user) return

        const { data: userProfile } = await getSupabaseClient()
          .from('users')
          .select('school_id')
          .eq('id', user.id)
          .single()

        if (userProfile) {
          setSchoolId(userProfile.school_id)
        }
      } catch (error) {
        console.error('Error getting school:', error)
      }
    }

    getCurrentSchool()
  }, [])

  // Fetch students
  const fetchStudents = useCallback(async () => {
    if (!schoolId) return

    try {
      setIsLoading(true)
      const { data, error } = await getSupabaseClient()
        .from('students')
        .select(`
          id,
          user_id,
          school_id,
          admission_number,
          date_of_birth,
          status,
          user:user_id (
            id,
            full_name,
            email,
            phone,
            photo_url
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const sortedData = (data || []).sort((a, b) =>
        (a.user?.full_name || '').localeCompare(b.user?.full_name || '')
      )

      setStudents(sortedData)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students')
    }
  }, [schoolId])

  // Fetch staff
  const fetchStaff = useCallback(async () => {
    if (!schoolId) return

    try {
      const { data, error } = await getSupabaseClient()
        .from('staff')
        .select(`
          id,
          user_id,
          school_id,
          position,
          status,
          user:user_id (
            id,
            full_name,
            email,
            phone,
            photo_url,
            role
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const sortedData = (data || []).sort((a, b) =>
        (a.user?.full_name || '').localeCompare(b.user?.full_name || '')
      )

      setStaff(sortedData)
    } catch (error) {
      console.error('Error fetching staff:', error)
      toast.error('Failed to load staff')
    } finally {
      setIsLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    if (schoolId) {
      if (activeTab === 'students') {
        fetchStudents()
      } else if (activeTab === 'staff') {
        fetchStaff()
      } else {
        setIsLoading(false)
      }
    }
  }, [schoolId, activeTab, fetchStudents, fetchStaff])

  // Filter records
  const filteredStudents = students.filter((student) =>
    student.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.admission_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredStaff = staff.filter((s) =>
    s.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.position?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Broadcast to teachers
  const handleBroadcastTeachers = async () => {
    if (!broadcastMessage.trim()) {
      setSuccessMessage('Please enter a message')
      setTimeout(() => setSuccessMessage(''), 3000)
      return
    }

    setIsSendingBroadcast(true)
    try {
      const teachers = staff.filter((s) =>
        ['TEACHER', 'PRINCIPAL', 'HEAD_TEACHER'].includes(s.user.role)
      )

      if (teachers.length === 0) {
        toast.error('No teachers found to broadcast to')
        return
      }

      // TODO: Implement actual broadcast API call to send notifications/emails
      console.log(`Broadcasting to ${teachers.length} teachers:`, broadcastMessage)

      setSuccessMessage(`✓ Message broadcast sent to ${teachers.length} teacher(s)!`)
      setBroadcastMessage('')
      toast.success('Broadcast sent successfully')
    } catch (error) {
      console.error('Broadcast error:', error)
      setSuccessMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      toast.error('Failed to send broadcast')
    } finally {
      setIsSendingBroadcast(false)
      setTimeout(() => setSuccessMessage(''), 3000)
    }
  }

  // Broadcast to parent email
  const handleBroadcastParent = async () => {
    if (!broadcastMessage.trim() || !broadcastEmail.trim()) {
      setSuccessMessage('Please enter both email and message')
      setTimeout(() => setSuccessMessage(''), 3000)
      return
    }

    setIsSendingBroadcast(true)
    try {
      // TODO: Implement actual email broadcast API call
      console.log('Broadcasting email to parent:', { email: broadcastEmail, message: broadcastMessage })

      setSuccessMessage(`✓ Email broadcast sent to ${broadcastEmail}!`)
      setBroadcastMessage('')
      setBroadcastEmail('')
      toast.success('Email sent successfully')
    } catch (error) {
      console.error('Email broadcast error:', error)
      setSuccessMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      toast.error('Failed to send email')
    } finally {
      setIsSendingBroadcast(false)
      setTimeout(() => setSuccessMessage(''), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📋 School Records</h1>
            <p className="text-gray-600 mt-1">View and manage school records</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Success Message */}
        {successMessage && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              successMessage.includes('Error')
                ? 'bg-red-100 text-red-700 border-red-300'
                : 'bg-green-100 text-green-700 border-green-300'
            }`}
          >
            {successMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          {[
            { id: 'students', label: '👨‍🎓 Students', count: students.length },
            { id: 'staff', label: '👨‍🏫 Staff', count: staff.length },
            { id: 'broadcast', label: '📢 Broadcast' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label} {tab.count !== undefined && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">All Students</h2>
              <input
                type="text"
                placeholder="Search by name, email, or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-3 text-gray-600">Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                No students found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Photo</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Name</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Email</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Admission #</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Phone</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          {student.user.photo_url ? (
                            <div className="relative w-10 h-10">
                              <Image
                                src={student.user.photo_url}
                                alt={student.user.full_name}
                                fill
                                className="rounded-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm">
                              {student.user.full_name[0]}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{student.user.full_name}</td>
                        <td className="px-6 py-4 text-gray-600">{student.user.email}</td>
                        <td className="px-6 py-4 text-gray-600">{student.admission_number || 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-600">{student.user.phone || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            student.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Staff Tab */}
        {activeTab === 'staff' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">All Staff</h2>
              <input
                type="text"
                placeholder="Search by name, email, or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-3 text-gray-600">Loading staff...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                No staff found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Photo</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Name</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Email</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Position</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Role</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Phone</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStaff.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          {member.user.photo_url ? (
                            <div className="relative w-10 h-10">
                              <Image
                                src={member.user.photo_url}
                                alt={member.user.full_name}
                                fill
                                className="rounded-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm">
                              {member.user.full_name[0]}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{member.user.full_name}</td>
                        <td className="px-6 py-4 text-gray-600">{member.user.email}</td>
                        <td className="px-6 py-4 text-gray-600">{member.position || 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-600 capitalize">{member.user.role}</td>
                        <td className="px-6 py-4 text-gray-600">{member.user.phone || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            member.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Broadcast Tab */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Broadcast to Teachers */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📢 Broadcast to Teachers</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Enter your message for teachers..."
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Recipients: {staff.filter((s) => ['TEACHER', 'PRINCIPAL', 'HEAD_TEACHER'].includes(s.user.role)).length} teacher(s)
                </p>
                <button
                  onClick={handleBroadcastTeachers}
                  disabled={isSendingBroadcast}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSendingBroadcast ? 'Sending...' : 'Send to Teachers'}
                </button>
              </div>
            </div>

            {/* Broadcast to Parent Email */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📧 Broadcast to Parent Email</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Email</label>
                  <input
                    type="email"
                    value={broadcastEmail}
                    onChange={(e) => setBroadcastEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Enter your message..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleBroadcastParent}
                  disabled={isSendingBroadcast}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {isSendingBroadcast ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecordsPage
