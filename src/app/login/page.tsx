'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session) {
      setError('Email ou senha incorretos.')
      setLoading(false)
      return
    }

    router.refresh()
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500 text-black font-bold text-2xl mb-4">
            R
          </div>
          <h1 className="text-white text-2xl font-bold">Ráfia Co.lab</h1>
          <p className="text-zinc-400 text-sm mt-1">Gestão de conteúdo</p>
        </div>

        <form onSubmit={handleLogin} className="bg-zinc-900 rounded-2xl p-8 space-y-4 border border-zinc-800">
          <div>
            <label className="text-zinc-300 text-sm font-medium block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-green-500 transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="text-zinc-300 text-sm font-medium block mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-green-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-black font-semibold rounded-lg px-4 py-3 text-sm transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}