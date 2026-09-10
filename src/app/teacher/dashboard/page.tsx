'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { AuthService } from '@/services/auth.service'
import { TeacherContextService, TeacherContext } from '@/services/teacher-context.service'
import TeacherDataService, { ClassStudentData, SubjectStudentData } from '@/services/teacher-data.service'
import BroadcastInbox from '@/components/BroadcastInbox'
import EnhancedHeader from '@/components/EnhancedHeader'

interface DashboardStats {
  classStudentCount: number
  subjectStudentCount: number
  totalStudents: number
  classesManaged: number
  subjectsTaught: number
}

export default function TeacherDashboard() {
  const router = useRouter()
  const [context, setContext] = useState<TeacherContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    classStudentCount: 0,
    subjectStudentCount: 0,
    totalStudents: 0,
    classesManaged: 0,
    subjectsTaught: 0,
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'subjects' | 'students' | 'cbt'>('overview')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [filteredClassStudents, setFilteredClassStudents] = useState<ClassStudentData[]>([])
  const [filteredSubjectStudents, setFilteredSubjectStudents] = useState<SubjectStudentData[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [unreadBroadcasts, setUnreadBroadcasts] = useState(0)
  const [user, setUser] = useState<any>(null)

  // Load dashboard data once on mount
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        setError(null)

        const currentUser = await AuthService.getCurrentUser()
        setUser(currentUser)

        const teacherContext = await TeacherContextService.getCurrentTeacherContext()
        setContext(teacherContext)

        setStats({
          classesManaged: teacherContext.managedClasses.length,
          subjectsTaught: teacherContext.taughtSubjects.length,
          classStudentCount: teacherContext.classStudentCount,
          subjectStudentCount: teacherContext.subjectStudentCount,
          totalStudents: teacherContext.totalStudents,
        })
      } catch (err: any) {
        console.error('[Dashboard] Error loading context:', err)
        setError(err.message || 'Failed to load teacher context')
        // Don't redirect - let user see the error first
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  // Fetch class students when class selection changes
  useEffect(() => {
    const fetchClassStudents = async () => {
      if (!context || !selectedClass) {
        setFilteredClassStudents([])
        return
      }

      try {
        setLoadingStudents(true)
        const students = await TeacherDataService.getClassStudents(context.schoolId, selectedClass)
        setFilteredClassStudents(students)
      } catch (err: any) {
        console.error('[Dashboard] Error loading class students:', err)
        setError(err.message)
        setFilteredClassStudents([])
      } finally {
        setLoadingStudents(false)
      }
    }

    fetchClassStudents()
  }, [selectedClass, context])

  // Fetch subject students when subject selection changes
  useEffect(() => {
    const fetchSubjectStudents = async () => {
      if (!context || !selectedSubject) {
        setFilteredSubjectStudents([])
        return
      }

      try {
        setLoadingStudents(true)
        const students = await TeacherDataService.getSubjectStudents(context.schoolId, selectedSubject)
        setFilteredSubjectStudents(students)
      } catch (err: any) {
        console.error('[Dashboard] Error loading subject students:', err)
        setError(err.message)
        setFilteredSubjectStudents([])
      } finally {
        setLoadingStudents(false)
      }
    }

    fetchSubjectStudents()
  }, [selectedSubject, context])

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

  if (error && !context) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => router.push('/auth/teacher/login')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  if (!context) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load teacher context</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-green-50 to-blue-50 pb-20 md:pb-0">
      {/* Professional Header with Staff Name, School, and Notifications */}
      <EnhancedHeader
        staffName={context.teacherName}
        schoolName={context.schoolName}
        staffPhoto={context.teacherPhoto}
        section={context.section}
        userRole="Teacher"
      />

      {/* Main Content */}
      {error && (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-xs sm:text-sm text-yellow-800">⚠️ {error}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Statistics - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-3 sm:p-6">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm font-medium">My Classes</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.classesManaged}</p>
              </div>
              <span className="text-xl sm:text-3xl flex-shrink-0">🏫</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-3 sm:p-6">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm font-medium">My Subjects</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.subjectsTaught}</p>
              </div>
              <span className="text-xl sm:text-3xl flex-shrink-0">📖</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-3 sm:p-6">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Class Students</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.classStudentCount}</p>
              </div>
              <span className="text-xl sm:text-3xl flex-shrink-0">👥</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-3 sm:p-6">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Subject Students</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.subjectStudentCount}</p>
              </div>
              <span className="text-xl sm:text-3xl flex-shrink-0">📚</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-3 sm:p-6">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Students</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.totalStudents}</p>
              </div>
              <span className="text-xl sm:text-3xl flex-shrink-0">👨‍🎓</span>
            </div>
          </div>
        </div>

        {/* Quick Actions - Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <button onClick={() => router.push('/teacher/attendance')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 sm:py-3 px-2 sm:px-6 rounded-lg transition shadow-lg text-sm sm:text-base">
            📍 Attendance
          </button>
          <button onClick={() => router.push('/teacher/score-sheet')} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 sm:py-3 px-2 sm:px-6 rounded-lg transition shadow-lg text-sm sm:text-base">
            📊 Score Sheet
          </button>
          <button onClick={() => router.push('/teacher/results')} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 sm:py-3 px-2 sm:px-6 rounded-lg transition shadow-lg text-sm sm:text-base">
            📋 Results
          </button>
          <button onClick={() => router.push('/teacher/cbt-management')} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 sm:py-3 px-2 sm:px-6 rounded-lg transition shadow-lg text-sm sm:text-base">
            🧪 CBT
          </button>
          <button onClick={() => router.push('/teacher/student-management')} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 sm:py-3 px-2 sm:px-6 rounded-lg transition shadow-lg text-sm sm:text-base">
            👥 Students
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
          <div className="flex gap-2 sm:gap-4 p-2 sm:p-4 border-b flex-wrap overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 sm:px-6 py-2 rounded-lg font-semibold transition-all whitespace-nowrap text-xs sm:text-base ${
                activeTab === 'overview' ? 'bg-green-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`px-3 sm:px-6 py-2 rounded-lg font-semibold transition-all whitespace-nowrap text-xs sm:text-base ${
                activeTab === 'classes' ? 'bg-green-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏫 My Classes ({context.managedClasses.length})
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-3 sm:px-6 py-2 rounded-lg font-semibold transition-all whitespace-nowrap text-xs sm:text-base ${
                activeTab === 'subjects' ? 'bg-green-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📖 My Subjects ({context.taughtSubjects.length})
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-3 sm:px-6 py-2 rounded-lg font-semibold transition-all whitespace-nowrap text-xs sm:text-base ${
                activeTab === 'students' ? 'bg-green-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👥 Students ({stats.totalStudents})
            </button>
            <button
              onClick={() => setActiveTab('cbt')}
              className={`px-3 sm:px-6 py-2 rounded-lg font-semibold transition-all whitespace-nowrap text-xs sm:text-base ${
                activeTab === 'cbt' ? 'bg-green-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🧪 CBT Management
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-4 sm:p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-3">📍 Attendance</h4>
                  <p className="text-gray-600 mb-4">Mark daily attendance for your classes</p>
                  <button onClick={() => router.push('/teacher/attendance')} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">
                    Go to Attendance
                  </button>
                </div>
                <div className="bg-amber-50 p-6 rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-3">📊 Score Sheet</h4>
                  <p className="text-gray-600 mb-4">Enter test and exam scores in Excel-like format</p>
                  <button onClick={() => router.push('/teacher/score-sheet')} className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded">
                    Go to Score Sheet
                  </button>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-3">📋 Results</h4>
                  <p className="text-gray-600 mb-4">View and share student result cards</p>
                  <button onClick={() => router.push('/teacher/results')} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded">
                    Go to Results
                  </button>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-3">🧪 CBT Exams</h4>
                  <p className="text-gray-600 mb-4">
                    Create and manage computer-based tests for your classes/subjects
                  </p>
                  <button onClick={() => router.push('/teacher/cbt-management')} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded">
                    Create CBT
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* My Classes Tab */}
          {activeTab === 'classes' && (
            <div className="p-8">
              {context.managedClasses.length === 0 ? (
                <p className="text-gray-600">No classes assigned</p>
              ) : (
                <div className="space-y-4">
                  {context.managedClasses.map((cls) => (
                    <div key={cls.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900">
                            {cls.name} - {cls.armName}
                          </h4>
                          <p className="text-sm text-gray-600">Level: {cls.level}</p>
                        </div>
                        <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold">
                          View Class Details
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
              {context.taughtSubjects.length === 0 ? (
                <p className="text-gray-600">No subjects assigned</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {context.taughtSubjects.map((subject) => (
                    <div key={subject.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                      <h4 className="font-bold text-gray-900">{subject.name}</h4>
                      <p className="text-sm text-gray-600">Code: {subject.code}</p>
                      <p className="text-sm text-gray-600 mt-2">
                        Classes: {subject.classes?.map((c) => c.name).join(', ')}
                      </p>
                      <button className="mt-3 w-full px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded font-semibold">
                        View Subject Details
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className="p-8">
              <div className="space-y-8">
                {/* Class Students Section */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">👥 Class Students (As Class Teacher)</h3>

                  {context?.managedClasses && context.managedClasses.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-gray-700 font-semibold mb-2">Filter by Class:</label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg w-full md:w-64"
                      >
                        <option value="">All Classes</option>
                        {context.managedClasses.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name} - {cls.armName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {loadingStudents && selectedClass && (
                    <p className="text-gray-600">Loading students...</p>
                  )}

                  {!loadingStudents && filteredClassStudents.length === 0 && selectedClass && (
                    <p className="text-gray-600">No students in this class</p>
                  )}

                  {filteredClassStudents.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left">Name</th>
                            <th className="px-4 py-2 text-left">Admission #</th>
                            <th className="px-4 py-2 text-left">Subjects</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredClassStudents.map((student) => (
                            <tr key={student.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2 font-semibold">{student.name}</td>
                              <td className="px-4 py-2">{student.admissionNumber}</td>
                              <td className="px-4 py-2 text-sm">
                                {student.subjects?.map((s) => s.name).join(', ') || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Subject Students Section */}
                <div className="border-t pt-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">📚 Subject Students (As Subject Teacher)</h3>

                  {context?.taughtSubjects && context.taughtSubjects.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-gray-700 font-semibold mb-2">Filter by Subject:</label>
                      <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg w-full md:w-64"
                      >
                        <option value="">All Subjects</option>
                        {context.taughtSubjects.map((subj) => (
                          <option key={subj.subject_id} value={subj.subject_id}>
                            {subj.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {loadingStudents && selectedSubject && (
                    <p className="text-gray-600">Loading students...</p>
                  )}

                  {!loadingStudents && filteredSubjectStudents.length === 0 && selectedSubject && (
                    <p className="text-gray-600">No students taking this subject</p>
                  )}

                  {filteredSubjectStudents.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left">Name</th>
                            <th className="px-4 py-2 text-left">Admission #</th>
                            <th className="px-4 py-2 text-left">Class</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSubjectStudents.map((student) => (
                            <tr key={student.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2 font-semibold">{student.name}</td>
                              <td className="px-4 py-2">{student.admissionNumber}</td>
                              <td className="px-4 py-2 text-sm">{student.classDisplayName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CBT Management Tab */}
          {activeTab === 'cbt' && (
            <div className="p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6">CBT Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                  <h4 className="font-bold text-gray-900 mb-3">🆕 Create New CBT</h4>
                  <p className="text-gray-600 mb-4">Create a new computer-based test for your students</p>
                  <Link href="/teacher/cbt-management">
                    <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-semibold">
                      Create Test
                    </button>
                  </Link>
                </div>
                <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                  <h4 className="font-bold text-gray-900 mb-3">📋 My CBTs</h4>
                  <p className="text-gray-600 mb-4">View and manage all CBTs you have created</p>
                  <Link href="/teacher/cbt-management">
                    <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded font-semibold">
                      View CBTs
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg shadow-lg p-8 text-white">
          <h3 className="text-2xl font-bold mb-2">Welcome, {context?.teacherName || 'Teacher'}!</h3>
          <p className="text-green-100">
            Manage your classes, mark attendance, enter results, create CBT exams, and view your students across both
            class and subject teaching roles.
          </p>
        </div>
      </div>
    </div>
  )
}
