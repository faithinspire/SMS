'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User, Student } from '@/types'
import Link from 'next/link'

interface Assignment {
  id: string
  title: string
  subject: string
  class: string
  due_date: string
  submissions: number
}

export default function TeacherDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [school, setSchool] = useState<any>(null)
  const [stats, setStats] = useState({
    myClasses: 0,
    mySubjects: 0,
    totalStudents: 0,
    pendingAssignments: 0,
  })
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [classStudents, setClassStudents] = useState<Student[]>([])
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'subjects' | 'attendance' | 'results'>('overview')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'TEACHER') {
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

        // Load teacher's classes
        const { data: classesData } = await supabase
          .from('class_arm_combos')
          .select('*')
          .eq('school_id', currentUser.schoolId)
          .eq('class_teacher_id', currentUser.id)

        // Load teacher's subjects
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('*')
          .eq('school_id', currentUser.schoolId)

        // Load students assigned to teacher
        const { data: students } = await supabase
          .from('students')
          .select('*')
          .eq('school_id', currentUser.schoolId)

        setClasses(classesData || [])
        setSubjects(subjectsData || [])
        
        setStats({
          myClasses: classesData?.length || 0,
          mySubjects: subjectsData?.length || 0,
          totalStudents: students?.length || 0,
          pendingAssignments: 0,
        })

        // Set default selected class
        if (classesData && classesData.length > 0) {
          setSelectedClass(classesData[0].id)
          await loadClassStudents(classesData[0].id)
        }
      }
    } catch (error) {
      console.error('Load data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadClassStudents = async (classId: string) => {
    try {
      const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('class_arm_combo_id', classId)

      setClassStudents(students || [])
    } catch (error) {
      console.error('Error loading students:', error)
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-blue-500 mx-auto mb-4"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {school?.logo_url && (
              <img src={school.logo_url} alt={school.name} className="h-12 w-12 rounded-full" />
            )}
            <div>
              <h1 className="text-3xl font-bold">👨‍🏫 Teacher Dashboard</h1>
              <p className="text-green-100 mt-1">{school?.name}</p>
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
                <p className="text-gray-600 text-sm font-medium">My Classes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.myClasses}</p>
              </div>
              <span className="text-3xl">🏫</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">My Subjects</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.mySubjects}</p>
              </div>
              <span className="text-3xl">📖</span>
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

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingAssignments}</p>
              </div>
              <span className="text-3xl">📋</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/teacher/attendance">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg">
              📍 Mark Attendance
            </button>
          </Link>
          <Link href="/teacher/results">
            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg">
              📊 Enter Results
            </button>
          </Link>
          <Link href="/teacher/assignments">
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg">
              📝 Assignments
            </button>
          </Link>
          <Link href="/teacher/lessons">
            <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg">
              📚 Lesson Notes
            </button>
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="flex gap-4 p-4 border-b flex-wrap">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'classes'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏫 My Classes
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'subjects'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📖 My Subjects
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'attendance'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📍 Attendance
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'results'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⭐ Results
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activities</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <p className="font-semibold text-gray-900">Attendance Marked</p>
                  <p className="text-sm text-gray-600">Class JSS 1A - Today</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="font-semibold text-gray-900">Results Entered</p>
                  <p className="text-sm text-gray-600">English - JSS 1B - Yesterday</p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4 py-2">
                  <p className="font-semibold text-gray-900">Assignment Given</p>
                  <p className="text-sm text-gray-600">Mathematics Exercise 5 - 2 days ago</p>
                </div>
              </div>
            </div>
          )}

          {/* My Classes Tab */}
          {activeTab === 'classes' && (
            <div className="p-8">
              {classes.length === 0 ? (
                <p className="text-gray-600">No classes assigned</p>
              ) : (
                <div className="space-y-4">
                  {classes.map((cls) => (
                    <div key={cls.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900">Class {cls.class_id}</h4>
                          <p className="text-sm text-gray-600">Arm: {cls.arm_id}</p>
                        </div>
                        <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold">
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Subjects Tab */}
          {activeTab === 'subjects' && (
            <div className="p-8">
              {subjects.length === 0 ? (
                <p className="text-gray-600">No subjects assigned</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                      <h4 className="font-bold text-gray-900">{subject.name}</h4>
                      <p className="text-sm text-gray-600">Code: {subject.code}</p>
                      <p className="text-sm text-gray-600 mt-2">For levels: {subject.applicable_to_levels?.join(', ')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="p-8">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                <select
                  value={selectedClass || ''}
                  onChange={(e) => {
                    setSelectedClass(e.target.value)
                    if (e.target.value) loadClassStudents(e.target.value)
                  }}
                  className="w-full md:w-1/3 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Choose a class...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Class {cls.class_id}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClass && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Mark Attendance</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Name</th>
                          <th className="px-4 py-2 text-left font-semibold">Present</th>
                          <th className="px-4 py-2 text-left font-semibold">Absent</th>
                          <th className="px-4 py-2 text-left font-semibold">Late</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map((student) => (
                          <tr key={student.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">{student.id}</td>
                            <td className="px-4 py-2">
                              <input type="radio" name={`attendance-${student.id}`} />
                            </td>
                            <td className="px-4 py-2">
                              <input type="radio" name={`attendance-${student.id}`} />
                            </td>
                            <td className="px-4 py-2">
                              <input type="radio" name={`attendance-${student.id}`} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Grades Entered</h3>
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold text-gray-900">English - JSS 1B</p>
                  <p className="text-sm text-gray-600">32 students graded - 2 days ago</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold text-gray-900">Mathematics - JSS 1A</p>
                  <p className="text-sm text-gray-600">28 students graded - 5 days ago</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg shadow-lg p-8 text-white">
          <h3 className="text-2xl font-bold mb-2">Welcome, {user.full_name}!</h3>
          <p className="text-green-100">
            Manage your classes, mark attendance, enter results, and upload lesson notes. Everything you need for effective classroom management is here.
          </p>
        </div>
      </div>
    </div>
  )
}
