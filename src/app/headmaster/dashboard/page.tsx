'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User, Student } from '@/types'

export default function HeadmasterDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [school, setSchool] = useState<any>(null)
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalSubjects: 0,
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'attendance' | 'performance'>('overview')
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [classStudents, setClassStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || !['PRINCIPAL', 'HEAD_TEACHER'].includes(currentUser.role)) {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (currentUser.schoolId) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.schoolId)
          .single()

        setSchool(schoolData)

        const { data: classesData } = await supabase
          .from('class_arm_combos')
          .select('*')
          .eq('school_id', currentUser.schoolId)

        const { data: teachers } = await supabase
          .from('users')
          .select('id')
          .eq('school_id', currentUser.schoolId)
          .eq('role', 'TEACHER')

        const { data: students } = await supabase
          .from('users')
          .select('id')
          .eq('school_id', currentUser.schoolId)
          .eq('role', 'STUDENT')

        const { data: subjects } = await supabase
          .from('subjects')
          .select('id')
          .eq('school_id', currentUser.schoolId)

        setStats({
          totalClasses: classesData?.length || 0,
          totalTeachers: teachers?.length || 0,
          totalStudents: students?.length || 0,
          totalSubjects: subjects?.length || 0,
        })

        setClasses(classesData || [])
      }
    } catch (error) {
      console.error('Load data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadClassStudents = async (classId: string) => {
    setLoadingStudents(true)
    try {
      const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('class_arm_combo_id', classId)

      setClassStudents(students || [])
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      router.push('/landing')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-500 border-t-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {school?.logo_url && (
              <img src={school.logo_url} alt={school.name} className="h-12 w-12 rounded-full" />
            )}
            <div>
              <h1 className="text-3xl font-bold">📚 Headmaster Dashboard</h1>
              <p className="text-indigo-100 mt-1">{school?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClasses}</p>
              </div>
              <span className="text-3xl">🏫</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Subjects</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSubjects}</p>
              </div>
              <span className="text-3xl">📖</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Teachers</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTeachers}</p>
              </div>
              <span className="text-3xl">👨‍🏫</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</p>
              </div>
              <span className="text-3xl">👨‍🎓</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="flex gap-4 p-4 border-b flex-wrap">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('academics')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'academics'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎓 Academic Overview
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'attendance'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📍 Attendance Tracking
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'performance'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⭐ Performance
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-6">
                  <p className="text-sm text-blue-600 font-semibold mb-2">School Health</p>
                  <p className="text-2xl font-bold text-blue-900">Excellent</p>
                </div>
                <div className="bg-green-50 rounded-lg p-6">
                  <p className="text-sm text-green-600 font-semibold mb-2">Operational Status</p>
                  <p className="text-2xl font-bold text-green-900">Active</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-6">
                  <p className="text-sm text-purple-600 font-semibold mb-2">Current Term</p>
                  <p className="text-2xl font-bold text-purple-900">Term 1</p>
                </div>
              </div>
            </div>
          )}

          {/* Academic Overview Tab */}
          {activeTab === 'academics' && (
            <div className="p-8">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                <select
                  value={selectedClass || ''}
                  onChange={(e) => {
                    setSelectedClass(e.target.value)
                    if (e.target.value) loadClassStudents(e.target.value)
                  }}
                  className="w-full md:w-1/3 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose a class...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Class {cls.id}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClass && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Class Students</h3>
                  {loadingStudents ? (
                    <p className="text-gray-600">Loading...</p>
                  ) : classStudents.length === 0 ? (
                    <p className="text-gray-600">No students in this class</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-900">Name</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-900">Admission #</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-900">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classStudents.map((student) => (
                            <tr key={student.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2">{student.id}</td>
                              <td className="px-4 py-2">{student.admission_number}</td>
                              <td className="px-4 py-2">
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Active</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Attendance Tracking Tab */}
          {activeTab === 'attendance' && (
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-semibold">Present</p>
                  <p className="text-2xl font-bold text-green-900 mt-2">85%</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-600 font-semibold">Absent</p>
                  <p className="text-2xl font-bold text-red-900 mt-2">10%</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-600 font-semibold">Late</p>
                  <p className="text-2xl font-bold text-yellow-900 mt-2">3%</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-semibold">Excused</p>
                  <p className="text-2xl font-bold text-blue-900 mt-2">2%</p>
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-lg">
                  <p className="text-sm text-green-700 font-semibold mb-2">Excellent Performance</p>
                  <p className="text-3xl font-bold text-green-900">45</p>
                  <p className="text-xs text-green-600 mt-2">Students</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 p-6 rounded-lg">
                  <p className="text-sm text-yellow-700 font-semibold mb-2">Average Performance</p>
                  <p className="text-3xl font-bold text-yellow-900">32</p>
                  <p className="text-xs text-yellow-600 mt-2">Students</p>
                </div>
                <div className="bg-gradient-to-br from-red-100 to-red-50 p-6 rounded-lg">
                  <p className="text-sm text-red-700 font-semibold mb-2">Needs Improvement</p>
                  <p className="text-3xl font-bold text-red-900">8</p>
                  <p className="text-xs text-red-600 mt-2">Students</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg shadow-lg p-8 text-white">
          <h3 className="text-2xl font-bold mb-2">Welcome, {user.full_name}!</h3>
          <p className="text-indigo-100">
            As Headmaster, you have full oversight of academic operations. Monitor class performance, attendance, and teacher effectiveness from this dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}
