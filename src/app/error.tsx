'use client'

import { useEffect } from 'react'

/**
 * Global Error Boundary
 * Catches ALL unhandled errors from any child component
 * Prevents the entire app from crashing
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('🔴 APPLICATION ERROR:', error)
    console.error('Error stack:', error.stack)
    console.error('Error digest:', error.digest)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Error Icon */}
      <div style={{
        fontSize: '64px',
        marginBottom: '20px',
      }}>
        ⚠️
      </div>

      {/* Error Title */}
      <h1 style={{
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#111827',
        margin: '0 0 10px 0',
        textAlign: 'center',
      }}>
        Application Error
      </h1>

      {/* Error Message */}
      <p style={{
        fontSize: '16px',
        color: '#6b7280',
        margin: '0 0 20px 0',
        maxWidth: '500px',
        textAlign: 'center',
        lineHeight: '1.5',
      }}>
        Something went wrong. Our team has been notified. Please try again.
      </p>

      {/* Error Details (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          maxWidth: '600px',
          width: '100%',
          textAlign: 'left',
        }}>
          <p style={{
            fontSize: '12px',
            color: '#991b1b',
            margin: '0 0 10px 0',
            fontWeight: 'bold',
          }}>
            Error Details (Development Only):
          </p>
          <pre style={{
            fontSize: '12px',
            color: '#991b1b',
            margin: '0',
            overflow: 'auto',
            backgroundColor: '#fef2f2',
            padding: '10px',
            borderRadius: '4px',
            maxHeight: '200px',
            fontFamily: 'monospace',
          }}>
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </div>
      )}

      {/* Recovery Options */}
      <div style={{
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {/* Reset Button */}
        <button
          onClick={() => reset()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
        >
          Try Again
        </button>

        {/* Home Button */}
        <a
          href="/"
          style={{
            padding: '12px 24px',
            backgroundColor: '#e5e7eb',
            color: '#1f2937',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
            display: 'inline-block',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d1d5db')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
        >
          Go Home
        </a>
      </div>

      {/* Support Info */}
      <div style={{
        marginTop: '40px',
        padding: '15px',
        backgroundColor: '#e0f2fe',
        borderRadius: '8px',
        maxWidth: '500px',
        textAlign: 'center',
        color: '#0c4a6e',
        fontSize: '14px',
        lineHeight: '1.6',
      }}>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Need Help?</strong>
        </p>
        <p style={{ margin: '0' }}>
          If this error persists, please contact your administrator or support team.
        </p>
      </div>
    </div>
  )
}
