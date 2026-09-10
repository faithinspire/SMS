'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'
import StudentPhotoDisplay from '@/components/StudentPhotoDisplay'
import Link from 'next/link'

interface StudentProfile {
  id: string
  user_id: string
  admission_number: string
  class_arm_combo_id?: string
  photo_url?: string
}

interface ClassInfo {
  id: string
  class_name: string
  arm?: string
  form_level?: string
}

interface SubjectInfo {
  id: string
  subject_id: string
  subject?: {
    id: string
    name: string
  }
}

interface GradeInfo {
  id: string
  student_id: string
  subject_id: string
  subject_name?: string
  test_score?: number
  exam_score?: number
  total_score?: number
  grade?: string
  term?: string
}

export default function StudentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [school, setSchool] = useState<any>(null)
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [grades, setGrades] = useState<GradeInfo[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'subjects' | 'performance'>('overview')

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const currentUser = await AuthService.getCurrentUser()

        if (!currentUser || currentUser.role !== 'STUDENT') {
          router.push('/landing')
          return
        }

        setUser(currentUser)

        // Load school
        if (currentUser.school_id) {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('id, name, logo_url')
            .eq('id', currentUser.school_id)
            .single()
          setSchool(schoolData)
        }

        // Load student profile
        const { data: profileData } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', currentUser.id)
          .single()
        setProfile(profileData)

        // Load classes if student has class assignment
        if (profileData?.class_arm_combo_id) {
          const { data: classData } = await supabase
            .from('class_arm_combos')
            .select(`
              id,
              classes(id, name, level),
              arms(id, name)
            `)
            .eq('id', profileData.class_arm_combo_id)
            .maybeSingle()
          if (classData) {
            // Transform to expected format
            const transformedClass = {
              id: classData.id,
              class_name: classData.classes?.name || 'Unknown',
              arm: classData.arms?.name || 'Unknown',
              form_level: classData.classes?.level || 'Unknown'
            }
            setClasses([transformedClass])
          }
        }

        // Load subjects
        if (profileData?.id) {
          const { data: subjectsData } = await supabase
            .from('student_subjects')
            .select(`
              id,
              subject_id,
              subjects:subject_id (id, name)
            `)
            .eq('student_id', profileData.id)
          if (subjectsData) {
            setSubjects(subjectsData)
          } else {
            setSubjects([])
          }

          // Load grades/scores
          const { data: gradesData } = await supabase
            .from('score_sheets')
            .select('*')
            .eq('student_id', profileData.id)
          if (gradesData) {
            // Enhance with subject names
            const enhancedGrades = await Promise.all(
              gradesData.map(async (grade: any) => {
                if (!grade.subject_id) return grade
                const { data: subjectData } = await supabase
                  .from('subjects')
                  .select('name')
                  .eq('id', grade.subject_id)
                  .maybeSingle()
                
                // Calculate total and grade
                const test = grade.test_score || 0
                const exam = grade.exam_score || 0
                const total = test + exam
                let gradeChar = 'N/A'
                if (total >= 80) gradeChar = 'A'
                else if (total >= 70) gradeChar = 'B'
                else if (total >= 60) gradeChar = 'C'
                else if (total >= 50) gradeChar = 'D'
                else if (total >= 40) gradeChar = 'E'
                else if (total > 0) gradeChar = 'F'
                
                return {
                  ...grade,
                  subject_name: subjectData?.name || 'Unknown',
                  total_score: total,
                  grade: gradeChar,
                }
              })
            )
            setGrades(enhancedGrades)
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('Error loading data:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (profile?.photo_url) {
      // Photo already loaded
    }
  }, [profile?.photo_url])

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      // Photo upload moved to /student/profile
    },
    []
  )

  const handleLogout = async () => {
    await AuthService.logout()
    router.push('/auth/student/login')
  }

  // Calculate stats
  const statsData = {
    myClasses: classes.length,
    mySubjects: subjects.length,
    averageGrade: grades.length > 0 ? (grades.reduce((sum, g) => sum + (g.total_score || 0), 0) / grades.length).toFixed(1) : 0,
    attendanceRate: '-', // Would need attendance data
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 pb-24 md:pb-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex justify-between items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {school?.logo_url && (
              <img src={school.logo_url} alt={school.name} className="h-10 sm:h-12 w-10 sm:w-12 rounded-full flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold truncate">👨‍🎓 Dashboard</h1>
              <p className="text-xs sm:text-base text-pink-100 mt-0.5 sm:mt-1 truncate">{school?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 sm:px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition text-sm sm:text-base flex-shrink-0"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Student Profile Card */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col items-center md:flex-row md:items-start md:gap-6 mb-6">
            {/* Photo Section */}
            <div className="flex flex-col items-center md:items-start flex-shrink-0">
              <StudentPhotoDisplay
                photoUrl={profile?.photo_url}
                studentName={user.full_name}
                size="md"
              />
            </div>

            {/* Profile Info Section */}
            <div className="flex-1 text-center md:text-left w-full md:w-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{user.full_name}</h2>
              <p className="text-base sm:text-lg text-gray-600 mt-1 sm:mt-2">Admission #: {profile?.admission_number}</p>
              <p className="text-sm sm:text-base text-gray-500 break-all">{user.email}</p>
              {classes.length > 0 && (
                <p className="text-gray-600 mt-2 text-sm sm:text-base">
                  📚 Class: <span className="font-semibold">{classes[0]?.class_name}{classes[0]?.arm ? ` ${classes[0].arm}` : ''}</span>
                </p>
              )}
            </div>
          </div>

          {/* Profile Settings Link */}
          <div className="border-t pt-4 sm:pt-6 text-center">
            <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">👤 Update your photo or personal info?</p>
            <Link href="/student/profile">
              <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition text-sm sm:text-base">
                📸 Profile Settings
              </button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-3 sm:p-6">
            <p className="text-gray-600 text-xs sm:text-sm font-medium">📚 Classes</p>
            <p className="text-2xl sm:text-4xl font-bold text-blue-600 mt-1 sm:mt-2">{statsData.myClasses}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-6">
            <p className="text-gray-600 text-xs sm:text-sm font-medium">📖 Subjects</p>
            <p className="text-2xl sm:text-4xl font-bold text-green-600 mt-1 sm:mt-2">{statsData.mySubjects}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-6">
            <p className="text-gray-600 text-xs sm:text-sm font-medium">📊 Avg Score</p>
            <p className="text-2xl sm:text-4xl font-bold text-purple-600 mt-1 sm:mt-2">{statsData.averageGrade}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-6 text-center">
            <p className="text-gray-600 text-xs sm:text-sm font-medium">✏️ CBT</p>
            <Link href="/student/cbt" className="text-xl sm:text-3xl font-bold text-orange-600 mt-1 sm:mt-2 hover:underline block">
              Go
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Link
            href="/student/cbt"
            className="bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition"
          >
            <p className="text-xl sm:text-2xl mb-1 sm:mb-2">✏️ CBT Exam</p>
            <p className="text-xs sm:text-base text-orange-100">Take exams</p>
          </Link>
          <Link
            href="/student/results"
            className="bg-gradient-to-br from-green-400 to-green-600 text-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition"
          >
            <p className="text-xl sm:text-2xl mb-1 sm:mb-2">📈 Results</p>
            <p className="text-xs sm:text-base text-green-100">View scores</p>
          </Link>
          <Link
            href="/student/profile"
            className="bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition"
          >
            <p className="text-xl sm:text-2xl mb-1 sm:mb-2">👤 Profile</p>
            <p className="text-xs sm:text-base text-blue-100">Account info</p>
          </Link>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex">
              {(['overview', 'classes', 'subjects', 'performance'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 sm:px-6 py-3 sm:py-4 font-semibold text-center transition uppercase tracking-wide text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab
                      ? 'text-white bg-gradient-to-r from-pink-600 to-purple-600 border-b-4 border-white'
                      : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {tab === 'overview' && '📊'}
                  {tab === 'classes' && '🏫'}
                  {tab === 'subjects' && '📚'}
                  {tab === 'performance' && '🎯'}
                  <span className="hidden sm:inline ml-1">
                    {tab === 'overview' && 'Overview'}
                    {tab === 'classes' && 'Classes'}
                    {tab === 'subjects' && 'Subjects'}
                    {tab === 'performance' && 'Performance'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-3 sm:p-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">👋 Welcome Back!</h3>
                    <p className="text-blue-700">
                      You are enrolled in <strong>{statsData.myClasses}</strong> {statsData.myClasses === 1 ? 'class' : 'classes'} and studying <strong>{statsData.mySubjects}</strong> {statsData.mySubjects === 1 ? 'subject' : 'subjects'}.
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-500">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">🎓 Academic Performance</h3>
                    <p className="text-green-700">
                      Your average score: <strong>{statsData.averageGrade}</strong>
                      {grades.length > 0 && ` across ${grades.length} ${grades.length === 1 ? 'subject' : 'subjects'}`}
                    </p>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-6 border-l-4 border-purple-500">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4">📋 Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/student/cbt" className="block p-4 bg-white rounded-lg hover:shadow-md transition text-center">
                      <p className="text-2xl mb-2">✏️</p>
                      <p className="font-semibold text-gray-800">Take Exam</p>
                    </Link>
                    <Link href="/student/results" className="block p-4 bg-white rounded-lg hover:shadow-md transition text-center">
                      <p className="text-2xl mb-2">📈</p>
                      <p className="font-semibold text-gray-800">View Results</p>
                    </Link>
                    <Link href="/student/profile" className="block p-4 bg-white rounded-lg hover:shadow-md transition text-center">
                      <p className="text-2xl mb-2">👤</p>
                      <p className="font-semibold text-gray-800">My Profile</p>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Classes Tab */}
            {activeTab === 'classes' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">🏫 My Classes</h3>
                {classes.length > 0 ? (
                  <div className="space-y-4">
                    {classes.map((cls) => (
                      <div key={cls.id} className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-2xl font-bold text-gray-900">
                              {cls.class_name} {cls.arm ? `- ${cls.arm}` : ''}
                            </p>
                            {cls.form_level && (
                              <p className="text-gray-600 mt-2">Level: <span className="font-semibold">{cls.form_level}</span></p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">No class assignment found</p>
                  </div>
                )}
              </div>
            )}

            {/* Subjects Tab */}
            {activeTab === 'subjects' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">📚 My Subjects</h3>
                {subjects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.map((subj: any) => (
                      <div key={subj.id} className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                        <p className="text-lg font-semibold text-gray-900">
                          {subj.subjects?.name || subj.subject_id || 'Unknown Subject'}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">Subject ID: {subj.subject_id}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">No subjects enrolled</p>
                  </div>
                )}
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && (
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">🎯 Academic Performance</h3>
                {grades.length > 0 ? (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-800">Subject</th>
                          <th className="px-1 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-800">Test</th>
                          <th className="px-1 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-800">Exam</th>
                          <th className="px-1 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-800">Total</th>
                          <th className="px-1 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-800">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grades.map((grade) => (
                          <tr key={grade.id} className="border-b hover:bg-blue-50 transition">
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 font-medium">{grade.subject_name}</td>
                            <td className="px-1 sm:px-4 py-2 sm:py-3 text-center text-gray-700">{grade.test_score ?? '-'}</td>
                            <td className="px-1 sm:px-4 py-2 sm:py-3 text-center text-gray-700">{grade.exam_score ?? '-'}</td>
                            <td className="px-1 sm:px-4 py-2 sm:py-3 text-center text-gray-900 font-semibold">{grade.total_score ?? '-'}</td>
                            <td className="px-1 sm:px-4 py-2 sm:py-3 text-center">
                              <span className={`px-2 py-1 rounded-full font-bold text-xs sm:text-sm text-white inline-block ${
                                grade.grade === 'A' ? 'bg-green-600' :
                                grade.grade === 'B' ? 'bg-blue-600' :
                                grade.grade === 'C' ? 'bg-yellow-600' :
                                grade.grade === 'D' ? 'bg-orange-600' :
                                grade.grade === 'E' ? 'bg-red-600' :
                                'bg-gray-600'
                              }`}>
                                {grade.grade}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">No grades recorded yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
