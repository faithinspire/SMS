'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User, School } from '@/types'
import DashboardHeader from '@/components/DashboardHeader'

interface CBTExam {
  id: string
  title: string
  description?: string
  subject: {
    id: string
    name: string
  }
  durationMinutes: number
  totalMarks?: number
  passingPercentage?: number
  startTime: string
  endTime: string
  questionCount?: number
  createdAt: string
  submitted?: boolean
  score?: number
  percentage?: number
  passed?: boolean
}

interface ExamsByStatus {
  upcoming: CBTExam[]
  active: CBTExam[]
  completed: CBTExam[]
  notAttempted: CBTExam[]
}

export default function StudentCBTPortalPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState<ExamsByStatus>({
    upcoming: [],
    active: [],
    completed: [],
    notAttempted: [],
  })
  const [darkMode, setDarkMode] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'light') {
      setDarkMode(false)
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      loadData()
    }
  }, [mounted])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'STUDENT') {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (!currentUser.schoolId) {
        console.warn('No school_id for student')
        return
      }

      // Load school
      try {
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('id, name, logo_url, status')
          .eq('id', currentUser.schoolId)
          .single()

        if (!schoolError && schoolData) {
          setSchool(schoolData)
        }
      } catch (err) {
        console.warn('School fetch failed:', err)
      }

      // Load student record
      let studentId = null
      try {
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', currentUser.id)
          .single()

        if (!studentError && student) {
          studentId = student.id
        }
      } catch (err) {
        console.warn('Student fetch failed:', err)
        return
      }

      if (!studentId) {
        console.warn('Student not found')
        return
      }

      // Load student subjects
      try {
        const { data: subjects, error: subjectsError } = await supabase
          .from('student_subjects')
          .select('subject_id')
          .eq('student_id', studentId)

        const subjectIds = (!subjectsError && subjects) ? subjects.map((s: any) => s.subject_id) : []

        if (subjectIds.length > 0) {
          // Load CBT exams for student's subjects
          try {
            const { data: examsData, error: examsError } = await supabase
              .from('cbt_exams')
              .select('*, subjects(id, name)')
              .in('subject_id', subjectIds)
              .eq('school_id', currentUser.schoolId)
              .order('start_time', { ascending: false })

            if (!examsError && examsData) {
              // Load student's CBT submissions
              const { data: submissions, error: submissionsError } = await supabase
                .from('cbt_submissions')
                .select('cbt_exam_id, score, percentage, passed, submitted_at')
                .eq('student_id', studentId)

              const submissionMap = new Map(
                (!submissionsError && submissions) ? submissions.map(s => [s.cbt_exam_id, s]) : []
              )

              // Categorize exams
              const now = new Date()
              const upcoming: CBTExam[] = []
              const active: CBTExam[] = []
              const completed: CBTExam[] = []
              const notAttempted: CBTExam[] = []

              examsData.forEach((exam: any) => {
                const startTime = new Date(exam.start_time)
                const endTime = new Date(exam.end_time)
                const submission = submissionMap.get(exam.id)

                const examData: CBTExam = {
                  id: exam.id,
                  title: exam.title,
                  description: exam.description,
                  subject: exam.subjects || { id: exam.subject_id, name: 'Unknown' },
                  durationMinutes: exam.duration_minutes,
                  totalMarks: exam.total_marks,
                  passingPercentage: exam.passing_percentage,
                  startTime: exam.start_time,
                  endTime: exam.end_time,
                  questionCount: exam.question_count,
                  createdAt: exam.created_at,
                  submitted: !!submission,
                  score: submission?.score,
                  percentage: submission?.percentage,
                  passed: submission?.passed,
                }

                if (submission) {
                  completed.push(examData)
                } else if (now < startTime) {
                  upcoming.push(examData)
                } else if (now >= startTime && now <= endTime) {
                  active.push(examData)
                } else {
                  notAttempted.push(examData)
                }
              })

              setExams({ upcoming, active, completed, notAttempted })
            }
          } catch (err) {
            console.warn('Exams fetch failed:', err)
          }
        }
      } catch (err) {
        console.warn('Subjects fetch failed:', err)
      }
    } catch (error) {
      console.error('Load data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartExam = (examId: string) => {
    router.push(`/student/cbt-take/${examId}`)
  }

  const handleViewResults = (examId: string) => {
    router.push(`/student/cbt-results/${examId}`)
  }

  const bgClass = darkMode
    ? 'bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950'
    : 'bg-gradient-to-b from-blue-50 via-cyan-50 to-indigo-50'
  const cardClass = darkMode
    ? 'bg-slate-800/80 backdrop-blur border-slate-700/50'
    : 'bg-white/90 backdrop-blur border-blue-200/50'
  const textClass = darkMode ? 'text-white' : 'text-gray-900'
  const secondaryText = darkMode ? 'text-gray-400' : 'text-gray-600'

  if (!mounted) return null

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgClass}`}>
        <DashboardHeader school={school} user={user} darkMode={darkMode} />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className={textClass}>Loading CBT Portal...</p>
          </div>
        </div>
      </div>
    )
  }

  const hasExams = Object.values(exams).some(category => category.length > 0)

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgClass}`}>
      <DashboardHeader
        school={school}
        user={user}
        darkMode={darkMode}
        onThemeToggle={() => {
          setDarkMode(!darkMode)
          localStorage.setItem('theme-mode', !darkMode ? 'dark' : 'light')
        }}
        title="Computer Based Test Portal"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasExams ? (
          <div className={`${cardClass} border rounded-lg p-8 text-center`}>
            <p className={textClass}>No exams available at this time</p>
            <p className={secondaryText}>Check back later for available CBTs</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Exams */}
            {exams.active.length > 0 && (
              <section>
                <h2 className={`${textClass} text-2xl font-bold mb-4`}>🔴 Active Exams</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exams.active.map(exam => (
                    <div key={exam.id} className={`${cardClass} border rounded-lg p-6`}>
                      <h3 className={`${textClass} font-bold text-lg mb-2`}>{exam.title}</h3>
                      <p className={secondaryText}>{exam.subject.name}</p>
                      <div className="mt-4 space-y-2">
                        <p className={secondaryText}>Duration: {exam.durationMinutes} minutes</p>
                        <p className={secondaryText}>Total Marks: {exam.totalMarks}</p>
                      </div>
                      <button
                        onClick={() => handleStartExam(exam.id)}
                        className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                      >
                        Start Exam
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Completed Exams */}
            {exams.completed.length > 0 && (
              <section>
                <h2 className={`${textClass} text-2xl font-bold mb-4`}>✅ Completed Exams</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exams.completed.map(exam => (
                    <div key={exam.id} className={`${cardClass} border rounded-lg p-6`}>
                      <h3 className={`${textClass} font-bold text-lg mb-2`}>{exam.title}</h3>
                      <p className={secondaryText}>{exam.subject.name}</p>
                      <div className="mt-4 space-y-2">
                        <p className={secondaryText}>Score: {exam.score}/{exam.totalMarks}</p>
                        <p className={secondaryText}>Percentage: {exam.percentage?.toFixed(2)}%</p>
                        <p className={exam.passed ? 'text-green-500' : 'text-red-500'}>
                          {exam.passed ? '✅ Passed' : '❌ Failed'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleViewResults(exam.id)}
                        className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                      >
                        View Results
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Exams */}
            {exams.upcoming.length > 0 && (
              <section>
                <h2 className={`${textClass} text-2xl font-bold mb-4`}>📅 Upcoming Exams</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exams.upcoming.map(exam => (
                    <div key={exam.id} className={`${cardClass} border rounded-lg p-6 opacity-75`}>
                      <h3 className={`${textClass} font-bold text-lg mb-2`}>{exam.title}</h3>
                      <p className={secondaryText}>{exam.subject.name}</p>
                      <div className="mt-4 space-y-2">
                        <p className={secondaryText}>Starts: {new Date(exam.startTime).toLocaleDateString()}</p>
                        <p className={secondaryText}>Duration: {exam.durationMinutes} minutes</p>
                      </div>
                      <button disabled className="mt-4 w-full bg-gray-500 text-white font-bold py-2 px-4 rounded opacity-50">
                        Coming Soon
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Not Attempted Exams */}
            {exams.notAttempted.length > 0 && (
              <section>
                <h2 className={`${textClass} text-2xl font-bold mb-4`}>⏱️ Exams Ended</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exams.notAttempted.map(exam => (
                    <div key={exam.id} className={`${cardClass} border rounded-lg p-6 opacity-75`}>
                      <h3 className={`${textClass} font-bold text-lg mb-2`}>{exam.title}</h3>
                      <p className={secondaryText}>{exam.subject.name}</p>
                      <div className="mt-4">
                        <p className="text-orange-500 font-bold">Exam period ended - No longer available</p>
                      </div>
                      <button disabled className="mt-4 w-full bg-gray-500 text-white font-bold py-2 px-4 rounded opacity-50">
                        Not Available
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
