'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

export default function DatabaseSetupPage() {
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState<string[]>([])
  const [success, setSuccess] = useState(false)

  const runMigration = async () => {
    try {
      setLoading(true)
      setOutput([])
      setSuccess(false)

      const messages = [
        '🔄 Starting Migration 120: Create Sessions, Terms, and Populate Scores...',
        '📊 Creating Academic Sessions for 2025/2026...',
        '📚 Creating 3 Terms: First, Second, Third...',
        '📝 Populating Score Sheets with Test Data...',
        '🔢 Calculating Totals and Grades...',
      ]

      for (const msg of messages) {
        setOutput((prev) => [...prev, msg])
        await new Promise((resolve) => setTimeout(resolve, 800))
      }

      // Call the migration API
      const response = await fetch('/api/admin/run-migration-120', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'populate_sessions_and_terms' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Migration failed')
      }

      setOutput((prev) => [
        ...prev,
        '',
        '✅ Migration Complete!',
        `✓ Sessions Created: ${data.stats.sessions}`,
        `✓ Terms Created: ${data.stats.terms}`,
        `✓ Score Sheets Created: ${data.stats.scores}`,
        '',
        'Result pages are now ready to display student data!',
      ])

      setSuccess(true)
      toast.success('Migration completed successfully!')
    } catch (error: any) {
      setOutput((prev) => [...prev, `❌ Error: ${error.message}`])
      toast.error(`Migration failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">🗄️ Database Setup</h1>
          <p className="text-gray-400 mb-8">Initialize academic sessions, terms, and sample data</p>

          <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">📋 Migration 120: Sessions & Terms</h2>
            <div className="space-y-3 mb-6 text-gray-300 text-sm">
              <p>✓ Creates academic sessions for all schools (2025/2026)</p>
              <p>✓ Creates 3 terms: First Term, Second Term, Third Term</p>
              <p>✓ Populates score sheets with realistic test data</p>
              <p>✓ Calculates totals and grades automatically</p>
              <p>✓ Enables result pages to display student performance</p>
            </div>

            <button
              onClick={runMigration}
              disabled={loading}
              className={`w-full px-6 py-3 rounded-lg font-bold text-white transition-all ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : success
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? '⏳ Running Migration...' : success ? '✅ Migration Complete' : '▶️ Run Migration'}
            </button>
          </div>

          {output.length > 0 && (
            <div className="bg-slate-950 border border-slate-600 rounded-lg p-6 font-mono text-sm">
              <h3 className="text-white font-bold mb-4">📡 Output:</h3>
              <div className="space-y-2 text-gray-300 max-h-96 overflow-y-auto">
                {output.map((line, idx) => (
                  <div key={idx} className="flex items-start">
                    <span className="text-gray-600 mr-3">{String(idx + 1).padStart(3, '0')}</span>
                    <span
                      className={`${
                        line.includes('✅')
                          ? 'text-green-400'
                          : line.includes('❌')
                          ? 'text-red-400'
                          : line.includes('🔄')
                          ? 'text-blue-400'
                          : line.includes('✓')
                          ? 'text-green-300'
                          : 'text-gray-300'
                      }`}
                    >
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-950/30 border border-blue-700/50 rounded-lg">
            <p className="text-blue-300 text-sm">
              💡 <strong>After running this migration:</strong> Navigate to Admin → Student Results page to see the
              populated data with student scores from various classes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
