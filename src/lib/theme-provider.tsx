'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface ThemeContextType {
  darkMode: boolean
  toggleDarkMode: () => void
  bgColor: string
  cardBg: string
  textColor: string
  borderColor: string
  gradientFrom: string
  gradientTo: string
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load theme from localStorage
    const saved = localStorage.getItem('theme-mode')
    if (saved) {
      setDarkMode(saved === 'dark')
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('theme-mode', darkMode ? 'dark' : 'light')
    }
  }, [darkMode, mounted])

  const toggleDarkMode = () => setDarkMode(!darkMode)

  const theme: ThemeContextType = {
    darkMode,
    toggleDarkMode,
    bgColor: darkMode
      ? 'bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900'
      : 'bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100',
    cardBg: darkMode ? 'bg-slate-800/80 backdrop-blur' : 'bg-white/90 backdrop-blur',
    textColor: darkMode ? 'text-white' : 'text-gray-900',
    borderColor: darkMode ? 'border-slate-700/50' : 'border-gray-200/50',
    gradientFrom: darkMode ? 'from-purple-500' : 'from-blue-500',
    gradientTo: darkMode ? 'to-pink-500' : 'to-purple-500',
  }

  if (!mounted) return <>{children}</>

  return (
    <ThemeContext.Provider value={theme}>
      <div className={theme.bgColor}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
