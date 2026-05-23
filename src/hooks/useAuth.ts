'use client'

import { useEffect, useState } from 'react'
import { createClient, createDataClient, getUserFromCookie } from '@/app/lib/supabase'
import type { Session } from '@supabase/supabase-js'

type UserRole = 'admin' | 'assistant' | 'client' | null

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole>(null)
  const [userName, setUserName] = useState<string>('')
  const [linkedClientId, setLinkedClientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Busca role, nome e client_id do usuário usando o data client (sem lock de auth)
    const loadProfile = async (uid: string) => {
      const supabase = createDataClient()
      const { data } = await supabase
        .from('users_profile')
        .select('role, name, client_id')
        .eq('id', uid)
        .single()

      if (data) {
        setUserRole(data.role as UserRole)
        setUserName(data.name)
        setLinkedClientId(data.client_id ?? null)
      }
    }

    const init = async () => {
      // Lê o usuário do cookie JWT — síncrono, sem getSession(), sem lock
      const cookieUser = getUserFromCookie()
      if (cookieUser) {
        setUserId(cookieUser.id)
        await loadProfile(cookieUser.id)
      }
      setLoading(false)
    }

    init()

    // onAuthStateChange só para detectar logout / novo login em tempo real
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        if (session?.user) {
          setUserId(session.user.id)
          await loadProfile(session.user.id)
        } else {
          setUserId(null)
          setUserRole(null)
          setUserName('')
          setLinkedClientId(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    userId,
    userRole,
    userName,
    linkedClientId,   // para role='client': ID do cliente vinculado
    loading,
    isAdmin: userRole === 'admin',
    isAssistant: userRole === 'assistant',
    isClient: userRole === 'client',
  }
}
