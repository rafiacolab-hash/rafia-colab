'use client'

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, ExternalLink, Loader2 } from 'lucide-react'
import { createDataClient } from '@/app/lib/supabase'
import MetricChart from '@/components/metrics/MetricChart'
import {
  PRESETS, type Preset, type Range, daysIn, fmt, fmtDayLong, fmtDayShort, fmtPct, friendlyError, fromKey,
  igApi, isTokenError, pool, rangeForPreset, timeSeries, toKey, totalValue, ts,
} from '@/app/lib/instagram'

/* ─── Tipos ─────────────────────────────────────────────────────────────── */
type Connection = { connected: boolean; username: string | null; expiresAt: string | null; canManage: boolean; viaAgency?: boolean; publicMode?: boolean }
type AgencyAccount = { id: string; username: string; name?: string; linkedTo: string | null }
type Profile = {
  username?: string; followers_count?: number; follows_count?: number; media_count?: number
  profile_picture_url?: string; biography?: string
}
type Media = {
  id: string; caption?: string; media_type: string; media_url?: string; thumbnail_url?: string
  permalink: string; timestamp?: string; like_count?: number; comments_count?: number; media_product_type?: string
}
type PostRow = Media & { views: number | null; inter: number; rate: number | null }
type Block<T> = { status: 'loading' | 'ok' | 'error'; data?: T; error?: string; warn?: string }

const IG_PINK = '#d62976'
const IG_PURPLE = '#962fbf'
const IG_ORANGE = '#f77737'
const IG_GRADIENT = 'linear-gradient(135deg,#fa7e1e 0%,#d62976 50%,#962fbf 100%)'

const LOADING = { status: 'loading' } as const

type Props = { params: { clientId: string } }

export default function MetricasPage({ params }: Props) {
  const { clientId } = params

  const [clientName, setClientName] = useState('')
  const [conn, setConn] = useState<Connection | null>(null)
  const [connError, setConnError] = useState('')
  const [tokenExpired, setTokenExpired] = useState(false)
  const [justConnected, setJustConnected] = useState(false)

  // Volta do "Conectar com Instagram" com ?ig=ok
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('ig') === 'ok') {
      setJustConnected(true)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const [preset, setPreset] = useState<Preset>('prevMonth')
  const [range, setRange] = useState<Range>(() => rangeForPreset('prevMonth'))
  const [tick, setTick] = useState(0)
  const [busy, setBusy] = useState(false)

  const [profile, setProfile] = useState<Block<Profile>>(LOADING)
  const [posts, setPosts] = useState<Block<PostRow[]>>(LOADING)
  const [reach, setReach] = useState<Block<(number | null)[]>>(LOADING)
  const [reachTotal, setReachTotal] = useState<Block<{ value: number | null; note: string }>>(LOADING)
  const [viewsEng, setViewsEng] = useState<Block<{ views: (number | null)[]; rate: (number | null)[]; totalViews: number; totalInter: number }>>(LOADING)
  const [gains, setGains] = useState<Block<(number | null)[]>>(LOADING)
  const [folMode, setFolMode] = useState<'gain' | 'total'>('gain')

  const seq = useRef(0)
  const days = useMemo(() => daysIn(range), [range])
  const labels = useMemo(() => days.map(d => fmtDayShort(d.date)), [days])

  const noteError = useCallback((e: unknown) => {
    if (isTokenError(e)) setTokenExpired(true)
    return friendlyError(e)
  }, [])

  /* ─── Nome do cliente + status da conexão ─────────────────────────────── */
  const loadConnection = useCallback(async () => {
    setConnError('')
    try {
      const res = await fetch(`/api/instagram/${clientId}/connection`, { credentials: 'same-origin' })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `Erro ${res.status}`)
      setConn(body as Connection)
    } catch (e) {
      setConnError(e instanceof Error ? e.message : 'Erro ao verificar conexão.')
    }
  }, [clientId])

  useEffect(() => {
    createDataClient().from('clients').select('name').eq('id', clientId).single()
      .then(({ data }: { data: { name: string } | null }) => { if (data) setClientName(data.name) })
    loadConnection()
  }, [clientId, loadConnection])

  /* ─── Perfil + posts (não dependem do período) ────────────────────────── */
  useEffect(() => {
    if (!conn?.connected || conn.publicMode) return
    let alive = true
    setTokenExpired(false)
    setProfile(LOADING); setPosts(LOADING)

    igApi<Profile>(clientId, 'me', { fields: 'username,followers_count,follows_count,media_count,profile_picture_url,biography' })
      .then(p => { if (alive) setProfile({ status: 'ok', data: p }) })
      .catch(e => { if (alive) setProfile({ status: 'error', error: noteError(e) }) })

    ;(async () => {
      try {
        const res = await igApi<{ data?: Media[] }>(clientId, 'me/media', {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count', limit: 12,
        })
        const media = res.data ?? []
        const ins = await pool(media, 6, m =>
          igApi<{ data?: { name: string; values?: { value: number }[] }[] }>(clientId, `${m.id}/insights`, { metric: 'views,total_interactions' }))
        let missing = 0
        const rows: PostRow[] = media.map((m, i) => {
          let views: number | null = null
          let inter: number | null = null
          const r = ins[i]
          if (r.ok) for (const d of r.value.data ?? []) {
            const v = d.values?.[0] ? Number(d.values[0].value) : null
            if (d.name === 'views') views = v
            if (d.name === 'total_interactions') inter = v
          }
          if (views == null) missing++
          const interFinal = inter ?? (m.like_count ?? 0) + (m.comments_count ?? 0)
          return { ...m, views, inter: interFinal, rate: views ? (interFinal / views) * 100 : null }
        })
        if (alive) setPosts({
          status: 'ok', data: rows,
          warn: missing ? `${missing} post(s) sem insights de views — interações calculadas por curtidas + comentários.` : undefined,
        })
      } catch (e) {
        if (alive) setPosts({ status: 'error', error: noteError(e) })
      }
    })()

    return () => { alive = false }
  }, [clientId, conn?.connected, tick, noteError])

  /* ─── Métricas do período ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!conn?.connected || conn.publicMode) return
    const my = ++seq.current
    const live = () => my === seq.current
    setBusy(true)
    setReach(LOADING); setReachTotal(LOADING); setViewsEng(LOADING); setGains(LOADING)

    const loadReach = async () => {
      const ser = await timeSeries(clientId, 'reach', range)
      if (!live()) return
      const vals = days.map(d => ser.map.get(d.key) ?? null)
      const has = vals.some(v => v != null)
      setReach(has
        ? { status: 'ok', data: vals, warn: ser.failed ? 'Parte do período não retornou dados.' : undefined }
        : { status: 'error', error: ser.failed ? noteError(ser.lastError) : 'Sem dados de alcance para o período.' })

      // ≤30 dias → total_value (contas únicas); >30 → soma da série
      let value: number | null = null
      let note = ''
      if (range.until - range.since <= 30 * 86400) {
        try { value = (await totalValue(clientId, 'reach', range)).reach ?? null; note = 'contas únicas' }
        catch (e) { note = noteError(e) }
      }
      if (value == null && has) { value = vals.reduce<number>((a, b) => a + (b ?? 0), 0); note = 'soma dos dias' }
      if (live()) setReachTotal({ status: 'ok', data: { value, note: value == null ? (note || 'sem dados') : note } })
    }

    const loadViews = async () => {
      // views/total_interactions não têm time_series → total_value 1 dia por vez (máx. 6 simultâneas)
      const res = await pool(days, 6, d => totalValue(clientId, 'views,total_interactions', d))
      if (!live()) return
      let failed = 0
      let lastErr: unknown = null
      const views: (number | null)[] = []
      const inter: (number | null)[] = []
      res.forEach(r => {
        if (r.ok) { views.push(r.value.views ?? null); inter.push(r.value.total_interactions ?? null) }
        else { failed++; lastErr = r.error; views.push(null); inter.push(null) }
      })
      if (!views.some(v => v != null)) {
        setViewsEng({ status: 'error', error: failed ? noteError(lastErr) : 'Sem dados de views para o período.' })
        return
      }
      const rate = views.map((v, i) => (v == null || inter[i] == null ? null : v > 0 ? ((inter[i] as number) / v) * 100 : 0))
      setViewsEng({
        status: 'ok',
        data: {
          views, rate,
          totalViews: views.reduce<number>((a, b) => a + (b ?? 0), 0),
          totalInter: inter.reduce<number>((a, b) => a + (b ?? 0), 0),
        },
        warn: failed ? `${failed} dia(s) sem resposta da API.` : undefined,
      })
    }

    const loadFollowers = async () => {
      const ser = await timeSeries(clientId, 'follower_count', range)
      if (!live()) return
      const vals = days.map(d => ser.map.get(d.key) ?? null)
      setGains(vals.some(v => v != null)
        ? { status: 'ok', data: vals, warn: ser.failed ? 'A API só cobre os últimos 30 dias de seguidores.' : undefined }
        : { status: 'error', error: 'Sem dados de novos seguidores. A métrica exige 100+ seguidores e só cobre os últimos 30 dias.' })
    }

    Promise.allSettled([loadReach(), loadViews(), loadFollowers()]).then(() => { if (live()) setBusy(false) })
  }, [clientId, conn?.connected, range, days, tick, noteError])

  // Total estimado de seguidores: retrocede a partir do total atual subtraindo os ganhos diários.
  const followersTotal = useMemo(() => {
    const current = profile.data?.followers_count
    const g = gains.data
    if (current == null || !g) return null
    const out: number[] = new Array(g.length)
    out[g.length - 1] = current
    for (let i = g.length - 2; i >= 0; i--) out[i] = out[i + 1] - (g[i + 1] ?? 0)
    return out
  }, [profile.data, gains.data])

  /* ─── Filtros ─────────────────────────────────────────────────────────── */
  const choosePreset = (p: Preset) => { setPreset(p); setRange(rangeForPreset(p)) }
  const onDate = (which: 'from' | 'to', value: string) => {
    if (!value) return
    const fromKeyStr = which === 'from' ? value : toKey(new Date(range.since * 1000))
    const toKeyStr = which === 'to' ? value : toKey(new Date((range.until - 1) * 1000))
    let a = fromKey(fromKeyStr)
    let b = fromKey(toKeyStr)
    if (a > b) [a, b] = [b, a]
    const end = new Date(b); end.setDate(end.getDate() + 1)
    setPreset('custom')
    setRange({ since: ts(a), until: Math.min(ts(end), ts(new Date())) })
  }
  const periodLabel = preset === 'custom'
    ? `${fmtDayShort(new Date(range.since * 1000))} – ${fmtDayShort(new Date((range.until - 1) * 1000))}`
    : PRESETS.find(p => p.id === preset)?.short ?? ''
  const refresh = () => setTick(t => t + 1)

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-8 py-5 border-b border-theme-border bg-theme-bg">
        <div>
          <h1 className="text-lg font-semibold text-theme-primary">Métricas do Instagram</h1>
          <p className="text-xs text-theme-muted mt-0.5">{clientName}{conn?.username ? ` · @${conn.username}` : ''}</p>
        </div>
        {conn?.connected && (
          <div className="flex items-center gap-2">
            {busy && <span className="flex items-center gap-1.5 text-xs text-theme-muted"><Loader2 size={13} className="animate-spin" />atualizando…</span>}
            <button onClick={refresh} title="Atualizar"
              className="p-2 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-surface transition-colors">
              <RefreshCw size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 bg-theme-bg">
        {connError && <Banner tone="error">{connError}</Banner>}
        {justConnected && <Banner tone="ok">Instagram conectado com sucesso!</Banner>}
        {tokenExpired && (
          <Banner tone="error">
            Token expirado ou inválido — gere um novo token na Meta e reconecte este cliente{conn?.canManage ? ' (abaixo)' : ' (peça a um administrador)'}.
          </Banner>
        )}

        {!conn && !connError && <Spinner />}

        {conn && !conn.connected && (
          <ConnectPanel clientId={clientId} canManage={conn.canManage} onDone={loadConnection} />
        )}

        {conn?.connected && (
          <>
            {/* Perfil */}
            {!conn.publicMode && (
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full p-[3px] flex-shrink-0" style={{ background: IG_GRADIENT }}>
                {profile.data?.profile_picture_url
                  ? <img src={profile.data.profile_picture_url} alt="" referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover border-[3px] border-theme-bg" />
                  : <div className="w-full h-full rounded-full bg-theme-surface border-[3px] border-theme-bg" />}
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="text-base font-semibold text-theme-primary">
                  {profile.status === 'loading' ? <Skel w="w-32" /> : `@${profile.data?.username ?? conn.username ?? ''}`}
                </p>
                <p className="text-sm text-theme-secondary whitespace-pre-line line-clamp-2 max-w-2xl">
                  {profile.status === 'error' ? profile.error : profile.data?.biography}
                </p>
              </div>
            </div>
            )}

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="flex flex-wrap items-center bg-theme-surface rounded-lg p-1 gap-0.5">
                {PRESETS.map(p => (
                  <button key={p.id} onClick={() => choosePreset(p.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      preset === p.id ? 'bg-theme-card text-theme-primary shadow-sm' : 'text-theme-muted hover:text-theme-secondary'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-theme-secondary">
                <span>De</span>
                <input type="date" value={toKey(new Date(range.since * 1000))} max={toKey(new Date())}
                  onChange={e => onDate('from', e.target.value)}
                  className={`px-2 py-1.5 rounded-lg bg-theme-surface border text-theme-primary ${preset === 'custom' ? 'border-pink-500' : 'border-theme-border'}`} />
                <span>Até</span>
                <input type="date" value={toKey(new Date((range.until - 1) * 1000))} max={toKey(new Date())}
                  onChange={e => onDate('to', e.target.value)}
                  className={`px-2 py-1.5 rounded-lg bg-theme-surface border text-theme-primary ${preset === 'custom' ? 'border-pink-500' : 'border-theme-border'}`} />
              </div>
            </div>

            {conn.publicMode ? (
              <PublicMetrics clientId={clientId} range={range} days={days} periodLabel={periodLabel} tick={tick} />
            ) : (<>
            {/* KPIs */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
              <Kpi label="Seguidores" loading={profile.status === 'loading'} value={fmt(profile.data?.followers_count)}
                note={profile.data?.follows_count != null ? `seguindo ${fmt(profile.data?.follows_count)}` : ''} />
              <Kpi label="Total de posts" loading={profile.status === 'loading'} value={fmt(profile.data?.media_count)} />
              <Kpi label={`Alcance (${periodLabel})`} loading={reachTotal.status === 'loading'}
                value={fmt(reachTotal.data?.value)} note={reachTotal.data?.note} />
              <Kpi label={`Views (${periodLabel})`} loading={viewsEng.status === 'loading'}
                value={viewsEng.data ? fmt(viewsEng.data.totalViews) : '—'}
                note={viewsEng.status === 'error' ? viewsEng.error : viewsEng.data ? 'soma dos dias' : ''} />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8">
              <Panel title="Contas alcançadas" sub="Alcance diário" block={reach}>
                {reach.data && <MetricChart labels={labels} values={reach.data} kind="area" color={IG_PINK} seriesLabel="Alcance" format={fmt} />}
              </Panel>
              <Panel title="Visualizações" sub="Views por dia" block={viewsEng}>
                {viewsEng.data && <MetricChart labels={labels} values={viewsEng.data.views} kind="area" color={IG_PURPLE} seriesLabel="Views" format={fmt} />}
              </Panel>
              <Panel title="Taxa de engajamento" sub="Interações ÷ views, por dia" block={viewsEng}
                headline={viewsEng.data && viewsEng.data.totalViews > 0 ? fmtPct((viewsEng.data.totalInter / viewsEng.data.totalViews) * 100) : undefined}>
                {viewsEng.data && <MetricChart labels={labels} values={viewsEng.data.rate} kind="line" color={IG_ORANGE} seriesLabel="Engajamento" format={fmtPct} />}
              </Panel>
              <Panel title="Crescimento de seguidores"
                sub={folMode === 'gain' ? 'Novos seguidores por dia' : 'Total estimado (retrocedendo do total atual)'}
                block={gains}
                action={
                  <div className="flex bg-theme-surface rounded-md p-0.5 gap-0.5">
                    {(['gain', 'total'] as const).map(m => (
                      <button key={m} onClick={() => setFolMode(m)}
                        className={`px-2 py-1 rounded text-[11px] whitespace-nowrap ${folMode === m ? 'bg-theme-card text-theme-primary shadow-sm' : 'text-theme-muted'}`}>
                        {m === 'gain' ? 'Novos/dia' : 'Total estimado'}
                      </button>
                    ))}
                  </div>
                }>
                {gains.data && (folMode === 'total' && followersTotal
                  ? <MetricChart labels={labels} values={followersTotal} kind="line" color={IG_PURPLE} seriesLabel="Total estimado" format={fmt} zeroBased={false} />
                  : <MetricChart labels={labels} values={gains.data} kind="bar" color={IG_PINK} seriesLabel="Novos seguidores" format={fmt} />)}
              </Panel>
            </div>

            {/* Posts */}
            <h2 className="text-base font-semibold text-theme-primary mb-3">Últimos posts</h2>
            {posts.warn && <Banner tone="warn">{posts.warn}</Banner>}
            {posts.status === 'error' && <Banner tone="warn">Não foi possível carregar os posts. {posts.error}</Banner>}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {posts.status === 'loading' && Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-theme-border bg-theme-card overflow-hidden">
                  <div className="aspect-square bg-theme-surface animate-pulse" />
                  <div className="p-3 space-y-2"><Skel w="w-1/3" /><Skel w="w-full" /></div>
                </div>
              ))}
              {posts.data?.map(p => <PostCard key={p.id} post={p} />)}
            </div>
            </>)}

            {conn.canManage && (
              <div className="mt-10 pt-5 border-t border-theme-border">
                <ConnectPanel clientId={clientId} canManage connectedAs={conn.username} expiresAt={conn.expiresAt} viaAgency={conn.viaAgency} publicMode={conn.publicMode} onDone={loadConnection} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Componentes auxiliares ────────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Skel({ w }: { w: string }) {
  return <span className={`inline-block h-3 ${w} rounded bg-theme-surface animate-pulse align-middle`} />
}

function Banner({ tone, children }: { tone: 'error' | 'warn' | 'ok'; children: React.ReactNode }) {
  const cls = tone === 'error'
    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    : tone === 'ok'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
  return <div className={`mb-4 px-4 py-2.5 rounded-lg border text-sm ${cls}`}>{children}</div>
}

function Kpi({ label, value, note, loading }: { label: string; value: string; note?: string; loading?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-theme-border bg-theme-card px-4 py-3.5">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: IG_GRADIENT }} />
      <p className="text-xs text-theme-secondary">{label}</p>
      <p className="text-2xl font-bold text-theme-primary tabular-nums mt-1">{loading ? <Skel w="w-20" /> : value}</p>
      <p className="text-[11px] text-theme-muted min-h-[16px] truncate">{loading ? '' : note}</p>
    </div>
  )
}

function Panel<T>({ title, sub, block, headline, action, children }: {
  title: string; sub: string; block: Block<T>; headline?: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-theme-border bg-theme-card p-4 min-w-0">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-sm font-semibold text-theme-primary">{title}</h3>
          <p className="text-[11px] text-theme-muted">{sub}</p>
        </div>
        {headline && <span className="text-lg font-bold text-theme-primary tabular-nums" title="Média do período">{headline}</span>}
        {action}
      </div>
      {block.status === 'loading' && <div className="h-[230px] rounded-lg bg-theme-surface animate-pulse" />}
      {block.status === 'error' && <div className="h-[230px] flex items-center justify-center text-center text-xs text-theme-muted px-6">{block.error}</div>}
      {block.status === 'ok' && children}
      {block.warn && <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">{block.warn}</p>}
    </div>
  )
}

/* ─── Modo "só pelo @" (dados públicos via Business Discovery) ──────────── */
type PublicData = {
  profile: Profile & { name?: string }
  media: Media[]
  snapshots: { snap_date: string; followers: number }[]
}

const FORMAT_OF = (m: Media) =>
  m.media_product_type === 'REELS' || m.media_type === 'VIDEO' ? 'Reels' : m.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel' : 'Foto'

function PublicMetrics({ clientId, range, days, periodLabel, tick }: {
  clientId: string; range: Range; days: { key: string; date: Date }[]; periodLabel: string; tick: number
}) {
  const [state, setState] = useState<Block<PublicData>>(LOADING)
  const [sortBy, setSortBy] = useState<'recent' | 'best'>('recent')

  useEffect(() => {
    let alive = true
    setState(LOADING)
    fetch(`/api/instagram/${clientId}/public`, { credentials: 'same-origin' })
      .then(async r => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body?.error?.message || `Erro ${r.status}`)
        return body as PublicData
      })
      .then(d => { if (alive) setState({ status: 'ok', data: d }) })
      .catch(e => { if (alive) setState({ status: 'error', error: e instanceof Error ? e.message : 'Erro ao carregar.' }) })
    return () => { alive = false }
  }, [clientId, tick])

  const calc = useMemo(() => {
    const d = state.data
    if (!d) return null
    const followers = d.profile.followers_count ?? 0
    const inRange = d.media
      .filter(m => m.timestamp && ts(new Date(m.timestamp)) >= range.since && ts(new Date(m.timestamp)) < range.until)
      .sort((a, b) => Date.parse(a.timestamp ?? '') - Date.parse(b.timestamp ?? ''))
    const rows: PostRow[] = inRange.map(m => {
      const inter = (m.like_count ?? 0) + (m.comments_count ?? 0)
      return { ...m, views: null, inter, rate: followers ? (inter / followers) * 100 : null }
    })
    const totalInter = rows.reduce((a, r) => a + r.inter, 0)
    const avgRate = rows.length && followers ? (totalInter / rows.length / followers) * 100 : null

    // Interações por dia (posts publicados no dia)
    const perDay = new Map<string, number>()
    for (const r of rows) {
      const k = toKey(new Date(r.timestamp as string))
      perDay.set(k, (perDay.get(k) ?? 0) + r.inter)
    }
    const dayValues = days.map(dd => perDay.get(dd.key) ?? 0)

    // Por formato
    const fmts = ['Reels', 'Carrossel', 'Foto']
    const byFmt = fmts.map(f => {
      const list = rows.filter(r => FORMAT_OF(r) === f)
      return { f, n: list.length, avg: list.length ? list.reduce((a, r) => a + (r.rate ?? 0), 0) / list.length : null }
    })

    // Seguidores (histórico salvo pelo sistema)
    const snaps = d.snapshots.filter(s => {
      const t = ts(fromKey(s.snap_date))
      return t >= range.since - 86400 && t < range.until
    })
    const growth = snaps.length >= 2 ? snaps[snaps.length - 1].followers - snaps[0].followers : null
    const weeks = Math.max(1, (range.until - range.since) / (7 * 86400))
    const oldestFetched = d.media.length ? Date.parse(d.media[d.media.length - 1].timestamp ?? '') / 1000 : null
    const truncated = d.media.length >= 100 && oldestFetched != null && oldestFetched > range.since

    return { followers, rows, totalInter, avgRate, dayValues, byFmt, snaps, growth, perWeek: rows.length / weeks, truncated }
  }, [state.data, range, days])

  if (state.status === 'loading') return <Spinner />
  if (state.status === 'error' || !state.data || !calc) {
    return <Banner tone="error">Não foi possível carregar os dados públicos. {state.error}</Banner>
  }
  const p = state.data.profile
  const sorted = [...calc.rows].sort((a, b) =>
    sortBy === 'best' ? (b.rate ?? 0) - (a.rate ?? 0) : Date.parse(b.timestamp ?? '') - Date.parse(a.timestamp ?? ''))

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-full p-[3px] flex-shrink-0" style={{ background: IG_GRADIENT }}>
          {p.profile_picture_url
            ? <img src={p.profile_picture_url} alt="" referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover border-[3px] border-theme-bg" />
            : <div className="w-full h-full rounded-full bg-theme-surface border-[3px] border-theme-bg" />}
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-base font-semibold text-theme-primary">@{p.username}</p>
          <p className="text-sm text-theme-secondary whitespace-pre-line line-clamp-2 max-w-2xl">{p.biography}</p>
        </div>
      </div>

      <Banner tone="warn">
        Acompanhado só pelo @ (dados públicos): seguidores, posts, curtidas e comentários. Alcance e views exigem a conexão completa da conta.
      </Banner>
      {calc.truncated && <Banner tone="warn">O período começa antes dos 100 posts mais recentes — posts mais antigos não entram na conta.</Banner>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <Kpi label="Seguidores" value={fmt(calc.followers)}
          note={calc.growth != null ? `${calc.growth >= 0 ? '+' : ''}${fmt(calc.growth)} no período` : `seguindo ${fmt(p.follows_count)}`} />
        <Kpi label={`Posts (${periodLabel})`} value={fmt(calc.rows.length)}
          note={`${calc.perWeek.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por semana · ${fmt(p.media_count)} no total`} />
        <Kpi label="Interações por post" value={calc.rows.length ? fmt(calc.totalInter / calc.rows.length) : '—'} note="curtidas + comentários" />
        <Kpi label="Engajamento médio" value={fmtPct(calc.avgRate)} note="interações ÷ seguidores, por post" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8">
        <Panel title="Engajamento por post" sub="Interações ÷ seguidores, em ordem de publicação"
          block={calc.rows.length ? { status: 'ok' } : { status: 'error', error: 'Nenhum post no período.' }}>
          <MetricChart labels={calc.rows.map(r => fmtDayShort(new Date(r.timestamp as string)))}
            values={calc.rows.map(r => r.rate)} kind="bar" color={IG_ORANGE} seriesLabel="Engajamento" format={fmtPct} />
        </Panel>
        <Panel title="Interações por dia" sub="Curtidas + comentários dos posts publicados em cada dia"
          block={calc.rows.length ? { status: 'ok' } : { status: 'error', error: 'Nenhum post no período.' }}>
          <MetricChart labels={days.map(dd => fmtDayShort(dd.date))} values={calc.dayValues} kind="bar" color={IG_PINK} seriesLabel="Interações" format={fmt} />
        </Panel>
        <Panel title="Engajamento por formato" sub={calc.byFmt.map(b => `${b.f}: ${b.n}`).join(' · ')}
          block={calc.rows.length ? { status: 'ok' } : { status: 'error', error: 'Nenhum post no período.' }}>
          <MetricChart labels={calc.byFmt.map(b => b.f)} values={calc.byFmt.map(b => b.avg)} kind="bar" color={IG_PURPLE} seriesLabel="Engajamento médio" format={fmtPct} />
        </Panel>
        <Panel title="Seguidores" sub="Histórico diário registrado pelo sistema"
          block={calc.snaps.length >= 2 ? { status: 'ok' }
            : { status: 'error', error: `O histórico começou em ${state.data.snapshots[0] ? fmtDayLong(fromKey(state.data.snapshots[0].snap_date)) : 'hoje'} — a curva aparece conforme os dias passam.` }}>
          <MetricChart labels={calc.snaps.map(s => fmtDayShort(fromKey(s.snap_date)))} values={calc.snaps.map(s => s.followers)}
            kind="line" color={IG_PURPLE} seriesLabel="Seguidores" format={fmt} zeroBased={false} />
        </Panel>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-theme-primary">Posts do período</h2>
        <div className="flex bg-theme-surface rounded-md p-0.5 gap-0.5">
          {(['recent', 'best'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-2.5 py-1 rounded text-xs ${sortBy === s ? 'bg-theme-card text-theme-primary shadow-sm' : 'text-theme-muted'}`}>
              {s === 'recent' ? 'Mais recentes' : 'Melhor engajamento'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {sorted.map(r => <PostCard key={r.id} post={r} publicMode />)}
        {!sorted.length && <p className="text-sm text-theme-muted">Nenhum post no período.</p>}
      </div>
    </>
  )
}

function PostCard({ post, publicMode }: { post: PostRow; publicMode?: boolean }) {
  const img = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url ?? post.thumbnail_url
  const tag = post.media_type === 'VIDEO' ? 'Reels' : post.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel' : ''
  return (
    <a href={post.permalink} target="_blank" rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-theme-border bg-theme-card overflow-hidden hover:border-theme-border-strong transition-colors">
      <div className="relative aspect-square bg-theme-surface">
        {img && <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />}
        {tag && <span className="absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">{tag}</span>}
        <ExternalLink size={14} className="absolute top-2 left-2 text-white opacity-0 group-hover:opacity-100 drop-shadow" />
      </div>
      <div className="px-3 pt-2.5 flex-1">
        <p className="text-[11px] text-theme-muted">{post.timestamp ? fmtDayLong(new Date(post.timestamp)) : ''}</p>
        <p className="text-xs text-theme-secondary line-clamp-2 min-h-[32px]">{post.caption || 'Sem legenda'}</p>
      </div>
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-1 px-3 py-2.5 mt-2 border-t border-theme-border text-[11px] text-theme-secondary tabular-nums">
        <span title="Curtidas">❤️ {fmt(post.like_count)}</span>
        <span title="Comentários">💬 {fmt(post.comments_count)}</span>
        {publicMode ? <span /> : <span title="Views">👁️ {fmt(post.views)}</span>}
        <span title={publicMode ? 'Engajamento (interações ÷ seguidores)' : 'Engajamento (interações ÷ views)'}
          className={`rounded px-1.5 py-0.5 font-bold ${post.rate == null ? 'bg-theme-surface text-theme-muted' : 'text-white'}`}
          style={post.rate == null ? undefined : { background: IG_GRADIENT }}>
          {fmtPct(post.rate)}
        </span>
      </div>
    </a>
  )
}

function ConnectPanel({ clientId, canManage, connectedAs, expiresAt, viaAgency, publicMode, onDone }: {
  clientId: string; canManage: boolean; connectedAs?: string | null; expiresAt?: string | null; viaAgency?: boolean; publicMode?: boolean; onDone: () => void
}) {
  const [showManual, setShowManual] = useState(false)
  const [showOptions, setShowOptions] = useState(!connectedAs)
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null)
  const [invite, setInvite] = useState<{ url: string; expiresAt: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [agencyList, setAgencyList] = useState<AgencyAccount[] | null>(null)
  const [agencyLoading, setAgencyLoading] = useState(false)
  const [agencyPick, setAgencyPick] = useState('')
  const [publicUser, setPublicUser] = useState('')

  if (!canManage) {
    return (
      <div className="max-w-lg mx-auto mt-10 text-center">
        <p className="text-theme-primary font-medium">Instagram ainda não conectado</p>
        <p className="text-sm text-theme-secondary mt-1">Peça a um administrador para conectar a conta deste cliente.</p>
      </div>
    )
  }

  const saveToken = async () => {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`/api/instagram/${clientId}/connection`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `Erro ${res.status}`)
      setToken('')
      setMsg({ tone: 'ok', text: `Conectado como @${body.username}.` })
      onDone()
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'Erro ao salvar.' })
    } finally {
      setSaving(false)
    }
  }

  const makeInvite = async () => {
    setMsg(null); setCopied(false)
    try {
      const res = await fetch(`/api/instagram/${clientId}/invite`, { method: 'POST', credentials: 'same-origin' })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `Erro ${res.status}`)
      setInvite(body)
      try { await navigator.clipboard.writeText(body.url); setCopied(true) } catch { /* sem permissão de clipboard */ }
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'Erro ao gerar link.' })
    }
  }

  const disconnect = async () => {
    if (!confirm('Desconectar o Instagram deste cliente? O token salvo será apagado.')) return
    await fetch(`/api/instagram/${clientId}/connection`, { method: 'DELETE', credentials: 'same-origin' })
    onDone()
  }

  const loadAgency = async () => {
    setAgencyLoading(true); setMsg(null)
    try {
      const res = await fetch('/api/instagram/agency-accounts', { credentials: 'same-origin' })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `Erro ${res.status}`)
      setAgencyList(body.accounts as AgencyAccount[])
      if (!body.accounts?.length) setMsg({ tone: 'error', text: 'Nenhuma conta do Instagram encontrada na BM da agência.' })
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'Erro ao carregar contas da BM.' })
    } finally {
      setAgencyLoading(false)
    }
  }

  const linkAgency = async () => {
    if (!agencyPick) return
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`/api/instagram/${clientId}/connection`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agencyIgUserId: agencyPick }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `Erro ${res.status}`)
      setMsg({ tone: 'ok', text: `Conectado como @${body.username}.` })
      onDone()
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'Erro ao vincular.' })
    } finally {
      setSaving(false)
    }
  }

  const linkPublic = async () => {
    if (!publicUser.trim()) return
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`/api/instagram/${clientId}/connection`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicUsername: publicUser }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `Erro ${res.status}`)
      setMsg({ tone: 'ok', text: `Acompanhando @${body.username} pelos dados públicos.` })
      onDone()
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'Erro ao vincular.' })
    } finally {
      setSaving(false)
    }
  }

  const options = (
    <div className="space-y-4">
      {/* Só pelo @ — dados públicos, sem senha nem ação do cliente */}
      <div className="rounded-lg border border-theme-border bg-theme-surface p-3">
        <p className="text-sm font-medium text-theme-primary">Só pelo @ <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">MAIS RÁPIDO</span></p>
        <p className="text-xs text-theme-muted mt-0.5 mb-2">
          Seguidores, posts, curtidas, comentários e engajamento de qualquer conta profissional pública. Alcance e views não entram.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input value={publicUser} onChange={e => setPublicUser(e.target.value)} placeholder="@usuario"
            onKeyDown={e => { if (e.key === 'Enter') linkPublic() }}
            className="min-w-[200px] flex-1 rounded-lg border border-theme-border bg-theme-card px-2 py-1.5 text-xs text-theme-primary" />
          <button onClick={linkPublic} disabled={!publicUser.trim() || saving}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-semibold rounded-lg">
            {saving ? 'Buscando…' : 'Acompanhar'}
          </button>
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-theme-muted pt-1">Conexão completa (com alcance e views)</p>

      {/* Pela BM da agência — sem senha e sem ação do cliente */}
      <div className="rounded-lg border border-theme-border bg-theme-surface p-3">
        <p className="text-sm font-medium text-theme-primary">Pela BM da Ráfia Colab <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">RECOMENDADO</span></p>
        <p className="text-xs text-theme-muted mt-0.5 mb-2">
          Contas do Instagram que estão na sua BM ou que o cliente compartilhou com ela (parceiro). Não precisa de senha nem de ação do cliente.
        </p>
        {!agencyList ? (
          <button onClick={loadAgency} disabled={agencyLoading}
            className="px-3 py-1.5 rounded-lg border border-theme-border bg-theme-card text-theme-primary text-xs font-medium hover:border-theme-border-strong disabled:opacity-50">
            {agencyLoading ? 'Carregando…' : 'Escolher conta da BM'}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select value={agencyPick} onChange={e => setAgencyPick(e.target.value)}
              className="min-w-[220px] flex-1 rounded-lg border border-theme-border bg-theme-card px-2 py-1.5 text-xs text-theme-primary">
              <option value="">Selecione a conta…</option>
              {agencyList.map(a => (
                <option key={a.id} value={a.id}>
                  @{a.username}{a.name ? ` (${a.name})` : ''}{a.linkedTo ? ` — já usada em ${a.linkedTo}` : ''}
                </option>
              ))}
            </select>
            <button onClick={linkAgency} disabled={!agencyPick || saving}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-semibold rounded-lg">
              {saving ? 'Vinculando…' : 'Vincular'}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a href={`/api/instagram/oauth/start?clientId=${clientId}&ig=1`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: IG_GRADIENT }}>
          Entrar com o Instagram da cliente
        </a>
        <a href={`/api/instagram/oauth/start?clientId=${clientId}`}
          className="px-4 py-2 rounded-lg border border-theme-border bg-theme-surface text-theme-primary text-sm font-medium hover:border-theme-border-strong transition-colors">
          Conectar pelo meu Facebook
        </a>
        <button onClick={makeInvite}
          className="px-4 py-2 rounded-lg border border-theme-border bg-theme-surface text-theme-primary text-sm font-medium hover:border-theme-border-strong transition-colors">
          Gerar link para o cliente
        </button>
      </div>
      <p className="text-xs text-theme-muted">
        <b>Entrar com o Instagram da cliente</b>: a Meta pede login; escolha Instagram e use o usuário e a senha da cliente (a conta precisa ter aceito o convite de testador do app).{' '}
        <b>Conectar pelo meu Facebook</b>: para contas em portfólios onde você tem controle total.{' '}
        <b>Link para o cliente</b>: envie por WhatsApp; ele entra com o próprio Instagram ou Facebook e autoriza (válido por 7 dias, não dá acesso ao sistema).
      </p>

      {invite && (
        <div className="rounded-lg border border-theme-border bg-theme-surface p-3">
          <p className="text-xs text-theme-secondary mb-1.5">
            {copied ? 'Link copiado! ' : ''}Válido até {fmtDayLong(new Date(invite.expiresAt))}:
          </p>
          <input readOnly value={invite.url} onFocus={e => e.currentTarget.select()}
            className="w-full rounded border border-theme-border bg-theme-card px-2 py-1.5 text-[11px] font-mono text-theme-primary" />
        </div>
      )}

      <div>
        <button onClick={() => setShowManual(s => !s)} className="text-xs text-theme-muted underline hover:text-theme-primary">
          {showManual ? 'Ocultar' : 'Ou colar um token manualmente'}
        </button>
        {showManual && (
          <div className="mt-2">
            <textarea value={token} onChange={e => setToken(e.target.value)} rows={3} placeholder="Token de acesso"
              className="w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-xs font-mono text-theme-primary outline-none focus:border-theme-border-strong" />
            <button onClick={saveToken} disabled={!token.trim() || saving}
              className="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors">
              {saving ? 'Validando…' : 'Salvar token'}
            </button>
          </div>
        )}
      </div>

      {msg && <p className={`text-xs ${msg.tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{msg.text}</p>}
    </div>
  )

  if (connectedAs) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-theme-muted">
          <span>Conectado como <b className="text-theme-secondary">@{connectedAs}</b>
            {publicMode ? ' · só dados públicos (pelo @)' : viaAgency ? ' · via BM da Ráfia Colab' : expiresAt ? ` · token válido até ${fmtDayLong(new Date(expiresAt))} (renovação automática)` : ' · acesso permanente'}</span>
          <button onClick={() => setShowOptions(o => !o)} className="underline hover:text-theme-primary">Reconectar</button>
          <button onClick={disconnect} className="underline hover:text-red-500">Desconectar</button>
        </div>
        {showOptions && <div className="mt-4 max-w-xl">{options}</div>}
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto mt-6 rounded-xl border border-theme-border bg-theme-card p-6">
      <h2 className="text-base font-semibold text-theme-primary">Conectar Instagram</h2>
      <p className="text-sm text-theme-secondary mt-1 mb-5">
        Conecte a conta profissional (Empresa ou Criador) deste cliente. O acesso fica guardado só no servidor e não expira (o cliente pode revogar quando quiser).
      </p>
      {options}
    </div>
  )
}
