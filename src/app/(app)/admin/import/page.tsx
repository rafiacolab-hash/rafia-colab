'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { CheckCircle2, XCircle, Loader2, Download, RefreshCw } from 'lucide-react'

type FileStatus = {
  label: string
  fileExists: boolean
  clientFound: boolean
  clientId: string | null
  monthRef: string
  alreadyImported: boolean
}

type ImportResult = {
  label: string
  ok: boolean
  inserted?: number
  message?: string
}

export default function AdminImportPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [checking, setChecking]   = useState(false)
  const [importing, setImporting] = useState(false)
  const [statuses, setStatuses]   = useState<FileStatus[] | null>(null)
  const [results, setResults]     = useState<ImportResult[] | null>(null)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/dashboard')
  }, [authLoading, isAdmin, router])

  const checkStatus = async () => {
    setChecking(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch('/api/admin/import-csv')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao verificar status')
      setStatuses(json.status)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setChecking(false)
    }
  }

  const runImport = async () => {
    setImporting(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch('/api/admin/import-csv', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro na importação')
      setResults(json.results)
      // Revalida status após importar
      await checkStatus()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setImporting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center flex-1 h-full">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pendingCount = statuses?.filter(s => s.fileExists && !s.alreadyImported).length ?? 0
  const allOk = results?.every(r => r.ok)

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-theme-border flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-theme-primary">Importar Planilhas CSV</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Importa dados de planejamento das planilhas para o sistema</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 max-w-2xl">

        {/* Botão verificar */}
        <button
          onClick={checkStatus}
          disabled={checking || importing}
          className="flex items-center gap-2 px-4 py-2 bg-theme-surface hover:bg-theme-raised text-theme-primary text-sm rounded-lg transition-colors disabled:opacity-50 mb-6"
        >
          {checking
            ? <><Loader2 size={14} className="animate-spin" />Verificando...</>
            : <><RefreshCw size={14} />Verificar arquivos</>}
        </button>

        {/* Tabela de status */}
        {statuses && (
          <div className="bg-theme-card border border-theme-border rounded-xl overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-theme-border bg-theme-surface/50">
              <p className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
                Arquivos detectados — {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
              </p>
            </div>
            {statuses.map((s, i) => (
              <div key={i} className={`flex items-center gap-4 px-5 py-3.5 ${i < statuses.length - 1 ? 'border-b border-theme-border' : ''}`}>
                {/* Ícone */}
                {s.alreadyImported
                  ? <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  : s.fileExists
                    ? <div className="w-4 h-4 rounded-full border-2 border-amber-400 flex-shrink-0" />
                    : <XCircle size={16} className="text-red-500 flex-shrink-0" />}

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-theme-primary font-medium">{s.label}</p>
                  <p className="text-xs text-zinc-500">
                    {!s.fileExists
                      ? 'Arquivo não encontrado'
                      : !s.clientFound
                        ? `Cliente será criado: mês ${s.monthRef}`
                        : s.alreadyImported
                          ? `Já importado (${s.monthRef})`
                          : `Pendente — ${s.monthRef}`}
                  </p>
                </div>

                {/* Badge */}
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                  s.alreadyImported
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : s.fileExists
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-red-500/15 text-red-400 border border-red-500/30'
                }`}>
                  {s.alreadyImported ? 'Importado' : s.fileExists ? 'Pendente' : 'Sem arquivo'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Resultados da importação */}
        {results && (
          <div className={`bg-theme-card border rounded-xl overflow-hidden mb-6 ${
            allOk ? 'border-emerald-500/30' : 'border-amber-500/30'
          }`}>
            <div className="px-5 py-3 border-b border-theme-border bg-theme-surface/50">
              <p className="text-xs font-medium text-theme-secondary uppercase tracking-wider">
                Resultado da importação
              </p>
            </div>
            {results.map((r, i) => (
              <div key={i} className={`flex items-center gap-4 px-5 py-3.5 ${i < results.length - 1 ? 'border-b border-theme-border' : ''}`}>
                {r.ok
                  ? <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  : <XCircle size={16} className="text-red-500 flex-shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm text-theme-primary">{r.label}</p>
                  <p className="text-xs text-zinc-500">
                    {r.ok ? `✅ ${r.inserted} entradas importadas` : `❌ ${r.message}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-sm text-red-400 mb-6">
            {error}
          </div>
        )}

        {/* Botão importar */}
        {statuses && (
          <button
            onClick={runImport}
            disabled={importing || pendingCount === 0}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/30 disabled:cursor-not-allowed text-black font-semibold text-sm rounded-xl transition-colors"
          >
            {importing ? (
              <><Loader2 size={15} className="animate-spin" />Importando...</>
            ) : (
              <><Download size={15} />{pendingCount > 0 ? `Importar ${pendingCount} arquivo${pendingCount !== 1 ? 's' : ''} pendente${pendingCount !== 1 ? 's' : ''}` : 'Tudo já importado'}</>
            )}
          </button>
        )}

        {/* Info */}
        <div className="mt-8 bg-theme-card/50 border border-theme-border rounded-xl p-5 text-xs text-zinc-500 space-y-1.5">
          <p className="text-theme-secondary font-medium mb-2">Mapeamento de status aplicado:</p>
          {[
            ['Postado', 'Postado'],
            ['Agendado', 'Postado'],
            ['Aprovado', 'Em Validação'],
            ['Aguardando', 'Aguardando'],
          ].map(([from, to]) => (
            <p key={from}>• <span className="text-zinc-600 dark:text-zinc-300">{from}</span> → <span className="text-zinc-600 dark:text-zinc-300">{to}</span></p>
          ))}
          <p className="mt-2">O upsert preserva dados existentes — reimportar não apaga edições manuais, apenas atualiza campos preenchidos na planilha.</p>
        </div>
      </div>
    </div>
  )
}
