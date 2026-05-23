export default function SemAcessoPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full gap-3 text-center px-8">
      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-2xl">🔒</div>
      <h2 className="text-white font-semibold text-lg">Acesso restrito</h2>
      <p className="text-zinc-500 text-sm max-w-xs">
        Sua conta ainda não está vinculada a um cliente. Fale com o administrador para liberar o acesso.
      </p>
    </div>
  )
}
