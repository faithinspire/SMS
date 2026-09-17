'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import StaffHeader from '@/components/StaffHeader'

interface ClassResult {
  id: string
  class_name: string
  arm_name: string
  students: StudentResult[]
}

interface StudentResult {
  id: string
  full_name: string
  admission_number: string
  overall_score: number
  performance_rating: string
}

export default function SchoolAdminResultsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<ClassResult[]>([])
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [selectedClassData, setSelectedClassData] = useState<ClassResult | null>(null)
  const [terms, setTerms] = useState<any[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedTerm) {
      loadClassesForTerm(selectedTerm)
    }
  }, [selectedTerm])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || !['SCHOOL_ADMIN', 'ADMIN'].includes(currentUser.role)) {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (currentUser.school_id) {
        // Load school
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        setSchool(schoolData)

        // Load available terms
        const { data: sessionData } = await supabase
          .from('academic_sessions')
          .select('id, session_year')
          .eq('school_id', currentUser.school_id)
          .order('session_year', { ascending: false })

        if (sessionData && sessionData.length > 0) {
          const { data: termData } = await supabase
            .from('academic_terms')
            .select('id, term_name')
            .in(
              'session_id',
              sessionData.map((s) => s.id)
            )
            .order('term_name', { ascending: true })

          console.log('[SchoolAdmin] Available terms:', termData?.length || 0)
          setTerms(termData || [])

          // Auto-select active term or first term
          const { data: activeTerm } = await supabase
            .from('academic_terms')
            .select('id')
            .eq('session_id', sessionData[0].id)
            .eq('is_active', true)
            .limit(1)
            .single()

          if (activeTerm) {
            setSelectedTerm(activeTerm.id)
          } else if (termData && termData.length > 0) {
            setSelectedTerm(termData[0].id)
          }
        }
      }
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadClassesForTerm = async (termId: string) => {
    try {
      if (!user?.school_id) return

      console.log('[SchoolAdmin] Loading classes for term:', termId)

      // Load all classes
      const { data: classesData } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          classes(id, name),
          arms(id, name)
        `)
        .eq('school_id', user.school_id)

      // Get results for each class
      const classResults: ClassResult[] = []

      for (const classCombo of classesData || []) {
        const className = classCombo.classes?.name || 'Class'
        const armName = classCombo.arms?.name || ''
        const fullName = armName ? `${className} ${armName}` : className

        try {
          console.log('[SchoolAdmin] Fetching results for class:', fullName)

          // Call class summary API with cache-busting
          const apiUrl = `/api/results/class-summary/${classCombo.id}?schoolId=${user.school_id}&termId=${termId}&t=${Date.now()}`
          const response = await fetch(apiUrl)

          if (!response.ok) {
            console.error('[SchoolAdmin] API error:', response.status)
            throw new Error(`API returned ${response.status}`)
          }

          const data = await response.json()

          const studentResults: StudentResult[] = data.students || []

          classResults.push({
            id: classCombo.id,
            class_name: className,
            arm_name: armName,
            students: studentResults,
          })

          console.log('[SchoolAdmin] Class results loaded:', fullName, 'students:', studentResults.length)
        } catch (err) {
          console.error('[SchoolAdmin] Error loading class results:', err)
          classResults.push({
            id: classCombo.id,
            class_name: className,
            arm_name: armName,
            students: [],
          })
        }
      }

      setClasses(classResults)
      setSelectedClass(null)
      setSelectedClassData(null)
      console.log('[SchoolAdmin] All classes loaded')
    } catch (error) {
      console.error('[SchoolAdmin] Load classes error:', error)
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      <StaffHeader
        staffName={user?.full_name || 'Admin'}
        schoolName={school?.name || 'School'}
        section="Student Results"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">📊 Student Results & Performance</h1>

        {/* Term Filter */}
        <div className="mb-6 bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg shadow-2xl p-4">
          <label className="block text-sm font-semibold text-gray-300 mb-2">Filter by Term:</label>
          <select
            value={selectedTerm || ''}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-4 py-2 border-2 border-slate-600 rounded-lg focus:border-purple-600 focus:outline-none bg-slate-700 text-white"
          >
            <option value="">-- Select Term --</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.term_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Classes List */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4">
                <h2 className="text-xl font-bold">Classes</h2>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {classes.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    <p>No classes found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {classes.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => {
                          setSelectedClass(cls.id)
                          setSelectedClassData(cls)
                        }}
                        className={`w-full text-left p-4 hover:bg-slate-700/30 transition-colors border-l-4 ${
                          selectedClass === cls.id
                            ? 'border-purple-600 bg-slate-700/50'
                            : 'border-slate-700/50'
                        }`}
                      >
                        <h3 className="font-bold text-white">
                          {cls.class_name} {cls.arm_name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {cls.students.length} students
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div className="lg:col-span-3">
            {selectedClassData ? (
              <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4">
                  <h2 className="text-2xl font-bold">
                    {selectedClassData.class_name} {selectedClassData.arm_name}
                  </h2>
                  <p className="text-sm text-purple-100 mt-1">
                    {selectedClassData.students.length} Students
                  </p>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-700/50">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-gray-300">#</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-300">Student Name</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-300">Admission #</th>
                        <th className="px-6 py-3 text-center font-semibold text-gray-300">Overall Score</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-300">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {selectedClassData.students.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                            No results available
                          </td>
                        </tr>
                      ) : (
                        selectedClassData.students.map((student, index) => (
                          <tr key={student.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-4 font-bold text-white">{index + 1}</td>
                            <td className="px-6 py-4 text-gray-300">{student.full_name}</td>
                            <td className="px-6 py-4 text-gray-400">{student.admission_number}</td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-bold text-lg text-purple-300">
                                {student.overall_score.toFixed(2)}
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
              <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg shadow-2xl p-8 text-center text-gray-400">
                <p className="text-lg">👈 Select a class to view results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
