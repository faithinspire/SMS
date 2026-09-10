'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

interface SubjectResult {
  id: string
  subject_id: string
  subject_name: string
  subject_code: string
  test1_score: number | null
  test2_score: number | null
  test3_score: number | null
  test4_score: number | null
  test_total: number
  exam_score: number | null
  total_score: number
  grade: string
  remark: string
  teacher_name: string
  teacher_comment: string
  updated_at: string
}

interface AttendanceStats {
  total_days: number
  present_days: number
  absent_days: number
  late_days: number
  excused_days: number
  attendance_percentage: number
}

export default function StudentViewResultsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [school, setSchool] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)

  const [results, setResults] = useState<SubjectResult[]>([])
  const [averageScore, setAverageScore] = useState(0)
  const [overallGrade, setOverallGrade] = useState('N/A')
  const [selectedResult, setSelectedResult] = useState<SubjectResult | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [attendance, setAttendance] = useState<AttendanceStats>({
    total_days: 0,
    present_days: 0,
    absent_days: 0,
    late_days: 0,
    excused_days: 0,
    attendance_percentage: 0,
  })
  const [selectedTerm, setSelectedTerm] = useState('First Term')
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [availableSessions, setAvailableSessions] = useState<Array<{ id: string; session_year: string }>>([])
  const [availableTerms, setAvailableTerms] = useState<Array<{ id: string; term_name: string; term_order: number }>>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('')

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'dark') setDarkMode(true)
    loadData()
  }, [])

  useEffect(() => {
    if (student) {
      loadResultsByTermSession()
    }
  }, [selectedTerm, selectedSession])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'STUDENT') {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      // Get school info
      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      setSchool(schoolData)

      // Get student info
      const { data: studentData } = await supabase
        .from('students')
        .select(`
          *,
          class_arm_combo:class_arm_combo_id (
            classes:class_id (name),
            arms:arm_id (name)
          )
        `)
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .single()

      // Get user full name separately to avoid ambiguous relationship
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, email, phone')
        .eq('id', currentUser.id)
        .single()

      setStudent({ ...studentData, users: userData })

      // Load attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentData.id)
        .eq('school_id', currentUser.school_id)

      if (attendanceData && attendanceData.length > 0) {
        const stats = {
          total_days: attendanceData.length,
          present_days: attendanceData.filter((a: any) => a.status === 'PRESENT').length,
          absent_days: attendanceData.filter((a: any) => a.status === 'ABSENT').length,
          late_days: attendanceData.filter((a: any) => a.status === 'LATE').length,
          excused_days: attendanceData.filter((a: any) => a.status === 'EXCUSED').length,
          attendance_percentage: 0,
        }
        stats.attendance_percentage = (stats.present_days / stats.total_days) * 100
        setAttendance(stats)
      }
    } catch (error) {
      console.error('Load error:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadResultsByTermSession = async () => {
    try {
      if (!student || !user) return

      setLoading(true)

      // Load student's results filtered by term and session
      const { data: resultsData } = await supabase
        .from('result_entries')
        .select(`
          *,
          subjects:subject_id (name, code),
          teachers:teacher_id (users:user_id (full_name))
        `)
        .eq('student_id', student.id)
        .eq('school_id', user.school_id)
        .eq('term', selectedTerm)
        .eq('academic_session', selectedSession)

      const resultsArray: SubjectResult[] = (resultsData || []).map((r: any) => ({
        id: r.id,
        subject_id: r.subject_id,
        subject_name: r.subjects?.name || 'Unknown Subject',
        subject_code: r.subjects?.code || '',
        test1_score: r.test1_score,
        test2_score: r.test2_score,
        test3_score: r.test3_score,
        test4_score: r.test4_score,
        test_total: r.test_total || 0,
        exam_score: r.exam_score,
        total_score: r.total_score || 0,
        grade: r.grade || 'N/A',
        remark: r.remark || '',
        teacher_name: r.teachers?.users?.full_name || 'Unknown Teacher',
        teacher_comment: r.teacher_comment || '',
        updated_at: r.updated_at,
      }))

      setResults(resultsArray)

      // Calculate average
      if (resultsArray.length > 0) {
        const avg = resultsArray.reduce((sum, r) => sum + r.total_score, 0) / resultsArray.length
        setAverageScore(avg)

        // Calculate overall grade
        if (avg >= 70) setOverallGrade('A')
        else if (avg >= 60) setOverallGrade('B')
        else if (avg >= 50) setOverallGrade('C')
        else if (avg >= 40) setOverallGrade('D')
        else setOverallGrade('F')
      }
    } catch (error) {
      console.error('Load error:', error)
      toast.error('Failed to load results')
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

  const bgClass = darkMode
    ? 'from-slate-950 via-emerald-900 to-slate-900'
    : 'from-emerald-50 via-green-50 to-emerald-100'
  const cardClass = darkMode
    ? 'bg-slate-800/80 backdrop-blur border-slate-700/50'
    : 'bg-white/90 backdrop-blur border-emerald-200/50'
  const textClass = darkMode ? 'text-white' : 'text-gray-900'

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgClass} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-green-500 mx-auto mb-4"></div>
          <p className={textClass}>Loading your results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgClass}`}>
      {/* Header */}
      <div className={`${cardClass} border-b shadow-2xl`}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent`}>
              📊 My Results
            </h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{school?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Term & Session Filter */}
        <div className={`${cardClass} border rounded-lg shadow-xl p-6 mb-8`}>
          <h3 className={`text-lg font-bold ${textClass} mb-4`}>📅 Select Term & Session</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-semibold ${textClass} mb-2`}>Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${inputClass} focus:outline-none focus:ring-2 focus:ring-emerald-500`}
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-semibold ${textClass} mb-2`}>Academic Session</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${inputClass} focus:outline-none focus:ring-2 focus:ring-emerald-500`}
              >
                {availableSessions.map((session) => (
                  <option key={session} value={session}>
                    {session}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Student Info Card */}
        <div className={`${cardClass} border rounded-lg shadow-xl p-6 mb-8`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Name</p>
              <p className={`font-bold text-lg ${textClass}`}>{student?.users?.full_name}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Admission</p>
              <p className={`font-bold text-lg ${textClass}`}>{student?.admission_number}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Class</p>
              <p className={`font-bold text-lg ${textClass}`}>
                {student?.class_arm_combo?.classes?.name} - {student?.class_arm_combo?.arms?.name}
              </p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Department</p>
              <p className={`font-bold text-lg ${textClass}`}>{student?.department || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`${cardClass} border rounded-lg shadow-xl p-6`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Total Subjects</p>
            <p className="text-3xl font-bold text-blue-600">{results.length}</p>
          </div>

          <div className={`${cardClass} border rounded-lg shadow-xl p-6`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Average Score</p>
            <p className="text-3xl font-bold text-emerald-600">{averageScore.toFixed(2)}/100</p>
          </div>

          <div className={`${cardClass} border rounded-lg shadow-xl p-6`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Overall Grade</p>
            <p
              className={`text-3xl font-bold ${
                overallGrade === 'A'
                  ? 'text-green-600'
                  : overallGrade === 'B'
                  ? 'text-blue-600'
                  : 'text-yellow-600'
              }`}
            >
              {overallGrade}
            </p>
          </div>
        </div>

        {/* Attendance Section */}
        {attendance.total_days > 0 && (
          <div className={`${cardClass} border rounded-lg shadow-xl p-6 mb-8`}>
            <h3 className={`text-lg font-bold ${textClass} mb-4`}>📋 Attendance Record</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-100'} rounded-lg p-4 text-center`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>School Days</p>
                <p className="text-2xl font-bold text-blue-600">{attendance.total_days}</p>
              </div>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-green-100'} rounded-lg p-4 text-center`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Present</p>
                <p className="text-2xl font-bold text-green-600">{attendance.present_days}</p>
              </div>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-red-100'} rounded-lg p-4 text-center`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Absent</p>
                <p className="text-2xl font-bold text-red-600">{attendance.absent_days}</p>
              </div>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-yellow-100'} rounded-lg p-4 text-center`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Late</p>
                <p className="text-2xl font-bold text-yellow-600">{attendance.late_days}</p>
              </div>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-purple-100'} rounded-lg p-4 text-center`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Attendance %</p>
                <p className="text-2xl font-bold text-purple-600">{attendance.attendance_percentage.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {results.length === 0 ? (
          <div className={`${cardClass} border rounded-lg shadow-xl p-8 text-center`}>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              No results available yet. Check back later.
            </p>
          </div>
        ) : (
          <div className={`${cardClass} border rounded-lg shadow-xl overflow-x-auto`}>
            <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
              <thead>
                <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                  <th className="px-4 py-3 text-left font-bold">Subject</th>
                  <th className="px-4 py-3 text-center font-bold">Test Total</th>
                  <th className="px-4 py-3 text-center font-bold">Exam</th>
                  <th className="px-4 py-3 text-center font-bold">Total</th>
                  <th className="px-4 py-3 text-center font-bold">Grade</th>
                  <th className="px-4 py-3 text-center font-bold">Teacher</th>
                  <th className="px-4 py-3 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <tr
                    key={result.id}
                    className={idx % 2 === 0 ? (darkMode ? 'bg-gray-800' : 'bg-white') : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}
                  >
                    <td className="px-4 py-3 font-semibold">
                      {result.subject_name} <span className="text-xs text-gray-500">({result.subject_code})</span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold">{result.test_total}/40</td>
                    <td className="px-4 py-3 text-center font-bold">{result.exam_score?.toFixed(1) || '-'}/60</td>
                    <td className="px-4 py-3 text-center font-bold text-lg text-green-600">
                      {result.total_score.toFixed(2)}/100
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-3 py-1 rounded font-bold ${
                          result.grade === 'A'
                            ? 'bg-green-100 text-green-800'
                            : result.grade === 'B'
                            ? 'bg-blue-100 text-blue-800'
                            : result.grade === 'C'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {result.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">{result.teacher_name}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedResult(result)
                          setShowDetailModal(true)
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} border rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-inherit">
              <h3 className={`text-xl font-bold ${textClass}`}>Result Details</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-2xl font-bold text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Subject Info */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                <h4 className={`font-bold ${textClass} mb-2`}>Subject</h4>
                <div className="space-y-1">
                  <p><span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Name:</span> {selectedResult.subject_name}</p>
                  <p><span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Code:</span> {selectedResult.subject_code}</p>
                  <p><span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Teacher:</span> {selectedResult.teacher_name}</p>
                </div>
              </div>

              {/* Scores Breakdown */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                <h4 className={`font-bold ${textClass} mb-3`}>Score Breakdown</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Test 1</p>
                    <p className="text-lg font-bold">{selectedResult.test1_score?.toFixed(1) || '-'}/10</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Test 2</p>
                    <p className="text-lg font-bold">{selectedResult.test2_score?.toFixed(1) || '-'}/10</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Test 3</p>
                    <p className="text-lg font-bold">{selectedResult.test3_score?.toFixed(1) || '-'}/10</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Test 4</p>
                    <p className="text-lg font-bold">{selectedResult.test4_score?.toFixed(1) || '-'}/10</p>
                  </div>
                  <div className={`p-2 rounded ${darkMode ? 'bg-gray-600' : 'bg-blue-100'}`}>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Test Total</p>
                    <p className="text-lg font-bold">{selectedResult.test_total}/40</p>
                  </div>
                  <div className={`p-2 rounded ${darkMode ? 'bg-gray-600' : 'bg-purple-100'}`}>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Exam Score</p>
                    <p className="text-lg font-bold">{selectedResult.exam_score?.toFixed(1) || '-'}/60</p>
                  </div>
                </div>
              </div>

              {/* Final Score */}
              <div className={`p-4 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500`}>
                <div className="grid grid-cols-3 gap-4 text-white">
                  <div>
                    <p className="text-sm opacity-90">Total Score</p>
                    <p className="text-2xl font-bold">{selectedResult.total_score.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Grade</p>
                    <p className="text-2xl font-bold">{selectedResult.grade}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Remark</p>
                    <p className="text-lg font-bold">{selectedResult.remark || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Teacher Comment */}
              {selectedResult.teacher_comment && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'} border ${darkMode ? 'border-gray-600' : 'border-blue-200'}`}>
                  <h4 className={`font-bold ${textClass} mb-2`}>✍️ Teacher's Comment</h4>
                  <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{selectedResult.teacher_comment}</p>
                </div>
              )}

              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
