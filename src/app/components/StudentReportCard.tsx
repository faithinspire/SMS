'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface ReportCardProps {
  schoolId: string
  studentId: string
  termId?: string
}

interface ReportCardData {
  student: {
    id: string
    admission_number: string
    full_name: string
    email: string
    photo_url?: string
    class: string
    arm: string
    level?: number
  }
  school: {
    id: string
    name: string
    logo_url?: string
  }
  term: {
    id: string
    name: string
    session_year: number
    start_date: string
    end_date: string
  } | null
  scores: Array<{
    subject_id: string
    subject_name: string
    subject_code: string
    test1: number | null
    test2: number | null
    test3: number | null
    test4: number | null
    test_total: number
    exam: number | null
    total: number
    grade: string
    teacher_comment: string
    updated_at: string
  }>
  attendance: {
    total_school_days: number
    present: number
    absent: number
    late: number
    excused: number
    percentage: number
  }
  overall: {
    total_subjects: number
    overall_score: number
    overall_percentage: number
    overall_grade: string
    subjects_passed: number
  }
  generated_at: string
}

export default function StudentReportCard({
  schoolId,
  studentId,
  termId,
}: ReportCardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'dark') setDarkMode(true)
    loadReportCard()
  }, [schoolId, studentId, termId])

  const loadReportCard = async () => {
    try {
      setLoading(true)
      setError('')

      const url = new URL('/api/student/report-card', window.location.origin)
      url.searchParams.append('school_id', schoolId)
      url.searchParams.append('student_id', studentId)
      if (termId) {
        url.searchParams.append('term_id', termId)
      }

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success || !data.report_card) {
        throw new Error('Failed to load report card')
      }

      setReportCard(data.report_card)
    } catch (err: any) {
      console.error('Error loading report card:', err)
      setError(err.message || 'Failed to load report card')
      toast.error('Failed to load report card')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-blue-600 mx-auto mb-4"></div>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading report card...</p>
        </div>
      </div>
    )
  }

  if (error || !reportCard) {
    return (
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-red-50 text-red-800'}`}>
        <p className="font-semibold">{error || 'Failed to load report card'}</p>
      </div>
    )
  }

  const { student, school, term, scores, attendance, overall } = reportCard

  return (
    <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen py-8 px-4`}>
      <div className={`max-w-5xl mx-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`${darkMode ? 'bg-gradient-to-r from-blue-900 to-blue-700' : 'bg-gradient-to-r from-blue-600 to-blue-400'} px-8 py-8 text-white`}>
          <div className="flex items-center justify-between mb-4">
            {school.logo_url && (
              <img src={school.logo_url} alt={school.name} className="h-16 w-16 rounded-full" />
            )}
            <div className="text-right">
              <h1 className="text-3xl font-bold">{school.name}</h1>
              <p className="text-blue-100">STUDENT REPORT CARD</p>
            </div>
          </div>

          {term && (
            <div className="flex justify-between text-sm text-blue-100 mt-4">
              <span>{term.name}</span>
              <span>{term.session_year}</span>
            </div>
          )}
        </div>

        {/* Student Information */}
        <div className={`px-8 py-6 border-b ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Student Name</p>
              <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{student.full_name}</p>
            </div>
            <div>
              <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Admission No</p>
              <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{student.admission_number}</p>
            </div>
            <div>
              <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Class</p>
              <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{student.class}</p>
            </div>
            <div>
              <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Arm</p>
              <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{student.arm}</p>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="px-8 py-6">
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📚 Academic Results</h2>

          <div className="overflow-x-auto">
            <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
              <thead>
                <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                  <th className="px-4 py-3 text-left font-bold">Subject</th>
                  <th className="px-3 py-3 text-center font-bold">CA1</th>
                  <th className="px-3 py-3 text-center font-bold">CA2</th>
                  <th className="px-3 py-3 text-center font-bold">CA3</th>
                  <th className="px-3 py-3 text-center font-bold">CA4</th>
                  <th className="px-3 py-3 text-center font-bold">CA Total</th>
                  <th className="px-3 py-3 text-center font-bold">Exam</th>
                  <th className="px-3 py-3 text-center font-bold">Total</th>
                  <th className="px-3 py-3 text-center font-bold">%</th>
                  <th className="px-3 py-3 text-center font-bold">Grade</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score, idx) => (
                  <tr
                    key={score.subject_id}
                    className={idx % 2 === 0 ? (darkMode ? 'bg-gray-800' : 'bg-white') : (darkMode ? 'bg-gray-750' : 'bg-gray-50')}
                  >
                    <td className="px-4 py-3 font-semibold">{score.subject_name}</td>
                    <td className="px-3 py-3 text-center">{score.test1 !== null ? score.test1 : '-'}</td>
                    <td className="px-3 py-3 text-center">{score.test2 !== null ? score.test2 : '-'}</td>
                    <td className="px-3 py-3 text-center">{score.test3 !== null ? score.test3 : '-'}</td>
                    <td className="px-3 py-3 text-center">{score.test4 !== null ? score.test4 : '-'}</td>
                    <td className="px-3 py-3 text-center font-semibold">{score.test_total}</td>
                    <td className="px-3 py-3 text-center">{score.exam !== null ? score.exam : '-'}</td>
                    <td className="px-3 py-3 text-center font-semibold">{score.total}</td>
                    <td className="px-3 py-3 text-center font-semibold">{score.total > 0 ? ((score.total / 100) * 100).toFixed(0) : 0}%</td>
                    <td className={`px-3 py-3 text-center font-bold text-lg ${
                      score.grade === 'A' ? 'text-green-600' :
                      score.grade === 'B' ? 'text-blue-600' :
                      score.grade === 'C' ? 'text-yellow-600' :
                      score.grade === 'D' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {score.grade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overall Performance */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 px-8 py-6 border-t ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
          <div className={`p-4 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>TOTAL SUBJECTS</p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{overall.total_subjects}</p>
          </div>
          <div className={`p-4 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>PASSED</p>
            <p className={`text-2xl font-bold text-green-600`}>{overall.subjects_passed}</p>
          </div>
          <div className={`p-4 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>OVERALL %</p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{overall.overall_percentage.toFixed(2)}%</p>
          </div>
          <div className={`p-4 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>OVERALL GRADE</p>
            <p className={`text-2xl font-bold ${
              overall.overall_grade === 'A' ? 'text-green-600' :
              overall.overall_grade === 'B' ? 'text-blue-600' :
              overall.overall_grade === 'C' ? 'text-yellow-600' :
              overall.overall_grade === 'D' ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {overall.overall_grade}
            </p>
          </div>
        </div>

        {/* Attendance */}
        <div className="px-8 py-6 border-t border-gray-200">
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📅 Attendance</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={`p-4 rounded ${darkMode ? 'bg-gray-800' : 'bg-blue-50'}`}>
              <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>SCHOOL DAYS</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-blue-600'}`}>{attendance.total_school_days}</p>
            </div>
            <div className={`p-4 rounded ${darkMode ? 'bg-gray-800' : 'bg-green-50'}`}>
              <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>PRESENT</p>
              <p className={`text-2xl font-bold text-green-600`}>{attendance.present}</p>
            </div>
            <div className={`p-4 rounded ${darkMode ? 'bg-gray-800' : 'bg-red-50'}`}>
              <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>ABSENT</p>
              <p className={`text-2xl font-bold text-red-600`}>{attendance.absent}</p>
            </div>
            <div className={`p-4 rounded ${darkMode ? 'bg-gray-800' : 'bg-yellow-50'}`}>
              <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>LATE</p>
              <p className={`text-2xl font-bold text-yellow-600`}>{attendance.late}</p>
            </div>
            <div className={`p-4 rounded ${darkMode ? 'bg-gray-800' : 'bg-blue-50'}`}>
              <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>ATTENDANCE %</p>
              <p className={`text-2xl font-bold text-blue-600`}>{attendance.percentage.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        {/* Teacher Comments */}
        <div className={`px-8 py-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>✍️ Teacher's Comment</h2>
          {scores.some(s => s.teacher_comment) ? (
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-750 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
              <p>{scores.find(s => s.teacher_comment)?.teacher_comment}</p>
            </div>
          ) : (
            <p className={`italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No comments available</p>
          )}
        </div>

        {/* Footer */}
        <div className={`px-8 py-4 text-center text-xs ${darkMode ? 'bg-gray-750 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
          <p>Generated on {new Date(reportCard.generated_at).toLocaleDateString()}</p>
          <p className="mt-1">This is an automated report card. Please verify with school administrator if needed.</p>
        </div>
      </div>
    </div>
  )
}
