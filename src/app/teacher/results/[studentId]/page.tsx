'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { ResultAggregationService } from '@/services/result-aggregation.service'
import { supabase } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

// Dynamically import html2pdf to avoid build errors
const html2pdf = typeof window !== 'undefined' ? require('html2pdf.js/dist/html2pdf.bundle.min') : null

interface StudentResult {
  student_id: string
  student_name: string
  admission_number?: string
  class_name?: string
  session_year: string
  term_name: string
  subjects: any[]
  overall_score?: number
  overall_grade?: string
  status?: 'PASS' | 'FAIL'
}

export default function StudentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.studentId as string

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<StudentResult | null>(null)
  const [comment, setComment] = useState<string>('')
  const [isEditingComment, setIsEditingComment] = useState(false)
  const [savingComment, setSavingComment] = useState(false)
  const [termId, setTermId] = useState<string>('')

  // Initialize
  useEffect(() => {
    initialize()
  }, [])

  const initialize = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || !['TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER'].includes(currentUser.role)) {
        router.push('/auth/teacher/login')
        return
      }

      setUser(currentUser)

      // Load student result
      if (studentId) {
        await loadStudentResult(currentUser.school_id, studentId)
      }
    } catch (err) {
      console.error('[StudentDetail] Init error:', err)
      toast.error('Failed to initialize')
      router.push('/teacher/results')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentResult = async (schoolId: string, studId: string) => {
    try {
      // Get student info
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, admission_number, user_id, school_id')
        .eq('id', studId)
        .eq('school_id', schoolId)
        .single()

      if (studentError || !student) {
        toast.error('Student not found')
        return
      }

      // Get current term (from session parameters or use latest)
      const { data: session } = await supabase
        .from('academic_sessions')
        .select('id')
        .eq('school_id', schoolId)
        .order('session_year', { ascending: false })
        .limit(1)
        .single()

      if (!session) {
        toast.error('No academic session found')
        return
      }

      const { data: term } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('session_id', session.id)
        .order('term_name', { ascending: true })
        .limit(1)
        .single()

      if (!term) {
        toast.error('No term found')
        return
      }

      setTermId(term.id)

      // Load result
      const studentResult = await ResultAggregationService.getStudentResult(schoolId, studId, term.id)

      console.log('[StudentDetail] Result loaded:', studentResult)

      if (studentResult) {
        console.log('[StudentDetail] Setting result with subjects:', studentResult.subjects?.length || 0)
        setResult(studentResult)
      } else {
        console.warn('[StudentDetail] No result returned from service')
        toast.warning('No scores found for this student yet. Ask teacher to enter scores.')
      }

      // Load comment
      await loadComment(schoolId, studId, term.id)
    } catch (err) {
      console.error('[StudentDetail] Load result error:', err)
      toast.error('Failed to load student result')
    }
  }

  const loadComment = async (schoolId: string, studId: string, termId: string) => {
    try {
      const response = await fetch(
        `/api/teacher/student-comments?school_id=${schoolId}&student_id=${studId}&term_id=${termId}`
      )
      const data = await response.json()

      if (data.comment?.comment_text) {
        setComment(data.comment.comment_text)
      }
    } catch (err) {
      console.error('[StudentDetail] Load comment error:', err)
    }
  }

  const saveComment = async () => {
    if (!user || !termId || !studentId) return

    try {
      setSavingComment(true)

      const response = await fetch('/api/teacher/student-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: user.school_id,
          student_id: studentId,
          term_id: termId,
          comment_text: comment,
          teacher_id: user.id,
        }),
      })

      if (!response.ok) throw new Error('Failed to save comment')

      toast.success('Comment saved successfully')
      setIsEditingComment(false)
    } catch (err) {
      console.error('[StudentDetail] Save comment error:', err)
      toast.error('Failed to save comment')
    } finally {
      setSavingComment(false)
    }
  }

  // Sharing functions
  const shareToWhatsApp = async () => {
    if (!result) return

    const text = `
${result.student_name} - ${result.admission_number}
${result.class_name}
${result.session_year} - ${result.term_name}

Overall Score: ${result.overall_score}
Grade: ${result.overall_grade}
Status: ${result.status}

Subjects:
${result.subjects
  .map((s) => `${s.subject_name}: ${s.total} (${s.grade})`)
  .join('\n')}
`

    const encodedText = encodeURIComponent(text)
    window.open(`https://wa.me/?text=${encodedText}`, '_blank')
  }

  const shareToEmail = async () => {
    if (!result) return

    const subject = `Student Result - ${result.student_name}`
    const body = `
Student: ${result.student_name}
Admission: ${result.admission_number}
Class: ${result.class_name}
Session: ${result.session_year} - ${result.term_name}

Overall Score: ${result.overall_score}
Overall Grade: ${result.overall_grade}
Status: ${result.status}

Subjects:
${result.subjects.map((s) => `${s.subject_name}: ${s.total} (${s.grade})`).join('\n')}

${comment ? `\nTeacher Comment:\n${comment}` : ''}
`

    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  const downloadPDF = async () => {
    if (!result) return

    const element = document.getElementById('result-content')
    if (!element) return

    try {
      // Dynamically import html2pdf if needed
      const html2pdfLib = html2pdf || (await import('html2pdf.js/dist/html2pdf.bundle.min')).default

      const opt = {
        margin: 10,
        filename: `${result.student_name}-result.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      }

      html2pdfLib().set(opt).from(element).save()
      toast.success('PDF downloaded successfully')
    } catch (err) {
      console.error('PDF download error:', err)
      toast.error('Failed to download PDF. Please try again.')
    }
  }

  const printResult = () => {
    if (!result) return

    const element = document.getElementById('result-content')
    if (!element) return

    const printWindow = window.open('', '', 'height=600,width=800')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>${result.student_name} - Result</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
            .info-item { padding: 5px; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #f0f0f0; border: 1px solid #ddd; padding: 8px; text-align: left; }
            td { border: 1px solid #ddd; padding: 8px; }
            .comment-section { margin-top: 20px; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #2563eb; }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `)

    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading student result...</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="mb-4 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
          >
            ← Back
          </button>
          <div className="bg-yellow-50 rounded-lg shadow p-8 text-center border-l-4 border-yellow-600">
            <p className="text-yellow-700 text-lg font-semibold">⚠️ No Scores Found</p>
            <p className="text-yellow-600 mt-2">This student hasn't been assigned any scores yet.</p>
            <p className="text-yellow-500 text-sm mt-4">The teacher needs to:</p>
            <ul className="text-yellow-600 text-sm mt-2 space-y-1">
              <li>✓ Go to /teacher/cbt-test-slots to create test slots</li>
              <li>✓ Go to /teacher/score-sheet to enter manual scores</li>
              <li>✓ Then come back to view this student's results</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Student Result Details</h1>
          <div className="w-20" />
        </div>

        {/* Sharing Buttons */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6 border-l-4 border-green-600">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📤 Share Result</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={shareToWhatsApp}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              💬 WhatsApp
            </button>
            <button
              onClick={shareToEmail}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              📧 Email
            </button>
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              📥 Download PDF
            </button>
            <button
              onClick={printResult}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
            >
              🖨️ Print
            </button>
          </div>
        </div>

        {/* Result Content (for printing/PDF) */}
        <div id="result-content" className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {/* Student Info */}
          <div className="border-b-2 pb-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{result.student_name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div>
                <p className="text-sm text-gray-600">Admission No.</p>
                <p className="font-semibold text-gray-800">{result.admission_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Class</p>
                <p className="font-semibold text-gray-800">{result.class_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Session</p>
                <p className="font-semibold text-gray-800">{result.session_year}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Term</p>
                <p className="font-semibold text-gray-800">{result.term_name}</p>
              </div>
            </div>
          </div>

          {/* Overall Performance */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Overall Score</p>
                <p className="text-3xl font-bold text-indigo-600">{result.overall_score}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Overall Grade</p>
                <p className="text-3xl font-bold text-indigo-600">{result.overall_grade}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p
                  className={`text-3xl font-bold ${
                    result.status === 'PASS' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {result.status}
                </p>
              </div>
            </div>
          </div>

          {/* Subjects Table */}
          {result.subjects && result.subjects.length > 0 ? (
            <div className="overflow-x-auto mb-6">
              <div className="text-sm text-gray-600 mb-2">
                <p>📚 {result.subjects.length} Subject{result.subjects.length !== 1 ? 's' : ''} Enrolled</p>
              </div>
              <table className="w-full border-collapse">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Subject</th>
                    <th className="px-4 py-3 text-center">CA1</th>
                    <th className="px-4 py-3 text-center">CA2</th>
                    <th className="px-4 py-3 text-center">CA3</th>
                    <th className="px-4 py-3 text-center">CA4</th>
                    <th className="px-4 py-3 text-center">Exam</th>
                    <th className="px-4 py-3 text-center">Total</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {result.subjects.map((subject, idx) => {
                    const isIncomplete = subject.ca1 === null && subject.ca2 === null && subject.ca3 === null && subject.ca4 === null && subject.exam === null
                    
                    return (
                      <tr key={idx} className={`border-b hover:bg-gray-50 ${isIncomplete ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 font-semibold text-gray-800">{subject.subject_name}</td>
                        <td className="px-4 py-3 text-center text-gray-700">
                          {subject.ca1 !== null && subject.ca1 !== undefined ? subject.ca1.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">
                          {subject.ca2 !== null && subject.ca2 !== undefined ? subject.ca2.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">
                          {subject.ca3 !== null && subject.ca3 !== undefined ? subject.ca3.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">
                          {subject.ca4 !== null && subject.ca4 !== undefined ? subject.ca4.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">
                          {subject.exam !== null && subject.exam !== undefined ? subject.exam.toFixed(1) : '-'}
                        </td>
                        <td className={`px-4 py-3 text-center font-bold ${isIncomplete ? 'text-red-600' : 'text-indigo-600'}`}>
                          {subject.total > 0 ? subject.total.toFixed(1) : '-'}
                        </td>
                        <td className={`px-4 py-3 text-center font-bold ${isIncomplete ? 'text-red-600' : 'text-indigo-600'}`}>
                          {isIncomplete ? '⏳ Pending' : subject.grade}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-blue-50 p-8 rounded-lg border-l-4 border-blue-500 text-center mb-6">
              <p className="text-blue-700 font-semibold">📚 No Subjects Assigned</p>
              <p className="text-blue-600 text-sm mt-2">This student hasn't been assigned any subjects for this class.</p>
            </div>
          )}
        </div>

        {/* Teacher Comment Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📝 Teacher Comment</h2>

          {isEditingComment ? (
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment or remark for this student..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none h-32 resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={saveComment}
                  disabled={savingComment}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {savingComment ? 'Saving...' : 'Save Comment'}
                </button>
                <button
                  onClick={() => setIsEditingComment(false)}
                  className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200 min-h-24">
                {comment ? (
                  <p className="text-gray-700 whitespace-pre-wrap">{comment}</p>
                ) : (
                  <p className="text-gray-500 italic">No comment yet. Click edit to add one.</p>
                )}
              </div>
              <button
                onClick={() => setIsEditingComment(true)}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Edit Comment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
