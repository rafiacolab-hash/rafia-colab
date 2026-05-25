'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.session) {
      setError('Email ou senha incorretos.')
      setLoading(false)
      return
    }

    router.refresh()
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 text-black font-bold text-2xl mb-4">
            R
          </div>
          <h1 className="text-theme-primary text-2xl font-bold">Ráfia Co.lab</h1>
          <p className="text-theme-secondary text-sm mt-1">Gestão de conteúdo</p>
        </div>

        <form onSubmit={handleLogin}
          className="bg-theme-card rounded-2xl p-8 space-y-4 border border-theme-border shadow-sm">
          <div>
            <label className="text-theme-secondary text-sm font-medium block mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-theme-surface text-theme-primary rounded-lg px-4 py-3 text-sm border border-theme-border
                focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-theme-muted"
              placeholder="seu@email.com" />
          </div>
          <div>
            <label className="text-theme-secondary text-sm font-medium block mb-2">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-theme-surface text-theme-primary rounded-lg px-4 py-3 text-sm border border-theme-border
                focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-theme-muted"
              placeholder="••••••••" />
          </div>

          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-black font-semibold rounded-lg px-4 py-3 text-sm transition-colors">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
