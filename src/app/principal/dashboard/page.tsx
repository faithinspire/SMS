'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'
import StaffHeader from '@/components/StaffHeader'
import toast from 'react-hot-toast'

interface StaffMember {
  id: string
  full_name: string
  role: string
  position?: string
}

interface ClassInfo {
  id: string
  class_name: string
  class_level: string
  arm_name: string
  total_students: number
  class_teacher: string
  class_teacher_id?: string
}

interface AcademicMetrics {
  avg_performance: number
  attendance_rate: number
  pass_rate: number
  students_needing_support: number
}

export default function PrincipalDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Dashboard state
  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'staffing' | 'students' | 'reports'>('overview')
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalStaff: 0,
    totalClasses: 0,
  })

  // Academic Overview
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [classDetails, setClassDetails] = useState<any>(null)
  const [metrics, setMetrics] = useState<AcademicMetrics>({
    avg_performance: 0,
    attendance_rate: 0,
    pass_rate: 0,
    students_needing_support: 0,
  })

  // Staff Management
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [principals, setPrincipals] = useState<StaffMember[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      // Verify authorization
      if (!currentUser || !['PRINCIPAL', 'HEAD_TEACHER'].includes(currentUser.role)) {
        toast.error('Unauthorized access')
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (!currentUser.school_id) {
        toast.error('School information not found')
        return
      }

      // Load school data
      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      setSchool(schoolData)

      // Load statistics
      const { count: studentCount } = await supabase
        .from('students')
        .select('id', { count: 'exact' })
        .eq('school_id', currentUser.school_id)

      const { count: teacherCount } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('school_id', currentUser.school_id)
        .eq('role', 'TEACHER')

      const { count: staffCount } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('school_id', currentUser.school_id)
        .in('role', ['ACCOUNTANT', 'STAFF'])

      const { count: classCount } = await supabase
        .from('class_arm_combos')
        .select('id', { count: 'exact' })
        .eq('school_id', currentUser.school_id)

      setStats({
        totalStudents: studentCount || 0,
        totalTeachers: teacherCount || 0,
        totalStaff: staffCount || 0,
        totalClasses: classCount || 0,
      })

      // Load classes with proper names
      await loadClasses(currentUser.school_id)

      // Load staff including principals
      await loadStaff(currentUser.school_id)
    } catch (error) {
      console.error('Dashboard load error:', error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadClasses = async (schoolId: string) => {
    try {
      const { data: classesData, error } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          class_id,
          arm_id,
          class_teacher_id,
          class:class_id (id, name, level),
          arm:arm_id (id, name),
          class_teacher:class_teacher_id (full_name)
        `)
        .eq('school_id', schoolId)
        .order('class_id', { ascending: true })

      if (error) {
        console.error('Error loading classes:', error)
        return
      }

      // Count students per class
      const classesWithStudents = await Promise.all(
        (classesData || []).map(async (classCombo: any) => {
          const { count: studentCount } = await supabase
            .from('students')
            .select('id', { count: 'exact' })
            .eq('class_arm_combo_id', classCombo.id)

          return {
            id: classCombo.id,
            class_name: classCombo.class?.name || 'Unknown',
            class_level: classCombo.class?.level || 0,
            arm_name: classCombo.arm?.name || '',
            total_students: studentCount || 0,
            class_teacher: classCombo.class_teacher?.full_name || 'Unassigned',
            class_teacher_id: classCombo.class_teacher_id,
          }
        })
      )

      setClasses(classesWithStudents)
    } catch (error) {
      console.error('Error loading classes with students:', error)
    }
  }

  const loadStaff = async (schoolId: string) => {
    try {
      // Load all staff
      const { data: allStaff } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('school_id', schoolId)
        .in('role', ['PRINCIPAL', 'HEAD_TEACHER', 'TEACHER', 'ACCOUNTANT', 'STAFF'])

      // Separate principals and head teachers
      const principalsAndHeads = allStaff?.filter((staff: any) =>
        ['PRINCIPAL', 'HEAD_TEACHER'].includes(staff.role)
      ) || []

      setPrincipals(principalsAndHeads)
      setStaffList(allStaff || [])
    } catch (error) {
      console.error('Error loading staff:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      router.push('/landing')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Logout failed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Professional Staff Header */}
      <StaffHeader
        staffName={user?.full_name || 'Principal'}
        schoolName={school?.name || 'School'}
        section="Principal Dashboard"
      />

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('academics')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'academics'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📚 Academics
            </button>
            <button
              onClick={() => router.push('/principal/broadcasts')}
              className="px-4 py-2 rounded-lg font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 transition"
            >
              📢 Broadcasts
            </button>
            <button
              onClick={() => router.push('/principal/results')}
              className="px-4 py-2 rounded-lg font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
            >
              📊 Results
            </button>
            <button
              onClick={() => router.push('/principal/school-fees')}
              className="px-4 py-2 rounded-lg font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition"
            >
              💰 School Fees
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClasses}</p>
              </div>
              <span className="text-3xl">🏫</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</p>
              </div>
              <span className="text-3xl">👨‍🎓</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Teachers</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTeachers}</p>
              </div>
              <span className="text-3xl">👨‍🏫</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Staff</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStaff}</p>
              </div>
              <span className="text-3xl">👥</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="flex gap-2 p-4 border-b flex-wrap">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('academics')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'academics'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🎓 Academic Overview
            </button>
            <button
              onClick={() => setActiveTab('staffing')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'staffing'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              👥 Staffing
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'students'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📚 Students
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'reports'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📈 Reports
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
                    <p className="text-sm text-blue-700 font-semibold mb-2">School Status</p>
                    <p className="text-2xl font-bold text-blue-900">Active</p>
                    <p className="text-xs text-blue-600 mt-2">All systems operational</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-500">
                    <p className="text-sm text-green-700 font-semibold mb-2">Overall Performance</p>
                    <p className="text-2xl font-bold text-green-900">Excellent</p>
                    <p className="text-xs text-green-600 mt-2">Academic excellence maintained</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-6 border-l-4 border-purple-500">
                    <p className="text-sm text-purple-700 font-semibold mb-2">Attendance Rate</p>
                    <p className="text-2xl font-bold text-purple-900">92%</p>
                    <p className="text-xs text-purple-600 mt-2">Above national average</p>
                  </div>
                </div>

                {/* Leadership Team */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Leadership Team</h3>
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-200">
                    {principals.length > 0 ? (
                      <div className="space-y-3">
                        {principals.map((principal) => (
                          <div
                            key={principal.id}
                            className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm"
                          >
                            <div>
                              <p className="font-semibold text-gray-900">{principal.full_name}</p>
                              <p className="text-sm text-gray-600">{principal.role}</p>
                            </div>
                            <span className="text-2xl">👤</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No leadership team members assigned</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Academic Overview Tab */}
            {activeTab === 'academics' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Class to View Details
                  </label>
                  <select
                    value={selectedClass || ''}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Choose a class...</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.class_name} - {cls.arm_name} (Level {cls.class_level})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Classes Overview Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Class</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Arm</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-900">Students</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Class Teacher</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((cls) => (
                        <tr key={cls.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{cls.class_name}</td>
                          <td className="px-4 py-3 text-gray-600">{cls.arm_name}</td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-900">
                            {cls.total_students}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{cls.class_teacher}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Staffing Tab */}
            {activeTab === 'staffing' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Staff Directory</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {staffList.map((staff) => (
                    <div key={staff.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{staff.full_name}</p>
                          <p className="text-sm text-gray-600">{staff.role}</p>
                        </div>
                        <span className="text-2xl">👤</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
              <div>
                <p className="text-gray-600">Select a class in Academic Overview to view students</p>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="space-y-4">
                <p className="text-gray-700">Academic and performance reports will be generated here.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="p-4 border-2 border-dashed border-indigo-300 rounded-lg hover:bg-indigo-50 transition text-left">
                    <p className="font-semibold text-gray-900">Performance Report</p>
                    <p className="text-sm text-gray-600 mt-1">View overall school performance metrics</p>
                  </button>
                  <button className="p-4 border-2 border-dashed border-indigo-300 rounded-lg hover:bg-indigo-50 transition text-left">
                    <p className="font-semibold text-gray-900">Attendance Report</p>
                    <p className="text-sm text-gray-600 mt-1">Analyze attendance patterns</p>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
