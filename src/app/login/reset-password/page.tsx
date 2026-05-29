'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [ready, setReady]         = useState(false)
  const router = useRouter()

  // O Supabase redireciona com o token no fragment (#access_token=...).
  // O onAuthStateChange detecta o evento PASSWORD_RECOVERY e autentica a sessão.
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('Não foi possível redefinir a senha. O link pode ter expirado.')
      return
    }

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
          <p className="text-theme-secondary text-sm mt-1">Redefinição de senha</p>
        </div>

        {!ready ? (
          <div className="bg-theme-card rounded-2xl p-8 border border-theme-border shadow-sm text-center space-y-3">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-theme-secondary text-sm">Validando link de recuperação...</p>
          </div>
        ) : (
          <form onSubmit={handleReset}
            className="bg-theme-card rounded-2xl p-8 space-y-4 border border-theme-border shadow-sm">
            <div className="text-center mb-2">
              <h2 className="text-theme-primary text-lg font-semibold">Nova senha</h2>
              <p className="text-theme-muted text-sm mt-1">Escolha uma senha segura para sua conta.</p>
            </div>

            <div>
              <label className="text-theme-secondary text-sm font-medium block mb-2">Nova senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-theme-surface text-theme-primary rounded-lg px-4 py-3 text-sm border border-theme-border
                  focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-theme-muted"
                placeholder="Mínimo 6 caracteres" />
            </div>

            <div>
              <label className="text-theme-secondary text-sm font-medium block mb-2">Confirmar senha</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                className="w-full bg-theme-surface text-theme-primary rounded-lg px-4 py-3 text-sm border border-theme-border
                  focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-theme-muted"
                placeholder="Repita a senha" />
            </div>

            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-black font-semibold rounded-lg px-4 py-3 text-sm transition-colors">
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
