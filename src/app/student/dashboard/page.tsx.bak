'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'
import DashboardHeader from '@/components/DashboardHeader'
import Link from 'next/link'

interface StudentProfile {
  id: string
  admission_number: string
  class_arm_combo_id?: string
  photo_url?: string
}

interface Grade {
  id: string
  subject: string
  test1?: number
  test2?: number
  test3?: number
  test4?: number
  exam?: number
  total?: number
  grade?: string
}

export default function StudentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [school, setSchool] = useState<any>(null)
  const [stats, setStats] = useState({
    myClasses: 0,
    mySubjects: 0,
    attendanceRate: 0,
    averageGrade: 0,
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'subjects' | 'performance' | 'attendance'>('overview')
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'STUDENT') {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      // Only proceed if we have school_id
      if (!currentUser.schoolId) {
        console.warn('No school_id for student')
        setError('Student profile incomplete - no school assigned')
        return
      }

      // Load school data
      try {
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('id, name, logo_url, type, status')
          .eq('id', currentUser.schoolId)
          .single()

        if (schoolError) {
          console.warn('School fetch error:', schoolError)
        } else {
          setSchool(schoolData)
        }
      } catch (err) {
        console.warn('School data fetch failed:', err)
      }

      // Load student profile
      let profileData = null
      try {
        const { data: profileResult, error: profileError } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', currentUser.id)
          .single()

        if (profileError) {
          console.warn('Student profile not found:', profileError)
        } else {
          profileData = profileResult
          setProfile(profileResult)
        }
      } catch (err) {
        console.warn('Student profile fetch failed:', err)
      }

      // Only load classes if we have profileData
      if (profileData?.class_arm_combo_id) {
        try {
          const { data: classesData, error: classError } = await supabase
            .from('class_arm_combos')
            .select('*')
            .eq('id', profileData.class_arm_combo_id)

          if (!classError) {
            setClasses(classesData || [])
          }
        } catch (err) {
          console.warn('Classes fetch failed:', err)
        }
      }

      // Only load subjects if we have profileData
      if (profileData?.id) {
        try {
          const { data: subjectsData, error: subjectsError } = await supabase
            .from('student_subjects')
            .select('*, subjects(*)')
            .eq('student_id', profileData.id)

          if (!subjectsError) {
            setSubjects(subjectsData || [])
            setStats(prev => ({ ...prev, mySubjects: subjectsData?.length || 0 }))
          }
        } catch (err) {
          console.warn('Subjects fetch failed:', err)
        }

        // Load grades
        try {
          const { data: gradesData, error: gradesError } = await supabase
            .from('score_sheets')
            .select('*')
            .eq('student_id', profileData.id)

          if (!gradesError && gradesData) {
            setGrades(gradesData)

            // Calculate average grade
            let totalGrade = 0
            let gradeCount = 0
            gradesData.forEach(grade => {
              if (grade.total) {
                totalGrade += grade.total
                gradeCount++
              }
            })

            setStats(prev => ({
              ...prev,
              averageGrade: gradeCount > 0 ? Math.round(totalGrade / gradeCount) : 0,
            }))
          }
        } catch (err) {
          console.warn('Grades fetch failed:', err)
        }

        // Load assignments
        try {
          const { data: assignmentsData, error: assignmentsError } = await supabase
            .from('assignments')
            .select('*')
            .eq('school_id', currentUser.schoolId)

          if (!assignmentsError) {
            setAssignments(assignmentsData || [])
          }
        } catch (err) {
          console.warn('Assignments fetch failed:', err)
        }
      }
    } catch (error) {
      console.error('Load data error:', error)
      setError('Failed to load student dashboard')
    } finally {
      setLoading(false)
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-500 border-t-purple-500 mx-auto mb-4"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {school?.logo_url && (
              <img src={school.logo_url} alt={school.name} className="h-12 w-12 rounded-full" />
            )}
            <div>
              <h1 className="text-3xl font-bold">👨‍🎓 Student Dashboard</h1>
              <p className="text-pink-100 mt-1">{school?.name}</p>
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
        {/* Student Profile Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center gap-4">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="Student" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-3xl">
                👨‍🎓
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
              <p className="text-gray-600">Admission #: {profile?.admission_number}</p>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
            </div>
          </div>
        </div>

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
                <p className="text-gray-600 text-sm font-medium">Attendance</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.attendanceRate}%</p>
              </div>
              <span className="text-3xl">📍</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Average Grade</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.averageGrade}%</p>
              </div>
              <span className="text-3xl">⭐</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/student/mark-sheet">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg">
              📊 View Results
            </button>
          </Link>
          <Link href="/student/cbt-portal">
            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg">
              🧪 CBT Portal
            </button>
          </Link>
          <Link href="/student/assignments">
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg">
              📝 Assignments
            </button>
          </Link>
          <Link href="/student/lessons">
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
                  ? 'bg-pink-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'classes'
                  ? 'bg-pink-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏫 My Classes
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'subjects'
                  ? 'bg-pink-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📖 My Subjects
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'performance'
                  ? 'bg-pink-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⭐ Performance
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'attendance'
                  ? 'bg-pink-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📍 Attendance
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Grades</h3>
              <div className="space-y-4">
                {grades.slice(0, 5).map((grade) => (
                  <div key={grade.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900">{grade.subject}</h4>
                        <p className="text-sm text-gray-600">Total: {grade.total} / 100</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full font-bold text-white ${
                        grade.total && grade.total >= 70 ? 'bg-green-600' :
                        grade.total && grade.total >= 50 ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}>
                        {grade.grade || 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classes Tab */}
          {activeTab === 'classes' && (
            <div className="p-8">
              {classes.length === 0 ? (
                <p className="text-gray-600">No classes assigned</p>
              ) : (
                <div className="space-y-4">
                  {classes.map((cls) => (
                    <div key={cls.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                      <h4 className="font-bold text-gray-900">Class {cls.class_id}</h4>
                      <p className="text-sm text-gray-600">Arm: {cls.arm_id}</p>
                      {cls.class_teacher_id && (
                        <p className="text-sm text-gray-600 mt-2">Class Teacher: {cls.class_teacher_id}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subjects Tab */}
          {activeTab === 'subjects' && (
            <div className="p-8">
              {subjects.length === 0 ? (
                <p className="text-gray-600">No subjects assigned</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                      <h4 className="font-bold text-gray-900">{subject.subject_id}</h4>
                      <p className="text-sm text-gray-600">Taken in</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-lg">
                  <h4 className="font-bold text-green-900 mb-4">Best Subjects</h4>
                  <div className="space-y-2">
                    {grades.filter(g => g.total && g.total >= 70).slice(0, 3).map((grade) => (
                      <div key={grade.id} className="flex justify-between">
                        <p className="text-green-900">{grade.subject}</p>
                        <p className="font-bold text-green-900">{grade.total}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-6 rounded-lg">
                  <h4 className="font-bold text-orange-900 mb-4">Needs Improvement</h4>
                  <div className="space-y-2">
                    {grades.filter(g => g.total && g.total < 50).slice(0, 3).map((grade) => (
                      <div key={grade.id} className="flex justify-between">
                        <p className="text-orange-900">{grade.subject}</p>
                        <p className="font-bold text-orange-900">{grade.total}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-6 rounded-lg">
                  <p className="text-sm text-green-600 font-semibold mb-2">Present</p>
                  <p className="text-3xl font-bold text-green-900">45</p>
                </div>
                <div className="bg-red-50 p-6 rounded-lg">
                  <p className="text-sm text-red-600 font-semibold mb-2">Absent</p>
                  <p className="text-3xl font-bold text-red-900">5</p>
                </div>
                <div className="bg-yellow-50 p-6 rounded-lg">
                  <p className="text-sm text-yellow-600 font-semibold mb-2">Late</p>
                  <p className="text-3xl font-bold text-yellow-900">2</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-lg">
                  <p className="text-sm text-blue-600 font-semibold mb-2">Attendance Rate</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.attendanceRate}%</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg shadow-lg p-8 text-white">
          <h3 className="text-2xl font-bold mb-2">Welcome, {user.full_name}!</h3>
          <p className="text-pink-100">
            Your dashboard provides everything you need to succeed academically. View your grades, track attendance, complete assignments, and access lesson notes from your teachers.
          </p>
        </div>
      </div>
    </div>
  )
}
