'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import {
  Save, Loader2, Plus, X, ExternalLink,
  Upload, FileText, Trash2, Check, BookOpen,
} from 'lucide-react'
import { createDataClient } from '@/app/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────
type LinkItem = { id: string; label: string; url: string }
type FileItem = { id: string; name: string; path: string; size: number; created_at: string }

type BrandProfile = {
  conceito: string
  identidade_visual: string
  produtos_servicos: string
  publico_alvo: string
  concorrentes: string
  linha_editorial: string
  hashtags: string
  referencias: string
  objetivos: string
  briefing: string
  links: LinkItem[]
  files: FileItem[]
}

const EMPTY: BrandProfile = {
  conceito: '', identidade_visual: '', produtos_servicos: '',
  publico_alvo: '', concorrentes: '',
  linha_editorial: '', hashtags: '', referencias: '',
  objetivos: '', briefing: '',
  links: [], files: [],
}

// ─── Section / field definitions ─────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'marca', title: 'A Marca', color: 'border-emerald-500/40',
    dot: 'bg-emerald-400', dotText: 'text-emerald-600 dark:text-emerald-400',
    fields: [
      { key: 'conceito',          label: 'Conceito e Posicionamento',  rows: 5, placeholder: 'Quem é a marca, propósito, missão, tom de voz, diferencial competitivo, valores...' },
      { key: 'identidade_visual', label: 'Identidade Visual',           rows: 4, placeholder: 'Paleta de cores, fontes, estilo visual, diretrizes de uso da logo, mood board...' },
      { key: 'produtos_servicos', label: 'Produtos e Serviços',         rows: 4, placeholder: 'O que a marca vende, ticket médio, diferenciais, destaques do portfólio...' },
    ],
  },
  {
    id: 'audiencia', title: 'Audiência', color: 'border-blue-500/40',
    dot: 'bg-blue-400', dotText: 'text-blue-600 dark:text-blue-400',
    fields: [
      { key: 'publico_alvo', label: 'Público-alvo / ICP',       rows: 5, placeholder: 'Perfil do cliente ideal: faixa etária, gênero, localização, renda, profissão, dores, desejos, comportamentos de consumo...' },
      { key: 'concorrentes', label: 'Concorrentes e Mercado',   rows: 4, placeholder: 'Principais concorrentes, como a marca se diferencia, oportunidades e ameaças do mercado...' },
    ],
  },
  {
    id: 'conteudo', title: 'Estratégia de Conteúdo', color: 'border-purple-500/40',
    dot: 'bg-purple-400', dotText: 'text-purple-600 dark:text-purple-400',
    fields: [
      { key: 'linha_editorial', label: 'Linha Editorial',             rows: 5, placeholder: 'Pilares de conteúdo, temas recorrentes, o que pode e não pode ser postado, frequência ideal, formatos preferidos...' },
      { key: 'hashtags',        label: 'Hashtags e Palavras-chave',   rows: 3, placeholder: '#hashtags principais, palavras-chave do nicho, termos que a audiência pesquisa...' },
      { key: 'referencias',     label: 'Referências e Inspirações',   rows: 3, placeholder: 'Perfis que a marca admira, estilos visuais de referência, influenciadores do nicho...' },
    ],
  },
  {
    id: 'objetivos', title: 'Objetivos e Metas', color: 'border-amber-500/40',
    dot: 'bg-amber-400', dotText: 'text-amber-600 dark:text-amber-400',
    fields: [
      { key: 'objetivos', label: 'Objetivos de Marketing', rows: 4, placeholder: 'Metas de crescimento de seguidores, geração de leads, vendas, awareness, KPIs definidos, prazo...' },
    ],
  },
  {
    id: 'briefing', title: 'Briefing Geral', color: 'border-theme-border',
    dot: 'bg-zinc-400', dotText: 'text-theme-muted',
    fields: [
      { key: 'briefing', label: 'Notas e Informações Gerais', rows: 6, placeholder: 'Histórico da marca, informações avulsas, observações importantes para o planejamento mensal, sazonalidades, datas comemorativas relevantes...' },
    ],
  },
]

// ─── Helper components ───────────────────────────────────────────────────────
function FieldTextArea({ label, value, onChange, rows, placeholder, readOnly }:
  { label: string; value: string; onChange: (v: string) => void; rows: number; placeholder: string; readOnly?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-theme-secondary">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        readOnly={readOnly}
        placeholder={readOnly ? '—' : placeholder}
        className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-primary
          placeholder-theme-muted focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500
          resize-none transition-colors read-only:opacity-60 read-only:cursor-default"
      />
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BrandProfilePage() {
  const { clientId } = useParams<{ clientId: string }>()
  const { isAdmin, isAssistant } = useAuth()
  const canEdit = isAdmin || isAssistant

  const [profile,      setProfile]      = useState<BrandProfile>(EMPTY)
  const [clientName,   setClientName]   = useState('')
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [profileId,    setProfileId]    = useState<string | null>(null)

  // Links state
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [newLinkUrl,   setNewLinkUrl]   = useState('')

  // Files state
  const [uploading,    setUploading]    = useState(false)
  const [uploadError,  setUploadError]  = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!clientId) return
    const supabase = createDataClient()

    Promise.all([
      supabase.from('clients').select('name').eq('id', clientId).single(),
      supabase.from('client_brand_profile').select('*').eq('client_id', clientId).maybeSingle(),
    ]).then(([clientRes, profileRes]) => {
      if (clientRes.data) setClientName(clientRes.data.name)
      if (profileRes.data) {
        setProfileId(profileRes.data.id)
        setProfile({
          conceito:          profileRes.data.conceito          ?? '',
          identidade_visual: profileRes.data.identidade_visual ?? '',
          produtos_servicos: profileRes.data.produtos_servicos ?? '',
          publico_alvo:      profileRes.data.publico_alvo      ?? '',
          concorrentes:      profileRes.data.concorrentes      ?? '',
          linha_editorial:   profileRes.data.linha_editorial   ?? '',
          hashtags:          profileRes.data.hashtags          ?? '',
          referencias:       profileRes.data.referencias       ?? '',
          objetivos:         profileRes.data.objetivos         ?? '',
          briefing:          profileRes.data.briefing          ?? '',
          links:             (profileRes.data.links            ?? []) as LinkItem[],
          files:             (profileRes.data.files            ?? []) as FileItem[],
        })
      }
      setLoading(false)
    })
  }, [clientId])

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const supabase = createDataClient()
      const payload = {
        client_id:         clientId,
        conceito:          profile.conceito          || null,
        identidade_visual: profile.identidade_visual || null,
        produtos_servicos: profile.produtos_servicos || null,
        publico_alvo:      profile.publico_alvo      || null,
        concorrentes:      profile.concorrentes      || null,
        linha_editorial:   profile.linha_editorial   || null,
        hashtags:          profile.hashtags          || null,
        referencias:       profile.referencias       || null,
        objetivos:         profile.objetivos         || null,
        briefing:          profile.briefing          || null,
        links:             profile.links,
        files:             profile.files,
        updated_at:        new Date().toISOString(),
      }

      if (profileId) {
        const { error: err } = await supabase.from('client_brand_profile').update(payload).eq('id', profileId)
        if (err) throw err
      } else {
        const { data, error: err } = await supabase.from('client_brand_profile').insert(payload).select('id').single()
        if (err) throw err
        if (data) setProfileId(data.id)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  // ── Links ───────────────────────────────────────────────────────────────────
  const addLink = () => {
    if (!newLinkUrl.trim()) return
    const link: LinkItem = {
      id:    crypto.randomUUID(),
      label: newLinkLabel.trim() || newLinkUrl.trim(),
      url:   newLinkUrl.trim(),
    }
    setProfile(p => ({ ...p, links: [...p.links, link] }))
    setNewLinkLabel('')
    setNewLinkUrl('')
  }

  const removeLink = (id: string) =>
    setProfile(p => ({ ...p, links: p.links.filter(l => l.id !== id) }))

  // ── Files ───────────────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''  // reset input

    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Arquivo muito grande. Limite: 20 MB.')
      return
    }

    setUploading(true); setUploadError(null)
    try {
      const supabase = createDataClient()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${clientId}/${Date.now()}-${safeName}`

      const { error: upErr } = await supabase.storage.from('brand-assets').upload(path, file)
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path)
      const newFile: FileItem = {
        id:         crypto.randomUUID(),
        name:       file.name,
        path,
        size:       file.size,
        created_at: new Date().toISOString(),
      }

      // Salva imediatamente o estado dos arquivos no banco
      const updatedFiles = [...profile.files, newFile]
      setProfile(p => ({ ...p, files: updatedFiles }))

      // Persiste só o campo files no banco
      const supabase2 = createDataClient()
      if (profileId) {
        await supabase2.from('client_brand_profile').update({ files: updatedFiles, updated_at: new Date().toISOString() }).eq('id', profileId)
      } else {
        const { data } = await supabase2.from('client_brand_profile').insert({
          client_id: clientId, files: updatedFiles, links: profile.links, updated_at: new Date().toISOString(),
        }).select('id').single()
        if (data) setProfileId(data.id)
      }

      // Suprime aviso de url não utilizada
      void urlData
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao fazer upload.')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async (fileItem: FileItem) => {
    if (!confirm(`Remover "${fileItem.name}"?`)) return
    const supabase = createDataClient()
    await supabase.storage.from('brand-assets').remove([fileItem.path])
    const updatedFiles = profile.files.filter(f => f.id !== fileItem.id)
    setProfile(p => ({ ...p, files: updatedFiles }))
    if (profileId) {
      await supabase.from('client_brand_profile').update({ files: updatedFiles, updated_at: new Date().toISOString() }).eq('id', profileId)
    }
  }

  const getFileUrl = (path: string) => {
    const supabase = createDataClient()
    return supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl
  }

  const set = (key: keyof BrandProfile, value: string) =>
    setProfile(p => ({ ...p, [key]: value }))

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Topbar ── */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-theme-border bg-theme-bg flex-shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen size={18} className="text-theme-muted" />
          <div>
            <h1 className="text-lg font-semibold text-theme-primary">Perfil da Marca</h1>
            <p className="text-xs text-theme-muted mt-0.5">{clientName}</p>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed
              bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-emerald-500/40 text-black"
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" />Salvando…</>
            ) : saved ? (
              <><Check size={14} />Salvo!</>
            ) : (
              <><Save size={14} />Salvar</>
            )}
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6 bg-theme-bg space-y-6">

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Content sections */}
        {SECTIONS.map(section => (
          <div key={section.id} className={`bg-theme-card border ${section.color} rounded-2xl p-6 space-y-5`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${section.dot}`} />
              <h2 className={`text-sm font-semibold ${section.dotText}`}>{section.title}</h2>
            </div>
            <div className="space-y-5">
              {section.fields.map(field => (
                <FieldTextArea
                  key={field.key}
                  label={field.label}
                  value={profile[field.key as keyof BrandProfile] as string}
                  onChange={v => set(field.key as keyof BrandProfile, v)}
                  rows={field.rows}
                  placeholder={field.placeholder}
                  readOnly={!canEdit}
                />
              ))}
            </div>
          </div>
        ))}

        {/* ── Links externos ── */}
        <div className="bg-theme-card border border-theme-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-sky-400" />
            <h2 className="text-sm font-semibold text-sky-600 dark:text-sky-400">Links e Materiais Externos</h2>
          </div>
          <p className="text-xs text-theme-muted">Google Drive, Canva, Notion, referências externas…</p>

          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              <input
                value={newLinkLabel}
                onChange={e => setNewLinkLabel(e.target.value)}
                placeholder="Nome / descrição"
                className="flex-1 min-w-[140px] bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-theme-muted focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <input
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLink()}
                placeholder="https://..."
                type="url"
                className="flex-[2] min-w-[200px] bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-theme-muted focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                onClick={addLink}
                disabled={!newLinkUrl.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black text-sm font-semibold rounded-lg transition-colors"
              >
                <Plus size={14} />Adicionar
              </button>
            </div>
          )}

          {profile.links.length === 0 ? (
            <p className="text-xs text-theme-muted italic">Nenhum link adicionado.</p>
          ) : (
            <div className="space-y-2">
              {profile.links.map(link => (
                <div key={link.id} className="flex items-center gap-3 bg-theme-surface rounded-xl px-4 py-2.5 group">
                  <ExternalLink size={13} className="text-theme-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-theme-primary truncate">{link.label}</p>
                    <a href={link.url} target="_blank" rel="noreferrer"
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline truncate block">
                      {link.url}
                    </a>
                  </div>
                  {canEdit && (
                    <button onClick={() => removeLink(link.id)}
                      className="opacity-0 group-hover:opacity-100 text-theme-muted hover:text-red-500 transition-all p-1 rounded">
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Arquivos ── */}
        <div className="bg-theme-card border border-theme-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-orange-400" />
            <h2 className="text-sm font-semibold text-orange-600 dark:text-orange-400">Arquivos Anexados</h2>
          </div>
          <p className="text-xs text-theme-muted">PDFs, imagens, apresentações — máx. 20 MB por arquivo.</p>

          {canEdit && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.zip"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 border border-dashed border-theme-border hover:border-emerald-500 bg-theme-surface hover:bg-emerald-500/5 text-theme-secondary hover:text-emerald-600 dark:hover:text-emerald-400 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Enviando…' : 'Anexar arquivo'}
              </button>
              {uploadError && (
                <p className="mt-2 text-xs text-red-500">{uploadError}</p>
              )}
            </div>
          )}

          {profile.files.length === 0 ? (
            <p className="text-xs text-theme-muted italic">Nenhum arquivo anexado.</p>
          ) : (
            <div className="space-y-2">
              {profile.files.map(f => (
                <div key={f.id} className="flex items-center gap-3 bg-theme-surface rounded-xl px-4 py-2.5 group">
                  <FileText size={14} className="text-theme-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a
                      href={getFileUrl(f.path)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-theme-primary hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline truncate block transition-colors"
                    >
                      {f.name}
                    </a>
                    <p className="text-xs text-theme-muted">{formatBytes(f.size)}</p>
                  </div>
                  {canEdit && (
                    <button onClick={() => handleDeleteFile(f)}
                      className="opacity-0 group-hover:opacity-100 text-theme-muted hover:text-red-500 transition-all p-1 rounded">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Espaço no final para não colar no rodapé */}
        <div className="h-6" />
      </div>
    </div>
  )
}
