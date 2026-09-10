'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'
import ExamHeader from '@/components/ExamHeader'

interface Question {
  id: string
  question_text: string
  question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'THEORY'
  marks: number
  display_order: number
  cbt_exam_id: string
  options: Option[]
}

interface Option {
  id: string
  option_text: string
  is_correct: boolean
  display_order: number
  question_id: string
}

interface CBTExam {
  id: string
  title: string
  subject_id: string
  subject_name?: string
  duration_minutes: number
  total_marks: number
  passing_percentage: number
  start_time: string
  end_time: string
}

interface Answer {
  question_id: string
  selected_option_id: string | null
  answer_text: string
}

export default function StudentCBTPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exam, setExam] = useState<CBTExam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map())
  const [timeLeft, setTimeLeft] = useState(0)
  const [started, setStarted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [studentId, setStudentId] = useState<string>('')

  useEffect(() => {
    loadExam()
  }, [])

  useEffect(() => {
    if (!started || submitted || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [started, submitted, timeLeft])

  const loadExam = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser) {
        console.error('[CBT Exam] No user logged in')
        setError('Please log in to access exams')
        return
      }

      console.log('[CBT Exam] User logged in:', currentUser.id, 'Role:', currentUser.role, 'School:', currentUser.school_id)

      // CRITICAL: Check if user has a school_id - this is the real requirement
      if (!currentUser.school_id) {
        console.error('[CBT Exam] User has no school_id, cannot access exam')
        setError('Your account is not configured for this school. Please contact your administrator.')
        return
      }

      // Warn if role is not STUDENT, but allow access anyway
      // The real security is in the database query filtering by school_id
      if (currentUser.role && currentUser.role !== 'STUDENT') {
        console.warn('[CBT Exam] User role mismatch. Expected STUDENT, got:', currentUser.role)
        // Still allow access - role might not have synced to database yet
      }

      setUser(currentUser)

      // OPTIMIZED: Fetch student ID in parallel with exam data
      // This caches the studentId so ExamHeader doesn't need to look it up again
      const [studentResponse, examResponse] = await Promise.all([
        supabase
          .from('students')
          .select('id')
          .eq('user_id', currentUser.id)
          .single(),
        supabase
          .from('cbt_exams')
          .select(`
            id, title, subject_id, duration_minutes, total_marks, 
            passing_percentage, start_time, end_time, school_id
          `)
          .eq('id', examId)
          .eq('school_id', currentUser.school_id)
          .single(),
      ])

      const { data: studentData, error: studentError } = studentResponse
      const { data: examData, error: examError } = examResponse

      if (studentError || !studentData) {
        console.error('Student lookup error:', studentError)
        setError('Student record not found')
        return
      }

      // Cache the student ID for ExamHeader to use
      setStudentId(studentData.id)

      if (examError || !examData) {
        setError('Exam not found')
        return
      }

      // Check if exam is still available
      const now = new Date()
      const startTime = new Date(examData.start_time)
      const endTime = new Date(examData.end_time)

      if (now < startTime) {
        setError('Exam has not started yet')
        return
      }

      if (now > endTime) {
        setError('Exam time has ended')
        return
      }

      // Load subject name
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', examData.subject_id)
        .single()

      setExam({
        ...examData,
        subject_name: subjectData?.name || 'Unknown Subject',
      })

      // Load questions and options
      const { data: questionsData, error: questionsError } = await supabase
        .from('cbt_questions')
        .select('id, question_text, question_type, marks, display_order, cbt_exam_id')
        .eq('cbt_exam_id', examId)
        .order('display_order', { ascending: true })

      if (questionsError) {
        console.error('Questions query error:', questionsError)
        setError('Failed to load questions: ' + questionsError.message)
        return
      }

      if (!questionsData || questionsData.length === 0) {
        console.error('No questions found for exam')
        setError('No questions found for this exam')
        return
      }

      // Load options for each question
      const { data: optionsData, error: optionsError } = await supabase
        .from('cbt_options')
        .select('id, option_text, is_correct, display_order, question_id')
        .in('question_id', questionsData.map((q) => q.id))
        .order('question_id', { ascending: true })
        .order('display_order', { ascending: true })

      if (optionsError) {
        console.error('[CBT] ❌ Options query error:', optionsError)
        setError('Failed to load question options: ' + optionsError.message)
        return
      }

      console.log(`[CBT] ✅ Loaded ${questionsData.length} questions, ${optionsData?.length || 0} options`)

      // Build options map
      const optionsMap = new Map<string, Option[]>()
      optionsData?.forEach((option) => {
        if (!optionsMap.has(option.question_id)) {
          optionsMap.set(option.question_id, [])
        }
        optionsMap.get(option.question_id)!.push(option)
      })

      // Log detailed breakdown
      questionsData.forEach((q) => {
        const qOptions = optionsMap.get(q.id) || []
        console.log(
          `[CBT] Q${questionsData.indexOf(q) + 1}: "${q.question_text.substring(0, 50)}..." | Type: ${q.question_type} | Options: ${qOptions.length}`
        )
        qOptions.forEach((opt, idx) => {
          console.log(`  [CBT] Option ${idx + 1}: "${opt.option_text}" | Correct: ${opt.is_correct}`)
        })
      })

      const questionsWithOptions: Question[] = questionsData.map((q) => ({
        ...q,
        options: optionsMap.get(q.id) || [],
      }))

      setQuestions(questionsWithOptions)

      // Set initial time
      const durationMs = examData.duration_minutes * 60
      setTimeLeft(durationMs)
    } catch (err: any) {
      console.error('Load exam error:', err)
      setError('Failed to load exam: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStart = () => {
    setStarted(true)
  }

  const handleAnswerSelect = (optionId: string) => {
    const question = questions[currentQuestionIndex]
    if (!question) return

    const newAnswers = new Map(answers)
    newAnswers.set(question.id, {
      question_id: question.id,
      selected_option_id: optionId,
      answer_text: '',
    })
    setAnswers(newAnswers)
  }

  const handleAnswerText = (text: string) => {
    const question = questions[currentQuestionIndex]
    if (!question) return

    const newAnswers = new Map(answers)
    newAnswers.set(question.id, {
      question_id: question.id,
      selected_option_id: null,
      answer_text: text,
    })
    setAnswers(newAnswers)
  }

  const handlePrevious = () => {
    console.log(`[CBT] ⬅️ Previous: ${currentQuestionIndex} → ${currentQuestionIndex - 1}`)
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleNext = () => {
    console.log(`[CBT] ➡️ Next: ${currentQuestionIndex} → ${currentQuestionIndex + 1}`)
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handleSubmit = useCallback(async () => {
    if (submitted || submitting) return

    try {
      setSubmitting(true)
      setError('')

      if (!user || !exam || !studentId) {
        setError('User, exam, or student data missing')
        return
      }

      // Create submission record - studentId is already cached from loadExam
      const { data: submissionData, error: submissionError } = await supabase
        .from('cbt_submissions')
        .insert({
          student_id: studentId,
          cbt_exam_id: exam.id,
          started_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          school_id: user.school_id,
        })
        .select()
        .single()

      if (submissionError) {
        console.error('Submission error:', submissionError)
        setError('Failed to submit exam: ' + submissionError.message)
        return
      }

      // Save answers
      const answersToSave = Array.from(answers.values()).map((answer) => ({
        submission_id: submissionData.id,
        question_id: answer.question_id,
        selected_option_id: answer.selected_option_id,
        answer_text: answer.answer_text,
        school_id: user.school_id,
      }))

      if (answersToSave.length > 0) {
        const { error: answersError } = await supabase
          .from('cbt_answers')
          .insert(answersToSave)

        if (answersError) {
          console.error('Answers insert error:', answersError)
        }
      }

      // Calculate score
      let score = 0
      for (const answer of answers.values()) {
        if (!answer.selected_option_id) continue

        const question = questions.find((q) => q.id === answer.question_id)
        const option = question?.options.find((o) => o.id === answer.selected_option_id)

        if (option?.is_correct) {
          score += question?.marks || 0
        }
      }

      // Update submission with score
      const passingScore = Math.ceil((exam.passing_percentage / 100) * exam.total_marks)
      const passed = score >= passingScore

      await supabase
        .from('cbt_submissions')
        .update({
          score: score,
          total_marks: exam.total_marks,
          passing_score: passingScore,
          percentage: Math.round((score / exam.total_marks) * 100),
          passed: passed,
          status: passed ? 'PASSED' : 'FAILED',
          graded_at: new Date().toISOString(),
        })
        .eq('id', submissionData.id)

      // Sync CBT score to score_sheets
      try {
        console.log('🔄 Syncing score to gradebook...')
        const syncResponse = await fetch('/api/cbt/submissions/sync-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submission_id: submissionData.id }),
        })

        const syncData = await syncResponse.json()
        
        if (!syncResponse.ok) {
          console.warn('Failed to sync score to score_sheets:', syncData)
          // Don't fail submission - just log warning
        } else {
          console.log('✅ Score synced to gradebook:', syncData.score_sheet_id)
        }
      } catch (syncError) {
        console.error('Sync error:', syncError)
        // Don't fail the submission if sync fails - it's not critical
      }

      setSubmitted(true)
      console.log('✅ Exam submitted successfully, submission ID:', submissionData.id)

      // Redirect to results after 2 seconds
      setTimeout(() => {
        console.log('📍 Redirecting to results page...')
        router.push(`/student/cbt/${exam.id}/results?submission=${submissionData.id}`)
      }, 2000)
    } catch (err: any) {
      console.error('Submit error:', err)
      setError('Failed to submit: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }, [answers, exam, user, questions, submitted, submitting, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    )
  }

  if (error && !started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Cannot Start Exam</h1>
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

  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <p className="text-gray-600">No exam or questions found</p>
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">📝</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{exam.title}</h1>
            <p className="text-gray-600 mb-6">{exam.subject_name}</p>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Duration:</strong> {exam.duration_minutes} minutes
              </p>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Total Marks:</strong> {exam.total_marks}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Passing:</strong> {exam.passing_percentage}%
              </p>
            </div>

            <button
              onClick={handleStart}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition"
            >
              📝 Start Exam
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Exam Submitted</h1>
            <p className="text-gray-600 mb-6">Redirecting to results...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-indigo-500 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  const question = questions[currentQuestionIndex]
  const currentAnswer = answers.get(question?.id || '')
  const minPercentage = Math.ceil((timeLeft / (exam.duration_minutes * 60)) * 100)
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <ExamHeader studentId={studentId} examId={examId} timeRemaining={started && !submitted ? timeLeft : null} />
      
      {/* Header with Timer */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{exam.title}</h1>
              <p className="text-blue-100">{exam.subject_name}</p>
            </div>
            <div className={`text-right p-4 rounded-lg ${minPercentage < 20 ? 'bg-red-500' : minPercentage < 50 ? 'bg-yellow-500' : 'bg-green-500'}`}>
              <p className="text-sm font-semibold">⏱ Time Remaining</p>
              <p className="text-3xl font-bold">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm font-semibold text-gray-700">
              {answers.size} answered
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{question.question_text}</h2>
          <p className="text-gray-600 mb-6">Marks: {question.marks}</p>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {question.question_type === 'MULTIPLE_CHOICE' || question.question_type === 'TRUE_FALSE' ? (
              <>
                {question.options && question.options.length > 0 ? (
                  question.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleAnswerSelect(option.id)}
                      className={`w-full text-left p-4 border-2 rounded-lg transition ${
                        currentAnswer?.selected_option_id === option.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center ${
                            currentAnswer?.selected_option_id === option.id
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {currentAnswer?.selected_option_id === option.id && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{option.option_text}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-center">
                    <p className="text-red-700 font-semibold">⚠️ No options found</p>
                    <p className="text-red-600 text-sm mt-2">
                      This question has no answer options. Please contact your teacher.
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Theory Answer (for THEORY questions) */}
          {question.question_type === 'THEORY' && (
            <textarea
              placeholder="Type your answer here..."
              value={currentAnswer?.answer_text || ''}
              onChange={(e) => handleAnswerText(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
            ></textarea>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-4 mb-6">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
              currentQuestionIndex === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
            }`}
          >
            <span>←</span>
            <span>Previous</span>
          </button>

          <div className="flex-1 flex gap-1 overflow-x-auto px-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  console.log(`[CBT] Jump to question ${index + 1}`)
                  setCurrentQuestionIndex(index)
                }}
                className={`min-w-10 px-3 py-2 rounded font-semibold text-sm transition flex-shrink-0 ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : answers.has(questions[index].id)
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentQuestionIndex === questions.length - 1}
            className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
              currentQuestionIndex === questions.length - 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
            }`}
          >
            <span>Next</span>
            <span>→</span>
          </button>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full mt-8 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition text-lg"
        >
          {submitting ? '⏳ Submitting...' : '✅ Submit Exam'}
        </button>
      </div>
    </div>
  )
}

// Helper function
function Object_size(obj: Map<any, any>): number {
  return obj.size
}

declare global {
  namespace globalThis {
    function Object_size(obj: Map<any, any>): number
  }
}

