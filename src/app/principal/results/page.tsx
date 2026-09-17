'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import StaffHeader from '@/components/StaffHeader'

interface ClassWithStudents {
  id: string
  class_name: string
  arm_name: string
  student_count: number
  students: StudentResult[]
}

interface StudentResult {
  id: string
  full_name: string
  admission_number: string
  overall_score: number
  performance_rating: string
}

interface Session {
  id: string
  session_year: string
  is_active: boolean
}

interface Term {
  id: string
  session_id: string
  term_name: string
  term_number: number
  is_active: boolean
}

export default function PrincipalResultsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<ClassWithStudents[]>([])
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [selectedClassData, setSelectedClassData] = useState<ClassWithStudents | null>(null)
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null)
  const [loadingClasses, setLoadingClasses] = useState(false)

  // Load on mount
  useEffect(() => {
    loadInitialData()
  }, [])

  // When session changes, load its terms
  useEffect(() => {
    if (selectedSession) {
      const sessionTerms = terms.filter((t) => t.session_id === selectedSession)
      if (sessionTerms.length > 0) {
        setSelectedTerm(sessionTerms[0].id)
      }
    }
  }, [selectedSession])

  // When term changes, load classes and students
  useEffect(() => {
    if (selectedTerm && user?.school_id) {
      loadClassesForTerm(user.school_id, selectedTerm)
    }
  }, [selectedTerm, user?.school_id])

  // Auto-select first class when classes load
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      console.log('[Principal] Auto-selecting first class:', classes[0].class_name)
      setSelectedClass(classes[0].id)
      setSelectedClassData(classes[0])
    }
  }, [classes])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      console.log('[Principal] Loading initial data...')

      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || !['PRINCIPAL', 'HEAD_TEACHER'].includes(currentUser.role)) {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (!currentUser.school_id) {
        console.error('[Principal] No school ID found')
        return
      }

      // Load school info
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id, name, logo_url')
        .eq('id', currentUser.school_id)
        .single()

      setSchool(schoolData)
      console.log('[Principal] School loaded:', schoolData?.name)

      // Load sessions and terms
      console.log('[Principal] Loading sessions and terms...')
      const response = await fetch(
        `/api/results/school-sessions-and-terms?schoolId=${currentUser.school_id}`
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('[Principal] Sessions and terms loaded:', {
        sessions: data.sessions?.length || 0,
        terms: data.terms?.length || 0,
      })

      setSessions(data.sessions || [])
      setTerms(data.terms || [])

      // Auto-select first session
      if (data.sessions && data.sessions.length > 0) {
        const firstSession = data.sessions[0]
        console.log('[Principal] Auto-selecting session:', firstSession.session_year)
        setSelectedSession(firstSession.id)
      }
    } catch (error) {
      console.error('[Principal] Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadClassesForTerm = async (schoolId: string, termId: string) => {
    try {
      setLoadingClasses(true)
      console.log('[Principal] Loading classes for term:', termId)

      const response = await fetch(
        `/api/results/school-classes-and-students?schoolId=${schoolId}&termId=${termId}&t=${Date.now()}`
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('[Principal] Classes loaded:', data.classes?.length || 0)

      setClasses(data.classes || [])
      setSelectedClass(null)
      setSelectedClassData(null)
    } catch (error) {
      console.error('[Principal] Error loading classes:', error)
      setClasses([])
      setSelectedClass(null)
      setSelectedClassData(null)
    } finally {
      setLoadingClasses(false)
    }
  }

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'Excellent':
        return 'bg-green-100 text-green-800'
      case 'Very Good':
        return 'bg-blue-100 text-blue-800'
      case 'Good':
        return 'bg-cyan-100 text-cyan-800'
      case 'Fair':
        return 'bg-yellow-100 text-yellow-800'
      case 'Poor':
        return 'bg-orange-100 text-orange-800'
      case 'Very Poor':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500 border-t-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <StaffHeader
        staffName={user?.full_name || 'Principal'}
        schoolName={school?.name || 'School'}
        section="Student Results"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">📊 Student Results & Performance</h1>

        {/* Session and Term Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Session:</label>
            <select
              value={selectedSession || ''}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-600 focus:outline-none"
            >
              <option value="">-- Select Session --</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.session_year} {session.is_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Term:</label>
            <select
              value={selectedTerm || ''}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-600 focus:outline-none"
              disabled={!selectedSession}
            >
              <option value="">-- Select Term --</option>
              {terms
                .filter((t) => t.session_id === selectedSession)
                .map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.term_name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Classes List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-amber-600 text-white px-6 py-4">
                <h2 className="text-xl font-bold">Classes ({classes.length})</h2>
              </div>
              {loadingClasses ? (
                <div className="p-6 text-center text-gray-600">
                  <p>Loading classes...</p>
                </div>
              ) : classes.length === 0 ? (
                <div className="p-6 text-center text-gray-600">
                  <p>No classes found</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <div className="divide-y">
                    {classes.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => {
                          setSelectedClass(cls.id)
                          setSelectedClassData(cls)
                        }}
                        className={`w-full text-left p-4 hover:bg-amber-50 transition-colors border-l-4 ${
                          selectedClass === cls.id
                            ? 'border-amber-600 bg-amber-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <h3 className="font-bold text-gray-900">
                          {cls.class_name} {cls.arm_name}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          👥 {cls.student_count} students
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Display */}
          <div className="lg:col-span-3">
            {selectedClassData ? (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-4">
                  <h2 className="text-2xl font-bold">
                    {selectedClassData.class_name} {selectedClassData.arm_name}
                  </h2>
                  <p className="text-sm text-amber-100 mt-1">
                    📊 {selectedClassData.student_count} Students
                  </p>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-gray-900">#</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-900">Student Name</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-900">Admission #</th>
                        <th className="px-6 py-3 text-center font-semibold text-gray-900">Overall Score</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-900">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedClassData.students.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-600">
                            No students in this class
                          </td>
                        </tr>
                      ) : (
                        selectedClassData.students.map((student, index) => (
                          <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900">{index + 1}</td>
                            <td className="px-6 py-4 text-gray-900">{student.full_name}</td>
                            <td className="px-6 py-4 text-gray-600">{student.admission_number}</td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-bold text-lg text-gray-900">
                                {student.overall_score}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPerformanceColor(student.performance_rating)}`}>
                                {student.performance_rating}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                <p className="text-lg">👈 Select a class to view results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
