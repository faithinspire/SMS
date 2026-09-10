'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User, School } from '@/types'

// Grade calculation function (replaces deleted nigerian-subjects.ts)
const calculateGrade = (total: number): string => {
  if (total >= 90) return 'A'
  if (total >= 80) return 'B'
  if (total >= 70) return 'C'
  if (total >= 60) return 'D'
  if (total >= 50) return 'E'
  return 'F'
}

interface SubjectScore {
  subject_id: string
  subject_name: string
  subject_code: string
  teacher_name: string
  test1: number
  test2: number
  test3: number
  test4: number
  exam: number
  total: number
  grade: string
}

interface ScoreSheet {
  class_arm_combo_id: string
  class_name: string
  term: string
  subjects: SubjectScore[]
}

export default function StudentMarkSheetPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [scoreSheets, setScoreSheets] = useState<ScoreSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTerm, setSelectedTerm] = useState('')
  const [terms, setTerms] = useState<string[]>([])

  // Load user and school on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true)
        const currentUser = await AuthService.getCurrentUser()

        if (!currentUser) {
          router.push('/auth/student/login')
          return
        }

        if (currentUser.role !== 'STUDENT') {
          router.push('/landing')
          return
        }

        setUser(currentUser)

        // Get school data
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        if (schoolError) throw schoolError
        setSchool(schoolData)

        // Get student record
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id, class_arm_combo_id')
          .eq('user_id', currentUser.id)
          .single()

        if (studentError) throw studentError

        // Get all score sheets for this student
        await loadScoreSheets(currentUser.id, studentData.id)
      } catch (err) {
        console.error('Error loading user data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  const loadScoreSheets = async (userId: string, studentId: string) => {
    try {
      // Get score sheets
      const { data: scoreData, error: scoreError } = await supabase
        .from('score_sheets')
        .select(
          `
          *,
          subjects(id, name, code),
          users(full_name),
          class_arm_combos(name)
        `
        )
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (scoreError) throw scoreError

      // Group by term and class
      const sheets: { [key: string]: ScoreSheet } = {}

      (scoreData || []).forEach((score: any) => {
        const term = score.term || 'General'
        const classKey = `${score.class_arm_combo_id}-${term}`

        if (!sheets[classKey]) {
          sheets[classKey] = {
            class_arm_combo_id: score.class_arm_combo_id,
            class_name: score.class_arm_combos?.name || 'Unknown',
            term: term,
            subjects: [],
          }
        }

        sheets[classKey].subjects.push({
          subject_id: score.subject_id,
          subject_name: score.subjects?.name || 'Unknown',
          subject_code: score.subjects?.code || 'N/A',
          teacher_name: score.users?.full_name || 'Unknown',
          test1: score.test1 || 0,
          test2: score.test2 || 0,
          test3: score.test3 || 0,
          test4: score.test4 || 0,
          exam: score.exam || 0,
          total: score.total || 0,
          grade: score.grade || calculateGrade(score.total || 0),
        })
      })

      const sheetsList = Object.values(sheets)
      setScoreSheets(sheetsList)

      // Extract unique terms
      const uniqueTerms = [...new Set(sheetsList.map((s) => s.term))]
      setTerms(uniqueTerms)
      if (uniqueTerms.length > 0) {
        setSelectedTerm(uniqueTerms[0])
      }
    } catch (err) {
      console.error('Error loading score sheets:', err)
    }
  }

  // Filter by selected term
  const filteredScoreSheets = scoreSheets.filter((sheet) =>
    selectedTerm ? sheet.term === selectedTerm : true
  )

  // Calculate overall statistics
  const calculateOverallStats = () => {
    const allSubjects = filteredScoreSheets.flatMap((s) => s.subjects)
    if (allSubjects.length === 0) {
      return { avgTotal: 0, avgGrade: 'N/A', bestSubject: null, worstSubject: null }
    }

    const avgTotal = (
      allSubjects.reduce((sum, s) => sum + s.total, 0) / allSubjects.length
    ).toFixed(1)

    const bestSubject = allSubjects.reduce((best, current) =>
      current.total > best.total ? current : best
    )

    const worstSubject = allSubjects.reduce((worst, current) =>
      current.total < worst.total ? current : worst
    )

    return {
      avgTotal: parseFloat(avgTotal as string),
      avgGrade: calculateGrade(parseFloat(avgTotal as string)),
      bestSubject: bestSubject.subject_name,
      worstSubject: worstSubject.subject_name,
    }
  }

  const stats = calculateOverallStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading mark sheet...</div>
      </div>
    )
  }

  if (!user || !school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Error loading data</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">My Mark Sheet</h1>
              <p className="text-blue-100 mt-1">View your academic scores and grades</p>
              <p className="text-sm text-blue-200 mt-2">{school.name}</p>
            </div>
            <div className="text-right">
              <button
                onClick={() => window.print()}
                className="px-6 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Term Selection */}
        {terms.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Term/Period
            </label>
            <div className="flex gap-2">
              {terms.map((term) => (
                <button
                  key={term}
                  onClick={() => setSelectedTerm(term)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedTerm === term
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Overall Statistics */}
        {filteredScoreSheets.flatMap((s) => s.subjects).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-3xl font-bold text-blue-600">
                {stats.avgTotal.toFixed(1)}/100
              </div>
              <div className="text-sm text-blue-700">Overall Average</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-3xl font-bold text-purple-600">{stats.avgGrade}</div>
              <div className="text-sm text-purple-700">Average Grade</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-lg font-bold text-green-600 truncate">
                {stats.bestSubject}
              </div>
              <div className="text-sm text-green-700">Best Subject</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-lg font-bold text-orange-600 truncate">
                {stats.worstSubject}
              </div>
              <div className="text-sm text-orange-700">Needs Improvement</div>
            </div>
          </div>
        )}

        {/* Mark Sheets */}
        {filteredScoreSheets.length > 0 ? (
          <div className="space-y-6">
            {filteredScoreSheets.map((sheet, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Sheet Header */}
                <div className="bg-gray-100 border-b border-gray-200 p-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {sheet.class_name}
                    {sheet.term && <span className="text-gray-600 text-lg"> - {sheet.term}</span>}
                  </h2>
                </div>

                {/* Scores Table */}
                <table className="w-full">
                  <thead className="bg-blue-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                        Test 1
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                        Test 2
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                        Test 3
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                        Test 4
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                        Exam
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                        Total
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                        Grade
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Teacher
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.subjects.map((subject, sidx) => (
                      <tr key={sidx} className={sidx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {subject.subject_name}
                          <span className="text-xs text-gray-600 ml-1">({subject.subject_code})</span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          {subject.test1}/10
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          {subject.test2}/10
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          {subject.test3}/10
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          {subject.test4}/10
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          {subject.exam}/60
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-blue-600">
                          {subject.total}/100
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              subject.total >= 70
                                ? 'bg-green-100 text-green-800'
                                : subject.total >= 50
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {subject.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {subject.teacher_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Class Average */}
                <div className="bg-gray-50 border-t border-gray-200 p-6">
                  <div className="flex justify-end">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Class Average:</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {(
                          sheet.subjects.reduce((sum, s) => sum + s.total, 0) /
                          sheet.subjects.length
                        ).toFixed(1)}/100
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-500 text-lg">
              {selectedTerm
                ? `No scores available for ${selectedTerm}`
                : 'No scores available yet'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Check back later when your teachers have entered your marks
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
