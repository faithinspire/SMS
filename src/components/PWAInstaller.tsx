'use client'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstaller() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [showManualInstructions, setShowManualInstructions] = useState(false)
  const [userAgent, setUserAgent] = useState('')

  useEffect(() => {
    setIsClient(true)
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    setUserAgent(ua)

    const checkInstalled = () => {
      const installed = window.matchMedia('(display-mode: standalone)').matches
      if (installed) {
        setIsInstalled(true)
        return true
      }
      return false
    }

    if (checkInstalled()) return

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setInstallPrompt(promptEvent)
      setShowPrompt(true)
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
        console.error('[PWA] SW registration failed:', error)
      })
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    const timer = setTimeout(() => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      const isLocalNetwork = location.hostname.startsWith('192.168.') || 
                             location.hostname.startsWith('10.') ||
                             location.hostname === 'localhost'
      
      if (isMobile && (isLocalNetwork || !installPrompt)) {
        setShowManualInstructions(true)
      }
    }, 2000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    console.log('[PWA] 📲 Install button clicked, prompt:', !!installPrompt)
    
    if (!installPrompt) {
      console.error('[PWA] ❌ No install prompt - trying manual installation')
      // Fallback: show manual instructions
      setShowManualInstructions(true)
      return
    }
    
    try {
      console.log('[PWA] 📲 Calling installPrompt.prompt()...')
      await installPrompt.prompt()
      
      console.log('[PWA] Waiting for user choice...')
      const { outcome } = await installPrompt.userChoice
      console.log('[PWA] 📊 User choice:', outcome)
      
      if (outcome === 'accepted') {
        console.log('[PWA] ✅ Installation accepted')
        setShowPrompt(false)
        setIsInstalled(true)
      } else {
        console.log('[PWA] ❌ Installation dismissed')
        setShowPrompt(false)
      }
      
      setInstallPrompt(null)
    } catch (error) {
      console.error('[PWA] ❌ Installation error:', error)
      // Show manual fallback
      setShowManualInstructions(true)
    }
  }

  if (!isClient || isInstalled) return null

  if (installPrompt && showPrompt) {
    return (
      <div className="fixed top-4 right-4 z-50 max-w-xs">
        <div className="bg-blue-600 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3">
          <button onClick={handleInstall} className="flex items-center gap-2 font-bold">
            <span>📱</span>
            <span>Install App</span>
          </button>
          <button onClick={() => setShowPrompt(false)} className="font-bold text-2xl">✕</button>
        </div>
      </div>
    )
  }

  if (showManualInstructions && !installPrompt) {
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    return (
      <div className="fixed top-4 right-4 z-50 max-w-sm">
        <div className="bg-gradient-to-br from-amber-400 to-amber-500 text-gray-900 px-5 py-4 rounded-xl shadow-2xl border-2 border-amber-300">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">📲</span>
            <div className="flex-1">
              <p className="font-bold text-sm">Add to Home Screen</p>
              <p className="text-xs text-gray-800 mt-1 font-semibold">
                {isIOS
                  ? '👉 Tap Share → Add to Home Screen'
                  : '👉 Tap ⋮ (menu) → Install app'}
              </p>
            </div>
            <button 
              onClick={() => setShowManualInstructions(false)}
              className="text-gray-900 hover:text-gray-700 font-bold text-lg flex-shrink-0 leading-none"
            >
              ✕
            </button>
          </div>
          <div className="bg-white bg-opacity-60 rounded-lg p-3 text-xs space-y-1">
            {isIOS ? (
              <>
                <p>🔹 1. Tap <span className="font-bold">Share</span> (↗️ arrow)</p>
                <p>🔹 2. Scroll & tap <span className="font-bold">Add to Home Screen</span></p>
                <p>🔹 3. Confirm by tapping <span className="font-bold">Add</span></p>
              </>
            ) : (
              <>
                <p>🔹 1. Tap <span className="font-bold">⋮</span> (three dots)</p>
                <p>🔹 2. Tap <span className="font-bold">Install app</span></p>
                <p>🔹 3. Confirm installation</p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
