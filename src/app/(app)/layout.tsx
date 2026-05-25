import Sidebar from '@/components/Sidebar'
import ClientGuard from '@/components/ClientGuard'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-theme-bg">
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col bg-theme-bg">
        <ClientGuard>
          {children}
        </ClientGuard>
      </main>
    </div>
  )
}
