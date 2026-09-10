'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function FixSubjectsPage() {
  const router = useRouter()
  const [schoolId, setSchoolId] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'diagnosing' | 'fixing' | 'done'>('idle')
  const [diagnostic, setDiagnostic] = useState<any>(null)
  const [fixResult, setFixResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [schools, setSchools] = useState<any[]>([])

  // Load schools on mount
  useEffect(() => {
    loadSchools()
  }, [])

  const loadSchools = async () => {
    try {
      const { data } = await supabase
        .from('schools')
        .select('id, name')
        .limit(10)
      setSchools(data || [])
    } catch (err) {
      console.error('Failed to load schools:', err)
    }
  }

  const runDiagnostic = async () => {
    if (!schoolId) {
      setError('Please select a school')
      return
    }

    setLoading(true)
    setStatus('diagnosing')
    setError('')

    try {
      const response = await fetch(`/api/fix-subjects?schoolId=${schoolId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Diagnostic failed')
      }

      setDiagnostic(data)
      setStatus('idle')
    } catch (err: any) {
      setError(err.message || 'Diagnostic failed')
      setStatus('idle')
    } finally {
      setLoading(false)
    }
  }

  const runFix = async () => {
    if (!schoolId) {
      setError('Please select a school')
      return
    }

    setLoading(true)
    setStatus('fixing')
    setError('')

    try {
      const response = await fetch(`/api/fix-subjects?schoolId=${schoolId}`, {
        method: 'POST'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fix failed')
      }

      setFixResult(data)
      setStatus('done')
    } catch (err: any) {
      setError(err.message || 'Fix failed')
      setStatus('idle')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🔧 Subject Configuration Fix</h1>
          <p className="text-gray-400">Repair "No subject available" errors in registration</p>
        </div>

        {/* School Selection */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Select School</h2>
          <div className="space-y-3">
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
            >
              <option value="">-- Select a school --</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>
                  {school.name} ({school.id.slice(0, 8)}...)
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400">
              Or paste school ID directly above
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-6 text-red-200">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={loadSchools}
            disabled={loading}
            className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50"
          >
            Reload Schools
          </button>
          <button
            onClick={runDiagnostic}
            disabled={loading || !schoolId}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {status === 'diagnosing' ? '⏳ Diagnosing...' : '🔍 Run Diagnostic'}
          </button>
          <button
            onClick={runFix}
            disabled={loading || !schoolId || !diagnostic}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {status === 'fixing' ? '⏳ Fixing...' : '🔧 Fix Now'}
          </button>
        </div>

        {/* Diagnostic Results */}
        {diagnostic && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">📊 Diagnostic Results</h2>

            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-slate-700 rounded p-4">
                <p className="text-sm text-gray-400">Status</p>
                <p className="text-lg font-bold text-white">{diagnostic.diagnostics.status}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700 rounded p-4">
                  <p className="text-sm text-gray-400">Total Subjects</p>
                  <p className="text-3xl font-bold text-blue-400">{diagnostic.diagnostics.totalSubjects}</p>
                </div>
                <div className="bg-slate-700 rounded p-4">
                  <p className="text-sm text-gray-400">Subjects with Empty Levels</p>
                  <p className="text-3xl font-bold text-red-400">{diagnostic.diagnostics.subjectsWithEmptyLevels}</p>
                </div>
              </div>

              {/* Broken Subjects */}
              {diagnostic.diagnostics.brokenSubjects.length > 0 && (
                <div className="bg-red-900/20 border border-red-600 rounded p-4">
                  <p className="text-sm font-bold text-red-200 mb-2">❌ Subjects Needing Fix:</p>
                  <ul className="space-y-1">
                    {diagnostic.diagnostics.brokenSubjects.map((subj: any) => (
                      <li key={subj.id} className="text-red-300 text-sm">
                        {subj.name} ({subj.code})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subjects Per Class */}
              <div className="bg-slate-700 rounded p-4">
                <p className="text-sm font-bold text-white mb-3">📚 Subjects Per Class:</p>
                <div className="space-y-2">
                  {Object.entries(diagnostic.diagnostics.subjectsPerClass).map(([className, data]: any) => (
                    <div key={className} className="text-sm">
                      <p className="text-gray-300">
                        {className}: <span className="font-bold text-blue-400">{data.subjectCount}</span> subjects
                      </p>
                      {data.subjects.length > 0 && (
                        <p className="text-gray-400 ml-4 text-xs">
                          {data.subjects.slice(0, 3).join(', ')}{data.subjects.length > 3 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fix Results */}
        {fixResult && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-green-600/50">
            <h2 className="text-xl font-bold text-green-400 mb-4">✅ Fix Complete</h2>

            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-green-900/20 rounded p-4 border border-green-600">
                <p className="text-lg font-bold text-green-300">{fixResult.message}</p>
                <p className="text-green-200 mt-2">
                  Fixed: <span className="font-bold">{fixResult.summary.subjectsFixed}</span> subjects
                </p>
              </div>

              {/* Fixed Subjects */}
              {fixResult.summary.fixedDetails.length > 0 && (
                <div className="bg-slate-700 rounded p-4">
                  <p className="text-sm font-bold text-white mb-3">Fixed Subjects:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {fixResult.summary.fixedDetails.map((detail: any, idx: number) => (
                      <div key={idx} className="text-sm bg-slate-600 p-2 rounded">
                        <p className="text-white">{detail.name}</p>
                        <p className="text-gray-400 text-xs">
                          Levels: {detail.newLevels.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification */}
              {fixResult.verification && (
                <div className="bg-slate-700 rounded p-4">
                  <p className="text-sm font-bold text-white mb-3">Verification - Updated Subject Counts:</p>
                  <div className="space-y-1">
                    {fixResult.verification.classSubjectMapping.map((item: any, idx: number) => (
                      <div key={idx} className="text-sm text-gray-300">
                        {item.className}: <span className="text-green-400 font-bold">{item.matchingSubjectCount}</span> subjects
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-blue-900/20 border border-blue-600 rounded p-4">
                <p className="text-sm font-bold text-blue-200 mb-2">Next Steps:</p>
                <ol className="text-sm text-blue-100 space-y-1">
                  {fixResult.nextSteps.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-200 mb-3">ℹ️ How This Works</h3>
          <ul className="text-sm text-blue-100 space-y-2">
            <li>✓ Identifies subjects with missing level information</li>
            <li>✓ Categorizes by subject type (Primary, Secondary, SSS)</li>
            <li>✓ Automatically assigns appropriate class levels</li>
            <li>✓ Verifies the fix by checking class-subject mappings</li>
            <li>✓ You can then retry student/teacher registration</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
