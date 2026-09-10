'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'

interface CBTExam {
  id: string
  title: string
  subject_id: string
  subject_name?: string
  class_arm_combo_id: string
  class_name?: string
  duration_minutes: number
  total_marks: number
  passing_percentage: number
  start_time: string
  end_time: string
  created_by: string
  created_at: string
  status?: 'available' | 'in_progress' | 'completed' | 'expired'
  submission?: any
}

export default function StudentCBTPortal() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cbts, setCBTs] = useState<CBTExam[]>([])
  const [school, setSchool] = useState<any>(null)
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [subjects, setSubjects] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser) {
        console.error('[CBT Portal] No user logged in')
        router.push('/landing')
        return
      }

      console.log('[CBT Portal] User logged in:', currentUser.id, 'Role:', currentUser.role)

      // Check if user has school_id
      if (!currentUser.school_id) {
        console.error('[CBT Portal] User has no school_id')
        router.push('/landing')
        return
      }

      // Allow access if school_id is set - real filtering happens via database queries
      if (currentUser.role !== 'STUDENT') {
        console.warn('[CBT Portal] User role is not STUDENT:', currentUser.role)
        // Allow non-students too - database will filter their access
      }

      setUser(currentUser)

      // Load school
      if (currentUser.school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()
        setSchool(schoolData)

        // Load student record to get class and subjects
        const { data: studentData } = await supabase
          .from('students')
          .select(`
            id,
            class_arm_combo_id,
            student_subjects (
              id,
              subject_id,
              subjects (id, name, code)
            )
          `)
          .eq('user_id', currentUser.id)
          .single()

        if (studentData) {
          // Get list of subject IDs
          const subjectIds = studentData.student_subjects?.map((ss: any) => ss.subject_id) || []
          setSubjects(studentData.student_subjects?.map((ss: any) => ss.subjects) || [])

          // Load CBTs for these subjects
          await loadCBTs(currentUser.school_id, subjectIds, studentData.class_arm_combo_id)
        }
      }
    } catch (error) {
      console.error('Load data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCBTs = async (schoolId: string, subjectIds: string[], classComboId: string) => {
    try {
      if (subjectIds.length === 0) {
        setCBTs([])
        return
      }

      // Get CBTs for subjects the student is enrolled in (minimal join)
      const { data: cbtData, error } = await supabase
        .from('cbt_exams')
        .select(`
          id, title, subject_id, class_arm_combo_id, 
          duration_minutes, total_marks, passing_percentage,
          start_time, end_time, created_by, created_at
        `)
        .eq('school_id', schoolId)
        .in('subject_id', subjectIds)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      if (!cbtData || cbtData.length === 0) {
        setCBTs([])
        return
      }

      // Get subject and class names in parallel with minimal data
      const subjectIds2 = [...new Set(cbtData.map(c => c.subject_id))]
      const classIds = [...new Set(cbtData.map(c => c.class_arm_combo_id).filter(id => id))]

      const [{ data: subjects }, { data: combos }, studentResult] = await Promise.all([
        supabase.from('subjects').select('id, name, code').in('id', subjectIds2),
        classIds.length > 0 
          ? supabase.from('class_arm_combos').select('id, classes(name), arms(name)').in('id', classIds)
          : Promise.resolve({ data: [] }),
        supabase.from('students').select('id').eq('user_id', user?.id || '').maybeSingle(),
      ])

      // Get submissions only if we have a student
      let submissions: any[] = []
      const studentData = studentResult?.data
      if (studentData?.id) {
        const { data: subs } = await supabase
          .from('cbt_submissions')
          .select('id, cbt_exam_id, submitted_at')
          .eq('student_id', studentData.id)
        submissions = subs || []
      }

      // Format CBTs with status
      const subjectMap = Object.fromEntries(subjects?.map(s => [s.id, s.name]) || [])
      const comboMap = Object.fromEntries(combos?.map(c => [c.id, c]) || [])

      const formattedCBTs = (cbtData || []).map((cbt: any) => {
        const now = new Date()
        const startTime = new Date(cbt.start_time)
        const endTime = new Date(cbt.end_time)

        let status: 'available' | 'in_progress' | 'completed' | 'expired' = 'available'
        if (now < startTime) status = 'available'
        else if (now > endTime) status = 'expired'
        else status = 'in_progress'

        const submission = submissions.find(s => s.cbt_exam_id === cbt.id)
        if (submission?.submitted_at) status = 'completed'

        // FIXED: Handle null class_arm_combo_id safely
        let className = 'General'
        if (cbt.class_arm_combo_id) {
          const combo = comboMap[cbt.class_arm_combo_id]
          if (combo && combo.classes && combo.arms) {
            className = `${combo.classes.name} - ${combo.arms.name}`
          }
        }

        return {
          ...cbt,
          subject_name: subjectMap[cbt.subject_id],
          class_name: className,
          status,
          submission,
        }
      })

      setCBTs(formattedCBTs)
    } catch (error) {
      console.error('Load CBTs error:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-50 border-green-300'
      case 'in_progress':
        return 'bg-blue-50 border-blue-300'
      case 'completed':
        return 'bg-gray-50 border-gray-300'
      case 'expired':
        return 'bg-red-50 border-red-300'
      default:
        return 'bg-white border-gray-300'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return { icon: '✓', text: 'Available', color: 'bg-green-100 text-green-800' }
      case 'in_progress':
        return { icon: '⏱', text: 'Active', color: 'bg-blue-100 text-blue-800' }
      case 'completed':
        return { icon: '✓', text: 'Completed', color: 'bg-gray-100 text-gray-800' }
      case 'expired':
        return { icon: '✕', text: 'Expired', color: 'bg-red-100 text-red-800' }
      default:
        return { icon: '?', text: status, color: 'bg-gray-100 text-gray-800' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your exams...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">🧪 My CBT Exams</h1>
            <p className="text-blue-100 mt-1">{school?.name}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/student/dashboard">
              <button className="px-6 py-2 bg-white hover:bg-gray-100 text-blue-600 rounded-lg font-semibold transition">
                ← Back to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter by Subject */}
        {subjects.length > 1 && (
          <div className="mb-8 bg-white rounded-lg shadow p-6 border border-blue-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Filter by Subject:</label>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setSelectedSubject('')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  selectedSubject === ''
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Subjects
              </button>
              {subjects.map((subject: any) => (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    selectedSubject === subject.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {subject.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CBTs List */}
        {cbts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center border-2 border-dashed border-blue-300">
            <p className="text-2xl mb-2">📋 No exams available</p>
            <p className="text-gray-600">Your teachers haven't created any CBTs for your subjects yet.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {cbts
              .filter(cbt => !selectedSubject || cbt.subject_id === selectedSubject)
              .map((cbt) => {
                const badge = getStatusBadge(cbt.status)
                const now = new Date()
                const startTime = new Date(cbt.start_time)
                const endTime = new Date(cbt.end_time)
                const timeLeft = Math.max(0, (endTime.getTime() - now.getTime()) / 1000 / 60)

                return (
                  <div
                    key={cbt.id}
                    className={`border-2 rounded-lg shadow-lg overflow-hidden transition hover:shadow-xl ${getStatusColor(
                      cbt.status
                    )}`}
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">{cbt.title}</h2>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.color}`}>
                              {badge.icon} {badge.text}
                            </span>
                          </div>
                          <p className="text-gray-600">{cbt.subject_name}</p>
                          <p className="text-sm text-gray-500">{cbt.class_name}</p>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b">
                        <div>
                          <p className="text-sm text-gray-600">Duration</p>
                          <p className="text-lg font-semibold text-gray-900">{cbt.duration_minutes} min</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Marks</p>
                          <p className="text-lg font-semibold text-gray-900">{cbt.total_marks}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Pass Percentage</p>
                          <p className="text-lg font-semibold text-gray-900">{cbt.passing_percentage}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            {cbt.status === 'expired' ? 'Ended' : 'Available Until'}
                          </p>
                          <p className="text-lg font-semibold text-gray-900">
                            {new Date(cbt.end_time).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Time Info */}
                      {cbt.status === 'in_progress' && (
                        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg flex items-center gap-2">
                          <span className="text-xl">⏱</span>
                          <p className="font-semibold">
                            Time remaining: {Math.floor(timeLeft / 60)}h {Math.round(timeLeft % 60)}min
                          </p>
                        </div>
                      )}

                      {cbt.status === 'expired' && (
                        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">
                          <p className="font-semibold">This exam is no longer available</p>
                        </div>
                      )}

                      {cbt.status === 'completed' && (
                        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">
                          <p className="font-semibold">✓ You have completed this exam</p>
                          {cbt.submission && (
                            <Link href={`/student/cbt/${cbt.id}/results`}>
                              <button className="mt-2 px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm">
                                View Results
                              </button>
                            </Link>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      {cbt.status === 'available' && (
                        <Link href={`/student/cbt/${cbt.id}`}>
                          <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg transition shadow-lg">
                            📝 Start Exam
                          </button>
                        </Link>
                      )}

                      {cbt.status === 'in_progress' && !cbt.submission && (
                        <Link href={`/student/cbt/${cbt.id}`}>
                          <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg transition shadow-lg">
                            ▶ Continue Exam
                          </button>
                        </Link>
                      )}

                      {cbt.status === 'in_progress' && cbt.submission && !cbt.submission.submitted_at && (
                        <Link href={`/student/cbt/${cbt.id}`}>
                          <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg transition shadow-lg">
                            ⏸ Resume Exam
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* Statistics */}
        {cbts.length > 0 && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <p className="text-gray-600 text-sm font-medium">Available</p>
              <p className="text-3xl font-bold text-blue-600">
                {cbts.filter(c => c.status === 'available').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <p className="text-gray-600 text-sm font-medium">Active Now</p>
              <p className="text-3xl font-bold text-blue-600">
                {cbts.filter(c => c.status === 'in_progress').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <p className="text-gray-600 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold text-green-600">
                {cbts.filter(c => c.status === 'completed').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <p className="text-gray-600 text-sm font-medium">Expired</p>
              <p className="text-3xl font-bold text-red-600">
                {cbts.filter(c => c.status === 'expired').length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
