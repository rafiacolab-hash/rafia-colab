# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Deploy

> **O projeto roda no Vercel.** Não existe servidor local ativo — o usuário acessa pelo link do Vercel.
> Após qualquer alteração de código, é obrigatório fazer commit e push para o GitHub para que o Vercel publique automaticamente:

```bash
git add src/
git commit -m "descrição da mudança"
git push origin main
```

O Vercel detecta o push e faz o deploy em ~1-2 minutos.

---

## Regra de visualizações

> Toda alteração em uma visualização (Lista, Kanban, Calendário, Cards) deve ser aplicada em **todas** as páginas que contêm aquela visualização:
> - `src/components/KanbanView.tsx` → visão kanban por cliente (`/[clientId]/[monthRef]`)
> - `src/app/(app)/dashboard/page.tsx` → contém `KanbanGlobal`, `GlobalListaView`, `GlobalCalendarView` (dashboard geral)
> - `src/components/ListaView.tsx` → visão lista por cliente
> - `src/components/CalendarView.tsx` → visão calendário por cliente
>
> Nunca atualizar só um lado sem verificar o outro.

---

## Comandos

```bash
npm run dev      # inicia servidor de desenvolvimento em localhost:3000
npm run build    # build de produção (também valida TypeScript)
npm run lint     # ESLint
npx tsc --noEmit # verificação de tipos sem gerar arquivos
```

---

## Visão geral do projeto

**Ráfia Co.lab** — sistema de gestão de planejamento de conteúdo para social media. Uma agência de marketing usa o sistema para gerenciar seus clientes, cada cliente tem meses de planejamento com entradas diárias (Stories, Feed, Ação).

Stack: **Next.js 14.2 App Router · Supabase · TypeScript · Tailwind CSS**

---

## Arquitetura crítica: dois clientes Supabase

> Esta é a regra mais importante do projeto. Violá-la causa travamentos silenciosos.

O arquivo `src/app/lib/supabase.ts` exporta **dois clientes distintos**:

### `createClient()` — SSR (`@supabase/ssr`)
- Usado **apenas** para: `signInWithPassword`, `signOut`, `onAuthStateChange`
- **Nunca** usar para queries de dados — o lock interno do auth-js trava chamadas concorrentes

### `createDataClient()` — puro (`@supabase/supabase-js`)
- Usado para **todas** as queries de dados: `clients`, `day_entries`, `month_lists`, `users_profile`
- Lê o access token diretamente do cookie (sem `getSession()`), injeta via `Authorization: Bearer`
- Não tem lock, é seguro para múltiplas chamadas paralelas

### `getUserFromCookie()` — leitura síncrona do JWT
- Alternativa síncrona ao `getSession()` — lê e decodifica o JWT do cookie sem risco de deadlock
- Usado na inicialização do `useAuth`, `Sidebar`, e qualquer lugar que precise do userId antes do primeiro render assíncrono

---

## Banco de dados (Supabase)

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `clients` | id, name, color (hex) |
| `month_lists` | id, client_id, month_ref (YYYY-MM), year |
| `day_entries` | entrada diária de conteúdo — ver campos abaixo |
| `users_profile` | id (= auth.uid), name, role, client_id |

### `day_entries` — campos relevantes

```
id, month_list_id, client_id, entry_date (YYYY-MM-DD), dia_semana
stories_content, stories_status, stories_format
feed_content,    feed_status,    feed_format
acoes_content,   acoes_status,   acoes_format
legenda_copy, arte_link, observacoes
created_at, updated_at
```

### Coluna `mes_ref` NÃO existe em `day_entries`

Filtros por mês usam range de `entry_date`:
```ts
.gte('entry_date', `${monthRef}-01`)
.lte('entry_date', `${monthRef}-31`)
```

### Status válidos (enum)

`AGUARDANDO` · `A_FAZER` · `ANDAMENTO` · `VALIDACAO` · `CORRECAO` · `CANCELADO` · `POSTADO`

### Upsert em `day_entries`

Conflito resolvido por: `onConflict: 'month_list_id,entry_date'`

---

## Estrutura de rotas (App Router)

```
src/app/
├── layout.tsx                      # RootLayout — inclui script anti-flash de tema
├── page.tsx                        # redireciona → /dashboard
├── login/page.tsx
└── (app)/                          # route group — todas as páginas autenticadas
    ├── layout.tsx                  # AppLayout: <Sidebar> + <ClientGuard> + <main>
    ├── dashboard/page.tsx          # "Todos os clientes" — 4 views
    ├── [clientId]/[monthRef]/page.tsx  # planejamento individual por cliente/mês
    ├── admin/
    │   ├── users/page.tsx          # gestão de usuários (admin only)
    │   └── import/page.tsx         # importação de CSVs (admin only)
    └── sem-acesso/page.tsx

src/app/api/admin/
├── import-csv/route.ts             # GET: status dos CSVs; POST: importa para o banco
└── invite-user/route.ts            # convite de novos usuários
```

---

## Componentes principais

### Views por cliente (`[clientId]/[monthRef]/page.tsx`)

O toggle mostra 3 views: **Lista** · **Kanban** · **Calendário**

| Componente | Descrição |
|---|---|
| `ListaView` | Linhas expansíveis. Painel expandido tem **inline status** (dropdown) e **inline content** (textarea on-click). Salva com `createDataClient()` campo a campo. |
| `KanbanView` | Kanban por status para um único cliente. |
| `CalendarView` | Grid mensal. Clicar num dia abre `DayDetailPanel` (drawer lateral) com Stories/Feed/Ação + botão "Editar" que abre `EditEntryModal`. |

### Dashboard (`dashboard/page.tsx`)

4 views globais (todos os clientes combinados):

| View | Componente | Dados |
|---|---|---|
| Cards | `ClientCard` | summaries leves (status counts, % postado) |
| Lista | `GlobalListaView` | `fullEntries` — agrupa por cliente, renderiza `ListaView` por cliente |
| Kanban | `KanbanGlobal` | `kanbanItems` derivado de `fullEntries` |
| Calendário | `GlobalCalendarView` | `fullEntries` — dots coloridos por cliente, painel `GlobalDayPanel` ao clicar |

**Carregamento lazy:** `fullEntries` só é buscado ao entrar em Lista/Kanban/Calendário. Cards usa apenas os summaries leves.

### Sidebar (`Sidebar.tsx`)

- Expande clientes → carrega `month_lists` sob demanda
- `window.__sidebarRefreshMonths(clientId)` — função global para forçar refresh após "Gerar Mês"
- Toggle claro/escuro no footer via `useTheme()`

### `ClientGuard`

Wrapper em `(app)/layout.tsx`. Redireciona usuários com `role='client'` para o próprio cliente e bloqueia acesso a outros. Admins/assistentes passam sem restrição.

---

## Autenticação e autorização

### Roles

| Role | Acesso |
|---|---|
| `admin` | tudo, incluindo `/admin/*` |
| `assistant` | todos os clientes, sem admin |
| `client` | apenas o próprio cliente (via `linkedClientId` em `users_profile.client_id`) |

### `useAuth()`

Retorna `{ userId, userRole, userName, linkedClientId, loading, isAdmin, isAssistant, isClient }`. Usa `getUserFromCookie()` para leitura síncrona inicial + `onAuthStateChange` para detectar logout em tempo real.

### API routes admin (`/api/admin/*`)

Usam `createServerClient` (SSR) para verificar se o caller é admin, depois um cliente com `service_role` key para operações privilegiadas. A service role key fica em `SUPABASE_SERVICE_ROLE_KEY` (variável de ambiente server-only).

---

## Tema claro/escuro

### Como funciona

1. `globals.css` define variáveis CSS em `:root` (claro) e `.dark` (escuro)
2. `tailwind.config.ts` mapeia tokens `theme.*` para essas variáveis
3. `useTheme()` persiste em `localStorage('rafia-theme')` e alterna a classe `.dark` em `<html>`
4. `RootLayout` tem um `<script>` inline no `<head>` que aplica `.dark` antes do paint — sem flash

### Paleta de tokens

| Token Tailwind | Uso |
|---|---|
| `bg-theme-bg` | canvas principal da página |
| `bg-theme-card` | cards, painéis, sidebar |
| `bg-theme-surface` | inputs, botões, hover states |
| `bg-theme-raised` | elementos mais elevados |
| `border-theme-border` | bordas padrão |
| `border-theme-border-strong` | bordas em destaque |
| `text-theme-primary` | texto principal |
| `text-theme-secondary` | texto secundário |
| `text-theme-muted` | labels, placeholders |

**Regra:** nunca usar `bg-zinc-*`, `text-zinc-*` ou `dark:` prefixes diretamente — sempre os tokens `theme-*` para que o toggle funcione automaticamente.

---

## Importação de CSVs

- Arquivos CSV ficam em `scripts/data/`
- A rota `/api/admin/import-csv` (GET = verifica status, POST = importa) é o ponto de entrada
- Mapeamento de status do CSV → enum do banco está em `STATUS_MAP` dentro de `route.ts`
- Cliente ZNG tem estrutura de colunas diferente (`isZNG: true`) — colunas "Stories Ação" e status separados por formato
- Upsert idempotente: reimportar não apaga edições manuais

---

## Variáveis de ambiente necessárias

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # apenas server-side (API routes)
```
