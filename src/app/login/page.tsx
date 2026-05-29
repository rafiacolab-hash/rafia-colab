'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase'

type Mode = 'login' | 'forgot' | 'sent'

export default function LoginPage() {
  const [mode, setMode]         = useState<Mode>('login')
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

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/reset-password`,
    })

    setLoading(false)
    if (error) {
      setError('Não foi possível enviar o email. Verifique o endereço e tente novamente.')
      return
    }
    setMode('sent')
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

        {/* ── Login ── */}
        {mode === 'login' && (
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
              <div className="flex items-center justify-between mb-2">
                <label className="text-theme-secondary text-sm font-medium">Senha</label>
                <button type="button" onClick={() => { setMode('forgot'); setError('') }}
                  className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
                  Esqueci a senha
                </button>
              </div>
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
        )}

        {/* ── Esqueci a senha ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot}
            className="bg-theme-card rounded-2xl p-8 space-y-4 border border-theme-border shadow-sm">
            <div className="text-center mb-2">
              <h2 className="text-theme-primary text-lg font-semibold">Recuperar senha</h2>
              <p className="text-theme-muted text-sm mt-1">
                Informe seu email e enviaremos um link para criar uma nova senha.
              </p>
            </div>
            <div>
              <label className="text-theme-secondary text-sm font-medium block mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-theme-surface text-theme-primary rounded-lg px-4 py-3 text-sm border border-theme-border
                  focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-theme-muted"
                placeholder="seu@email.com" />
            </div>

            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-black font-semibold rounded-lg px-4 py-3 text-sm transition-colors">
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>

            <button type="button" onClick={() => { setMode('login'); setError('') }}
              className="w-full text-theme-muted hover:text-theme-secondary text-sm transition-colors py-1">
              ← Voltar para o login
            </button>
          </form>
        )}

        {/* ── Email enviado ── */}
        {mode === 'sent' && (
          <div className="bg-theme-card rounded-2xl p-8 border border-theme-border shadow-sm text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 text-2xl mb-2">
              ✉
            </div>
            <h2 className="text-theme-primary text-lg font-semibold">Email enviado!</h2>
            <p className="text-theme-secondary text-sm leading-relaxed">
              Enviamos um link para <span className="font-medium text-theme-primary">{email}</span>.
              Verifique sua caixa de entrada (e o spam) e clique no link para criar uma nova senha.
            </p>
            <button type="button" onClick={() => { setMode('login'); setError('') }}
              className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors">
              ← Voltar para o login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
