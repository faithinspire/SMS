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

export default function PrincipalResultsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<ClassResult[]>([])
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [selectedClassData, setSelectedClassData] = useState<ClassResult | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [terms, setTerms] = useState<any[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null)

  // Force refresh on mount
  useEffect(() => {
    // Clear any cached data
    localStorage.removeItem('principalResultsCache')
    sessionStorage.removeItem('principalResultsCache')
    loadData()
  }, [])

  // Reload classes when selected term changes
  useEffect(() => {
    if (selectedTerm) {
      loadClassesForTerm(selectedTerm)
    }
  }, [selectedTerm])

  // Auto-select first class when classes load
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      console.log('[Principal] Auto-selecting first class:', classes[0].class_name)
      setSelectedClass(classes[0].id)
      setSelectedClassData(classes[0])
    }
  }, [classes, selectedClass])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log('[Principal] Loading data...')
      
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || !['PRINCIPAL', 'HEAD_TEACHER'].includes(currentUser.role)) {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (currentUser.school_id) {
        console.log('[Principal] School ID:', currentUser.school_id)
        
        // Load school
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        if (schoolError) {
          console.error('[Principal] School fetch error:', schoolError)
          throw schoolError
        }

        setSchool(schoolData)
        console.log('[Principal] School loaded:', schoolData?.name)

        // Load all terms directly (skip sessions - they may not exist)
        console.log('[Principal] Loading terms directly...')
        const { data: termData, error: termError } = await supabase
          .from('academic_terms')
          .select('id, term_name, session_id')
          .order('term_name', { ascending: true })

        if (termError) {
          console.error('[Principal] Terms fetch error:', termError)
          throw termError
        }

        console.log('[Principal] Available terms:', termData?.length || 0)
        setTerms(termData || [])

        if (termData && termData.length > 0) {
          // Auto-select the first term
          const firstTerm = termData[0]
          console.log('[Principal] Auto-selecting term:', firstTerm.id, firstTerm.term_name)
          setSelectedTerm(firstTerm.id)
          // Immediately load classes for this term
          await loadClassesForTermImmediate(currentUser.school_id, firstTerm.id)
        }
      }
    } catch (error) {
      console.error('[Principal] Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadClassesForTermImmediate = async (schoolId: string, termId: string) => {
    try {
      console.log('[Principal] Loading classes immediately for term:', termId)

      // Load all classes
      const { data: classesData, error: classesError } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          classes(id, name),
          arms(id, name)
        `)
        .eq('school_id', schoolId)

      if (classesError) {
        console.error('[Principal] Classes fetch error:', classesError)
        return
      }

      console.log('[Principal] Classes loaded:', classesData?.length || 0)

      // Get results for each class
      const classResults: ClassResult[] = []

      for (const classCombo of classesData || []) {
        const className = classCombo.classes?.name || 'Class'
        const armName = classCombo.arms?.name || ''
        const fullName = armName ? `${className} ${armName}` : className

        try {
          console.log('[Principal] Fetching results for class:', fullName)
          
          // Call class summary API with cache-busting
          const apiUrl = `/api/results/class-summary/${classCombo.id}?schoolId=${schoolId}&termId=${termId}&t=${Date.now()}`
          const response = await fetch(apiUrl)
          
          if (!response.ok) {
            console.error('[Principal] API error:', response.status)
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
          
          console.log('[Principal] Class results loaded:', fullName, 'students:', studentResults.length)
        } catch (err) {
          console.error('[Principal] Error loading class results:', err)
          classResults.push({
            id: classCombo.id,
            class_name: className,
            arm_name: armName,
            students: [],
          })
        }
      }

      setClasses(classResults)
      if (classResults.length > 0) {
        setSelectedClass(classResults[0].id)
        setSelectedClassData(classResults[0])
      }
      console.log('[Principal] All classes loaded')
    } catch (error) {
      console.error('[Principal] Load classes error:', error)
    }
  }

  const loadClassesForTerm = async (termId: string) => {
    try {
      if (!user?.school_id) return
      await loadClassesForTermImmediate(user.school_id, termId)
    } catch (error) {
      console.error('[Principal] Load classes error:', error)
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

        {/* Term Filter */}
        <div className="mb-6 bg-white rounded-lg shadow-lg p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Term:</label>
          <select
            value={selectedTerm || ''}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-600 focus:outline-none"
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
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-amber-600 text-white px-6 py-4">
                <h2 className="text-xl font-bold">Classes</h2>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {classes.length === 0 ? (
                  <div className="p-6 text-center text-gray-600">
                    <p>No classes found</p>
                  </div>
                ) : (
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
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-4">
                  <h2 className="text-2xl font-bold">
                    {selectedClassData.class_name} {selectedClassData.arm_name}
                  </h2>
                  <p className="text-sm text-amber-100 mt-1">
                    {selectedClassData.students.length} Students
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
                            No results available
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
