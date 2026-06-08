import { createDataClient } from './supabase'

export type ActivityCtx = {
  userId: string
  userName: string
  clientName: string
}

/**
 * Registra uma ação de assistente na tabela activity_log.
 * Não-bloqueante: falhas são silenciosas para não interromper o fluxo do usuário.
 */
export async function logActivity(params: {
  ctx: ActivityCtx
  actionType: 'status_change' | 'content_edit'
  entryId: string
  clientId: string
  entryDate: string
  field: string
  oldValue: string | null
  newValue: string | null
}): Promise<void> {
  // Só loga se tiver contexto de usuário
  if (!params.ctx.userId) return

  try {
    const supabase = createDataClient()
    await supabase.from('activity_log').insert({
      user_id:     params.ctx.userId,
      user_name:   params.ctx.userName,
      action_type: params.actionType,
      entry_id:    params.entryId,
      client_id:   params.clientId,
      client_name: params.ctx.clientName,
      entry_date:  params.entryDate,
      field:       params.field,
      old_value:   params.oldValue,
      new_value:   params.newValue,
    })
  } catch (err) {
    console.warn('[activity] falha ao registrar log:', err)
  }
}
