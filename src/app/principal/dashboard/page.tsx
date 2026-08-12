'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User, Student } from '@/types'

export default function PrincipalDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [school, setSchool] = useState<any>(null)
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalStaff: 0,
    totalClasses: 0,
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'lesson-notes' | 'students'>('overview')
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [classStudents, setClassStudents] = useState<Student[]>([])
  const [lessonNotes, setLessonNotes] = useState<any[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'dark') setDarkMode(true)
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      // Verify user is Principal or Head Teacher
      if (!currentUser || !['PRINCIPAL', 'HEAD_TEACHER'].includes(currentUser.role)) {
        console.log('❌ User role:', currentUser?.role)
        router.push('/landing')
        return
      }

      setUser(currentUser)

      // Load school data
      if (currentUser.schoolId) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.schoolId)
          .single()

        setSchool(schoolData)

        // Load statistics
        const { data: students } = await supabase
          .from('users')
          .select('id')
          .eq('school_id', currentUser.schoolId)
          .eq('role', 'STUDENT')

        const { data: teachers } = await supabase
          .from('users')
          .select('id')
          .eq('school_id', currentUser.schoolId)
          .in('role', ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL'])

        const { data: staff } = await supabase
          .from('users')
          .select('id')
          .eq('school_id', currentUser.schoolId)
          .in('role', ['ACCOUNTANT', 'STAFF'])

        const { data: classesData } = await supabase
          .from('class_arm_combos')
          .select('*')
          .eq('school_id', currentUser.schoolId)

        // Load lesson notes
        const { data: notesData } = await supabase
          .from('lesson_notes')
          .select('*')
          .eq('school_id', currentUser.schoolId)
          .order('uploaded_at', { ascending: false })

        setStats({
          totalStudents: students?.length || 0,
          totalTeachers: teachers?.length || 0,
          totalStaff: staff?.length || 0,
          totalClasses: classesData?.length || 0,
        })

        setClasses(classesData || [])
        setLessonNotes(notesData || [])
      }
    } catch (error: any) {
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

  const handleClassSelect = (classId: string) => {
    setSelectedClass(classId)
    loadClassStudents(classId)
  }

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      router.push('/landing')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const bgClass = darkMode
    ? 'from-slate-950 via-purple-900 to-slate-900'
    : 'from-blue-50 via-purple-50 to-indigo-100'
  const cardClass = darkMode
    ? 'bg-slate-800/80 backdrop-blur border-slate-700/50'
    : 'bg-white/90 backdrop-blur border-purple-200/50'
  const textClass = darkMode ? 'text-white' : 'text-gray-900'

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgClass} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-pink-500 mx-auto mb-4"></div>
          <p className={textClass}>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgClass} transition-all duration-300`}>
      {/* Header */}
      <div className={`${cardClass} border-b shadow-2xl`}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {school?.logo_url && (
              <img src={school.logo_url} alt={school.name} className="h-12 w-12 rounded-full" />
            )}
            <div>
              <h1 className={`text-4xl font-black bg-gradient-to-r ${darkMode ? 'from-purple-400 to-pink-400' : 'from-blue-600 to-purple-600'} bg-clip-text text-transparent`}>
                👨‍💼 Principal Dashboard
              </h1>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{school?.name}</p>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                darkMode
                  ? 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30'
                  : 'bg-blue-200/50 text-blue-700 hover:bg-blue-300/50'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Students', value: stats.totalStudents, icon: '👨‍🎓', color: 'from-blue-500 to-blue-600' },
            { label: 'Total Teachers', value: stats.totalTeachers, icon: '👨‍🏫', color: 'from-green-500 to-green-600' },
            { label: 'Total Staff', value: stats.totalStaff, icon: '👤', color: 'from-purple-500 to-purple-600' },
            { label: 'Total Classes', value: stats.totalClasses, icon: '🏫', color: 'from-orange-500 to-orange-600' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className={`${cardClass} border rounded-lg shadow-xl p-6 transform hover:scale-105 transition-all`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{stat.label}</p>
                  <p className={`text-3xl font-bold ${textClass} mt-2`}>{stat.value}</p>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className={`${cardClass} border rounded-lg shadow-xl mb-8`}>
          <div className="flex gap-4 p-4 border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('lesson-notes')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'lesson-notes'
                  ? 'bg-blue-600 text-white'
                  : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📝 Lesson Notes
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'students'
                  ? 'bg-blue-600 text-white'
                  : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👨‍🎓 Students by Class
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-lg p-6`}>
                  <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-600'} font-semibold mb-2`}>Recent Activities</p>
                  <p className={`text-2xl font-bold ${textClass}`}>12</p>
                </div>
                <div className={`${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded-lg p-6`}>
                  <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-600'} font-semibold mb-2`}>Pending Approvals</p>
                  <p className={`text-2xl font-bold ${textClass}`}>3</p>
                </div>
                <div className={`${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'} rounded-lg p-6`}>
                  <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-600'} font-semibold mb-2`}>Lesson Notes</p>
                  <p className={`text-2xl font-bold ${textClass}`}>{lessonNotes.length}</p>
                </div>
                <div className={`${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded-lg p-6`}>
                  <p className={`text-sm ${darkMode ? 'text-orange-300' : 'text-orange-600'} font-semibold mb-2`}>Classes</p>
                  <p className={`text-2xl font-bold ${textClass}`}>{classes.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* Lesson Notes Tab */}
          {activeTab === 'lesson-notes' && (
            <div className="p-8">
              {lessonNotes.length === 0 ? (
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No lesson notes uploaded yet</p>
              ) : (
                <div className="space-y-4">
                  {lessonNotes.map((note) => (
                    <div key={note.id} className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} p-4 rounded-lg`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`font-bold ${textClass}`}>{note.title}</h4>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                            Subject: {note.subject_id} | Class: {note.class_arm_combo_id}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                            {new Date(note.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                        <a
                          href={note.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className="p-8">
              <div className="mb-6">
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Select Class</label>
                <select
                  value={selectedClass || ''}
                  onChange={(e) => handleClassSelect(e.target.value)}
                  className={`w-full md:w-1/3 px-4 py-2 rounded-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">Choose a class...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Class {cls.id} - {cls.class_id}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClass && (
                loadingStudents ? (
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading students...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className={`w-full ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      <thead>
                        <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                          <th className="px-4 py-2 text-left font-bold">Name</th>
                          <th className="px-4 py-2 text-left font-bold">Admission #</th>
                          <th className="px-4 py-2 text-left font-bold">Email</th>
                          <th className="px-4 py-2 text-left font-bold">Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-4 text-center">No students in this class</td>
                          </tr>
                        ) : (
                          classStudents.map((student) => (
                            <tr key={student.id} className={darkMode ? 'border-b border-gray-600' : 'border-b'}>
                              <td className="px-4 py-2">{student.id}</td>
                              <td className="px-4 py-2">{student.admission_number}</td>
                              <td className="px-4 py-2">-</td>
                              <td className="px-4 py-2">-</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Welcome Message */}
        <div className={`${cardClass} border rounded-lg shadow-xl p-8`}>
          <h2 className={`text-2xl font-bold mb-4 ${textClass}`}>👋 Welcome, {user?.full_name}!</h2>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            You are logged in as a <strong>{user?.role}</strong>. Use the tabs above to manage your school operations.
          </p>
        </div>
      </div>
    </div>
  )
}
