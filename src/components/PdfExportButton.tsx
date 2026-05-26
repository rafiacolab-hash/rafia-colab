'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import type { DayEntry } from '@/app/lib/entries'

type Props = {
  entries: DayEntry[]
  clientName: string
  monthRef: string
}

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function formatMonthLabel(monthRef: string): string {
  const [y, m] = monthRef.split('-').map(Number)
  return `${MONTHS_PT[m - 1]} ${y}`
}

function formatDayLabel(entry: DayEntry): string {
  const date = new Date(entry.entry_date + 'T12:00:00')
  const day = String(date.getDate()).padStart(2, '0')
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${entry.dia_semana}, ${day} ${months[date.getMonth()]}`
}

// Quebra texto longo em linhas que cabem na largura definida
function splitTextToLines(text: string, maxWidth: number, doc: InstanceType<typeof import('jspdf').jsPDF>): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[]
}

export default function PdfExportButton({ entries, clientName, monthRef }: Props) {
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const { jsPDF } = await import('jspdf')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageW    = 210
      const pageH    = 297
      const marginL  = 18
      const marginR  = 18
      const marginT  = 18
      const marginB  = 20
      const contentW = pageW - marginL - marginR

      // Paleta de cores (RGB)
      const colorGreen    = [16,  185, 129] as [number,number,number]  // emerald-500
      const colorDark     = [24,  24,  27 ] as [number,number,number]  // zinc-900
      const colorGray     = [113, 113, 122] as [number,number,number]  // zinc-500
      const colorLightBg  = [244, 244, 245] as [number,number,number]  // zinc-100
      const colorWhite    = [255, 255, 255] as [number,number,number]
      const colorPink     = [236, 72,  153] as [number,number,number]  // pink-500
      const colorBlue     = [59,  130, 246] as [number,number,number]  // blue-500
      const colorEmerald  = [16,  185, 129] as [number,number,number]  // emerald-500
      const colorMuted    = [161, 161, 170] as [number,number,number]  // zinc-400

      let y = marginT

      // ── Função auxiliar: nova página ──────────────────────────────────────
      const newPage = () => {
        doc.addPage()
        y = marginT
        // Rodapé discreto em cada página
        doc.setFontSize(8)
        doc.setTextColor(...colorMuted)
        doc.text(
          `${clientName} · ${formatMonthLabel(monthRef)}`,
          pageW / 2, pageH - 8, { align: 'center' }
        )
      }

      // Verifica se precisa de nova página antes de adicionar bloco
      const ensureSpace = (needed: number) => {
        if (y + needed > pageH - marginB) newPage()
      }

      // ── CABEÇALHO ─────────────────────────────────────────────────────────
      // Faixa verde no topo
      doc.setFillColor(...colorGreen)
      doc.rect(0, 0, pageW, 32, 'F')

      // Nome do cliente
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.setTextColor(...colorWhite)
      doc.text(clientName.toUpperCase(), marginL, 14)

      // Subtítulo: mês
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(...colorWhite)
      doc.text('Planejamento de Conteúdo · ' + formatMonthLabel(monthRef), marginL, 23)

      // Ráfia Co.lab — canto direito
      doc.setFontSize(8)
      doc.text('Ráfia Co.lab', pageW - marginR, 23, { align: 'right' })

      y = 42  // Início do conteúdo, após cabeçalho

      // Rodapé da primeira página
      doc.setFontSize(8)
      doc.setTextColor(...colorMuted)
      doc.text(
        `${clientName} · ${formatMonthLabel(monthRef)}`,
        pageW / 2, pageH - 8, { align: 'center' }
      )

      // ── ENTRADAS POR DIA ───────────────────────────────────────────────────
      const filteredEntries = entries.filter(e =>
        e.stories_content || e.feed_content || e.acoes_content || e.observacoes
      )

      for (const entry of filteredEntries) {
        // Estima a altura do bloco do dia
        let estimatedH = 14  // cabeçalho do dia
        const sections: { label: string; color: [number,number,number]; content: string; format: string | null }[] = []

        if (entry.stories_content) sections.push({ label: 'Stories', color: colorPink,    content: entry.stories_content, format: entry.stories_format })
        if (entry.feed_content)    sections.push({ label: 'Feed',    color: colorBlue,    content: entry.feed_content,    format: entry.feed_format    })
        if (entry.acoes_content)   sections.push({ label: 'Ação',    color: colorEmerald, content: entry.acoes_content,   format: entry.acoes_format   })

        for (const sec of sections) {
          const lines = splitTextToLines(sec.content, contentW - 12, doc)
          estimatedH += 7 + lines.length * 4.5 + (sec.format ? 5 : 0) + 4
        }

        if (entry.observacoes) {
          const obsLines = splitTextToLines(entry.observacoes, contentW - 12, doc)
          estimatedH += 7 + obsLines.length * 4.5 + 4
        }

        estimatedH += 4  // margem inferior

        ensureSpace(Math.min(estimatedH, pageH - marginT - marginB))

        // ── Cabeçalho do dia ────────────────────────────────────────────────
        // Faixa cinza clara
        doc.setFillColor(...colorLightBg)
        doc.roundedRect(marginL, y, contentW, 9, 2, 2, 'F')

        // Texto do dia
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(...colorDark)
        doc.text(formatDayLabel(entry).toUpperCase(), marginL + 4, y + 6.2)

        y += 12

        // ── Seções de conteúdo ───────────────────────────────────────────────
        for (const sec of sections) {
          ensureSpace(14)

          // Bolinha colorida + label
          doc.setFillColor(...sec.color)
          doc.circle(marginL + 2, y + 1, 1.5, 'F')

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8.5)
          doc.setTextColor(...sec.color)
          doc.text(sec.label, marginL + 6, y + 2.2)

          // Formato (ex: Reels, Carrossel)
          if (sec.format) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(...colorGray)
            doc.text(`· ${sec.format}`, marginL + 6 + doc.getTextWidth(sec.label) + 1.5, y + 2.2)
          }

          y += 5.5

          // Conteúdo do texto
          const lines = splitTextToLines(sec.content, contentW - 10, doc)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8.5)
          doc.setTextColor(...colorDark)

          for (const line of lines) {
            ensureSpace(5)
            doc.text(line, marginL + 6, y)
            y += 4.5
          }

          y += 3  // espaço entre seções
        }

        // ── Observações ──────────────────────────────────────────────────────
        if (entry.observacoes) {
          ensureSpace(14)

          // Label obs
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7.5)
          doc.setTextColor(...colorGray)
          doc.text('OBSERVAÇÕES', marginL + 6, y + 2)

          y += 5

          const obsLines = splitTextToLines(entry.observacoes, contentW - 10, doc)
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(8)
          doc.setTextColor(...colorGray)

          for (const line of obsLines) {
            ensureSpace(5)
            doc.text(line, marginL + 6, y)
            y += 4.5
          }

          y += 2
        }

        // Linha separadora fina entre dias
        doc.setDrawColor(...colorLightBg)
        doc.setLineWidth(0.3)
        doc.line(marginL, y + 1, marginL + contentW, y + 1)
        y += 6
      }

      // Nenhum conteúdo
      if (filteredEntries.length === 0) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(...colorGray)
        doc.text('Nenhum conteúdo planejado para este mês.', pageW / 2, y + 20, { align: 'center' })
      }

      // ── Download ──────────────────────────────────────────────────────────
      const fileName = `${clientName.replace(/\s+/g, '_')}_${formatMonthLabel(monthRef).replace(/\s+/g, '_')}.pdf`
      doc.save(fileName)
    } catch (err) {
      console.error('[PdfExport] erro:', err)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      title="Exportar planejamento em PDF"
      className="flex items-center gap-2 px-4 py-2 border border-theme-border bg-theme-surface hover:bg-theme-raised text-theme-secondary hover:text-theme-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <FileDown size={15} />
      )}
      {loading ? 'Gerando…' : 'Gerar PDF'}
    </button>
  )
}
