'use client'

import { useEffect, useState, useCallback } from 'react'

type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')

  // Lê do localStorage na montagem
  useEffect(() => {
    const stored = localStorage.getItem('rafia-theme') as Theme | null
    const initial = stored ?? 'dark'
    setThemeState(initial)
    applyTheme(initial)
  }, [])

  const applyTheme = (t: Theme) => {
    const root = document.documentElement
    if (t === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  const toggle = useCallback(() => {
    setThemeState(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('rafia-theme', next)
      applyTheme(next)
      return next
    })
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem('rafia-theme', t)
    applyTheme(t)
  }, [])

  return { theme, toggle, setTheme, isDark: theme === 'dark' }
}
