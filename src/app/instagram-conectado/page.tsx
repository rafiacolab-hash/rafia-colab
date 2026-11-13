// Página pública mostrada ao final do "Conectar com Instagram" (principalmente para o cliente
// que abriu o link de convite e não tem login no sistema).

type Props = { searchParams: { status?: string; msg?: string; u?: string } }

export const dynamic = 'force-dynamic'

export default function InstagramConectadoPage({ searchParams }: Props) {
  const ok = searchParams.status === 'ok'
  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-theme-border bg-theme-card p-8 text-center shadow-sm">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white"
          style={{ background: ok ? 'linear-gradient(135deg,#fa7e1e 0%,#d62976 50%,#962fbf 100%)' : '#ef4444' }}>
          {ok ? '✓' : '!'}
        </div>
        <h1 className="text-lg font-semibold text-theme-primary">
          {ok ? 'Instagram conectado!' : 'Não foi possível conectar'}
        </h1>
        <p className="mt-2 text-sm text-theme-secondary">
          {ok
            ? `A conta${searchParams.u ? ` @${searchParams.u}` : ''} foi conectada à Ráfia Co.lab. Você já pode fechar esta página.`
            : searchParams.msg || 'Tente novamente ou fale com a Ráfia Co.lab.'}
        </p>
        <p className="mt-6 text-xs text-theme-muted">Ráfia Co.lab</p>
      </div>
    </div>
  )
}
