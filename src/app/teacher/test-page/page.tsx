'use client'

import { useState } from 'react'

export default function TestPage() {
  const [message, setMessage] = useState('Loading...')
  const [error, setError] = useState('')

  const testAPI = async () => {
    try {
      setMessage('Testing API...')
      setError('')
      const response = await fetch('/api/health')
      const data = await response.json()
      setMessage(`✅ API Working! Response: ${JSON.stringify(data)}`)
    } catch (err: any) {
      setError(`❌ API Error: ${err.message}`)
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1>🧪 Test Page</h1>
      
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Server Status</h2>
        <p><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
        <p><strong>Port:</strong> {typeof window !== 'undefined' ? window.location.port : 'N/A'}</p>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
        <h2>Test Results</h2>
        <p>{message}</p>
        {error && <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>}
        <button 
          onClick={testAPI}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test API Connection
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
        <h2>Quick Links</h2>
        <ul>
          <li><a href="/landing">Landing Page</a></li>
          <li><a href="/teacher/dashboard">Teacher Dashboard</a></li>
          <li><a href="/teacher/class-scoresheet">Class Score Sheet</a></li>
          <li><a href="/api/health">Health Check API</a></li>
        </ul>
      </div>
    </div>
  )
}
