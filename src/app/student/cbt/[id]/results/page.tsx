'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'

interface Question {
  id: string
  question_text: string
  marks: number
}

interface Option {
  id: string
  option_text: string
  is_correct: boolean
}

interface Answer {
  question_id: string
  selected_option_id: string | null
  answer_text: string
  question: Question
  selected_option: Option | null
}

interface Submission {
  id: string
  score: number
  total_marks: number
  passing_score: number
  status: string
  submitted_at: string
  answers: Answer[]
  exam: {
    id: string
    title: string
    subject_name: string
    passing_percentage: number
  }
}

export default function CBTResultsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const examId = params.id as string
  const submissionId = searchParams.get('submission') as string

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [error, setError] = useState('')
  const [showReview, setShowReview] = useState(false)

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'STUDENT') {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (!submissionId) {
        setError('No submission found')
        return
      }

      // OPTIMIZED: Load submission, exam, answers, questions, and options in PARALLEL
      const [
        submissionResponse,
        examResponse,
        answersResponse,
        questionsResponse,
        optionsResponse,
      ] = await Promise.all([
        supabase
          .from('cbt_submissions')
          .select('id, score, total_marks, passing_score, status, submitted_at')
          .eq('id', submissionId)
          .eq('school_id', currentUser.school_id)
          .single(),
        supabase
          .from('cbt_exams')
          .select('id, title, subject_id, passing_percentage')
          .eq('id', examId)
          .single(),
        supabase
          .from('cbt_answers')
          .select('question_id, selected_option_id, answer_text')
          .eq('submission_id', submissionId),
        supabase
          .from('cbt_questions')
          .select('id, question_text, marks')
          .eq('cbt_exam_id', examId),
        supabase
          .from('cbt_options')
          .select('id, option_text, is_correct, question_id'),
      ])

      const { data: submissionData, error: subError } = submissionResponse
      const { data: examData, error: examError } = examResponse
      const { data: answersData } = answersResponse
      const { data: questionsData } = questionsResponse
      const { data: optionsData } = optionsResponse

      if (subError || !submissionData) {
        setError('Submission not found')
        return
      }

      if (examError || !examData) {
        setError('Exam not found')
        return
      }

      // Get subject name - this is the only sequential query needed
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', examData?.subject_id)
        .single()

      // Build option map for quick lookup
      const optionsMap = new Map<string, Option>()
      optionsData?.forEach((opt) => {
        optionsMap.set(opt.id, opt)
      })

      // Build questions map for quick lookup
      const questionsMap = new Map<string, Question>()
      questionsData?.forEach((q) => {
        questionsMap.set(q.id, q)
      })

      // Build answers with question and option details
      const detailedAnswers = (answersData || []).map((ans) => ({
        question_id: ans.question_id,
        selected_option_id: ans.selected_option_id,
        answer_text: ans.answer_text,
        question: questionsMap.get(ans.question_id) || { id: '', question_text: 'Unknown', marks: 0 },
        selected_option: ans.selected_option_id ? optionsMap.get(ans.selected_option_id) : null,
      }))

      setSubmission({
        ...submissionData,
        answers: detailedAnswers,
        exam: {
          id: examData?.id || '',
          title: examData?.title || 'Unknown',
          subject_name: subjectData?.name || 'Unknown',
          passing_percentage: examData?.passing_percentage || 50,
        },
      })
    } catch (err: any) {
      console.error('Load results error:', err)
      setError('Failed to load results: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Cannot Load Results</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/student/cbt">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                Back to CBT Portal
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const percentage = submission && submission.total_marks > 0 ? (submission.score || 0) / submission.total_marks * 100 : 0
  const passed = submission && submission.status === 'PASSED'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Exam Results</h1>
          <p className="text-gray-600">{submission.exam.title}</p>
        </div>

        {/* Score Card */}
        <div className={`rounded-lg shadow-lg p-8 mb-8 ${passed ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gradient-to-r from-red-50 to-orange-50'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Score Display */}
            <div className="text-center">
              <p className="text-gray-700 font-semibold mb-2">Your Score</p>
              <div className="text-5xl font-bold mb-2">
                {(submission.score || 0).toFixed(1)}
              </div>
              <p className="text-gray-600">out of {submission.total_marks || 0}</p>
            </div>

            {/* Percentage */}
            <div className="text-center">
              <p className="text-gray-700 font-semibold mb-2">Percentage</p>
              <div className={`text-5xl font-bold mb-2 ${percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {percentage.toFixed(1)}%
              </div>
              <p className="text-gray-600">of total marks</p>
            </div>

            {/* Status */}
            <div className="text-center">
              <p className="text-gray-700 font-semibold mb-2">Status</p>
              <div className={`text-5xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {passed ? '✅' : '❌'}
              </div>
              <p className={`text-lg font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {passed ? 'PASSED' : 'FAILED'}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-300">
            <p className="text-center text-gray-700">
              <strong>Passing Score:</strong> {(submission.passing_score || 0).toFixed(1)} ({submission.exam.passing_percentage}%)
            </p>
            <p className="text-center text-sm text-gray-600 mt-2">
              Submitted: {new Date(submission.submitted_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Review Button */}
        <div className="text-center mb-8">
          <button
            onClick={() => setShowReview(!showReview)}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {showReview ? '← Hide Review' : '📝 Review Answers'}
          </button>
        </div>

        {/* Answer Review */}
        {showReview && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <h2 className="text-2xl font-bold">Answer Review</h2>
            </div>

            <div className="divide-y">
              {submission.answers.map((answer, index) => {
                const isCorrect = answer.selected_option?.is_correct
                return (
                  <div key={answer.question_id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Question {index + 1}
                        </h3>
                        <p className="text-gray-700 mt-2">{answer.question.question_text}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full font-semibold ${
                        isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isCorrect ? '✅ Correct' : '❌ Incorrect'}
                      </div>
                    </div>

                    {answer.selected_option ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Your Answer:</p>
                        <p className="text-gray-900 font-medium">{answer.selected_option.option_text}</p>
                      </div>
                    ) : answer.answer_text ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Your Answer:</p>
                        <p className="text-gray-900 font-medium">{answer.answer_text}</p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-600 italic">No answer provided</p>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 mt-3">
                      Marks: <strong>{answer.question.marks}</strong>
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-center gap-4">
          <Link href="/student/cbt">
            <button className="px-8 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition">
              ← Back to CBT Portal
            </button>
          </Link>
          <Link href="/student/dashboard">
            <button className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
              Go to Dashboard →
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

