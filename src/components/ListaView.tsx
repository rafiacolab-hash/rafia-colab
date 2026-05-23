'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import StatusBadge from './StatusBadge'
import EditEntryModal from './EditEntryModal'
import type { DayEntry } from '@/app/lib/entries'

type Props = {
  entries: DayEntry[]
  onRefresh: () => void
}

export default function ListaView({ entries, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editingEntry, setEditingEntry] = useState<DayEntry | null>(null)

  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_60px_1fr_1fr_1fr_120px_36px] gap-2 px-4 py-3 bg-zinc-800/50 border-b border-zinc-800">
          <div />
          <span className="text-zinc-500 text-xs font-medium">Dia</span>
          <span className="text-zinc-500 text-xs font-medium">Stories</span>
          <span className="text-zinc-500 text-xs font-medium">Feed</span>
          <span className="text-zinc-500 text-xs font-medium">Ação</span>
          <span className="text-zinc-500 text-xs font-medium">Status</span>
          <div />
        </div>

        {entries.map(entry => {
          const isOpen = expanded[entry.id]

          return (
            <div key={entry.id} className="border-b border-zinc-800 last:border-0">
              {/* Row */}
              <div className="grid grid-cols-[40px_60px_1fr_1fr_1fr_120px_36px] gap-2 px-4 py-3 hover:bg-zinc-800/30 items-center">
                {/* Expand toggle */}
                <button
                  onClick={() => toggle(entry.id)}
                  className="text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* Dia */}
                <div className="cursor-pointer" onClick={() => toggle(entry.id)}>
                  <span className="text-white text-sm font-medium">
                    {new Date(entry.entry_date + 'T12:00:00').getDate()}
                  </span>
                  <span className="text-zinc-500 text-xs ml-1">{entry.dia_semana}</span>
                </div>

                {/* Conteúdos */}
                <span className="text-zinc-400 text-xs truncate cursor-pointer" onClick={() => toggle(entry.id)}>
                  {entry.stories_content ?? <span className="text-zinc-700">—</span>}
                </span>
                <span className="text-zinc-400 text-xs truncate cursor-pointer" onClick={() => toggle(entry.id)}>
                  {entry.feed_content ?? <span className="text-zinc-700">—</span>}
                </span>
                <span className="text-zinc-400 text-xs truncate cursor-pointer" onClick={() => toggle(entry.id)}>
                  {entry.acoes_content ?? <span className="text-zinc-700">—</span>}
                </span>

                {/* Status badges */}
                <div className="flex gap-1 flex-wrap cursor-pointer" onClick={() => toggle(entry.id)}>
                  {entry.stories_status && <StatusBadge status={entry.stories_status} />}
                  {entry.feed_status && <StatusBadge status={entry.feed_status} />}
                  {entry.acoes_status && <StatusBadge status={entry.acoes_status} />}
                </div>

                {/* Botão editar */}
                <button
                  onClick={() => setEditingEntry(entry)}
                  className="text-zinc-600 hover:text-emerald-400 transition-colors p-1 rounded"
                  title="Editar dia"
                >
                  <Pencil size={13} />
                </button>
              </div>

              {/* Painel expandido */}
              {isOpen && (
                <div className="px-4 pb-4 bg-zinc-800/20">
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    {[
                      { label: 'Stories', content: entry.stories_content, status: entry.stories_status, format: entry.stories_format },
                      { label: 'Feed',    content: entry.feed_content,    status: entry.feed_status,    format: entry.feed_format    },
                      { label: 'Ação',    content: entry.acoes_content,   status: entry.acoes_status,   format: entry.acoes_format   },
                    ].map(item => (
                      <div key={item.label} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-zinc-400">{item.label}</span>
                          {item.status && <StatusBadge status={item.status} />}
                        </div>
                        {item.content
                          ? <p className="text-sm text-white">{item.content}</p>
                          : <p className="text-xs text-zinc-700 italic">Sem conteúdo</p>}
                        {item.format && (
                          <span className="mt-2 inline-block text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                            {item.format}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {(entry.legenda_copy || entry.arte_link || entry.observacoes) && (
                    <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800 space-y-2">
                      {entry.legenda_copy && (
                        <div>
                          <span className="text-xs text-zinc-500">Legenda</span>
                          <p className="text-sm text-zinc-300 mt-0.5">{entry.legenda_copy}</p>
                        </div>
                      )}
                      {entry.arte_link && (
                        <div>
                          <span className="text-xs text-zinc-500">Arte/Link</span>
                          <a href={entry.arte_link} target="_blank" rel="noreferrer"
                            className="text-sm text-emerald-400 hover:underline block mt-0.5">
                            {entry.arte_link}
                          </a>
                        </div>
                      )}
                      {entry.observacoes && (
                        <div>
                          <span className="text-xs text-zinc-500">Observações</span>
                          <p className="text-sm text-zinc-300 mt-0.5">{entry.observacoes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setEditingEntry(entry)}
                    className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
                  >
                    <Pencil size={12} /> Editar este dia
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de edição */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => {
            setEditingEntry(null)
            onRefresh()
          }}
        />
      )}
    </>
  )
}
