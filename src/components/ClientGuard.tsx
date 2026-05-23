'use client'

/**
 * ClientGuard
 *
 * Envolve qualquer página dentro do (app) layout.
 * Comportamento por role:
 *  - admin / assistant → passa tudo sem restrição
 *  - client            → redireciona /dashboard para o próprio cliente;
 *                        bloqueia acesso a outros clientes
 *  - loading           → mostra spinner
 */

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

function currentMonthRef(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function ClientGuard({ children }: { children: React.ReactNode }) {
  const { loading, isClient, linkedClientId } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!isClient) return  // admin/assistant: sem restrição

    const ownMonth = `/${linkedClientId}/${currentMonthRef()}`

    if (!linkedClientId) {
      // Cliente sem vínculo configurado — página de erro
      if (pathname !== '/sem-acesso') router.replace('/sem-acesso')
      return
    }

    // Redireciona /dashboard → próprio cliente
    if (pathname === '/dashboard') {
      router.replace(ownMonth)
      return
    }

    // Bloqueia acesso a outros clientes
    // pathname começa com /<clientId>/... — extrai o primeiro segmento
    const segments = pathname.split('/').filter(Boolean)
    const clientIdInUrl = segments[0]

    if (clientIdInUrl && clientIdInUrl !== linkedClientId) {
      router.replace(ownMonth)
    }
  }, [loading, isClient, linkedClientId, pathname, router])

  // Spinner enquanto carrega o perfil
  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 h-full">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
