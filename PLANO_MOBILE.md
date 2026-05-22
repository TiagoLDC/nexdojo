# Plano de Adequação Mobile — NexDojo

> **Data da varredura:** 2026-05-22
> **Objetivo:** Tornar todas as páginas do sistema NexDojo adequadas para uso em dispositivos mobile, sem alterar as visões de desktop.
> **Status:** Planejamento concluído — aguardando execução.

---

## 1. Panorama Geral

A infraestrutura mobile do app **já está bem montada** no nível de layout:
- `AppLayout.tsx` com `MobileHeader`, `MobileDock`, `MobileMenu`
- Sidebar com `hidden md:flex` (some em mobile)
- Drawer/dock funcionais

**O problema está DENTRO das views**, não no layout:
- Tabelas HTML grandes sem versão card alternativa para mobile
- Modais com padding/largura desktop sem redução
- Grids com `gap-8/10/12` sem ajuste em telas pequenas
- Headings `text-3xl/4xl` sem breakpoint responsivo
- Kiosk mode (AttendanceView) quebrado em mobile

---

## 2. Hotspots Críticos (5 views = ~70% do problema)

| View | Problema principal | Severidade |
|---|---|---|
| `views/DashboardView.tsx` | Tabela superuser inutilizável, `p-10` em cards, headings sem breakpoint | ALTA |
| `views/StudentsView.tsx` | Tabela com `min-w-[600px]` (linha 854), modal grande | ALTA |
| `views/InstructorsView.tsx` | Tabela (linha 504) e modal `max-w-4xl` sem redução mobile | ALTA |
| `views/FinancesView.tsx` | Tabela `hidden md:block` (linha 461) sem versão card mobile, `p-12` | ALTA |
| `views/AttendanceView.tsx` | **Kiosk mode quebrado em mobile** (linha 945, feature principal) | ALTA |

---

## 3. Padrões Anti-Mobile Identificados (frequência)

1. **Tabelas HTML sem versão mobile** — 5 views (Students, Instructors, Finances, Dashboard, Users)
2. **Gaps grandes sem redução** — 10+ views (`gap-8`, `gap-10`, `gap-12` sem `gap-4 md:gap-X`)
3. **Padding excessivo** — 8+ views (`p-8`, `p-10`, `p-12` sem `p-4 md:p-X`)
4. **Textos sem breakpoint** — 7+ views (`text-3xl`, `text-4xl` sem `sm:`/`md:`)
5. **Modais sem ajuste mobile** — 10+ views (`max-w-4xl`, `p-8 md:p-10` sem padding pequeno em mobile)

---

## 4. Inventário Completo de Views (20 views)

### Alta prioridade (críticas)
- [ ] `views/DashboardView.tsx` (135KB) — tabela superuser, `p-10`, headings
- [ ] `views/StudentsView.tsx` (115KB) — tabela `min-w-[600px]`, modal
- [ ] `views/InstructorsView.tsx` (55KB) — tabela, modal `max-w-4xl`
- [ ] `views/FinancesView.tsx` (39KB) — tabela escondida sem card alternativo, `p-12`
- [ ] `views/AttendanceView.tsx` (56KB) — kiosk mode mobile

### Média prioridade
- [ ] `views/SettingsView.tsx` (95KB) — múltiplos modais, `grid-cols-2` sem breakpoint
- [ ] `views/StudentProfileView.tsx` (50KB) — `gap-10` sem redução, flex layout
- [ ] `views/InstructorProfileView.tsx` (36KB) — idem StudentProfileView
- [ ] `views/ReportsView.tsx` (43KB) — `gap-12`, `p-10`, `text-4xl`, charts não responsivos
- [ ] `views/InventoryView.tsx` (39KB) — modal `max-w-2xl`, `text-3xl/4xl`, `p-10`

### Baixa prioridade
- [ ] `views/PaymentView.tsx` (14KB) — `text-3xl` sem breakpoint
- [ ] `views/LoginView.tsx` (77KB) — `text-4xl`, `max-w-5xl`
- [ ] `views/UsersView.tsx` (34KB) — verificar tabela
- [ ] `views/TemplateView.tsx` (36KB) — verificar formulários
- [ ] `views/StaffView.tsx` (20KB)
- [ ] `views/ChatView.tsx` (10KB)
- [ ] `views/CalendarView.tsx` (13KB)
- [ ] `views/SchedulesView.tsx` (8KB)
- [ ] `views/RecycleBinView.tsx` (13KB)
- [ ] `views/SystemConfigView.tsx`

### Componentes compartilhados
- [ ] `src/components/ui/Modal.tsx` — padding inconsistente
- [ ] `src/components/ui/Table.tsx` — `overflow-x-auto` OK, mas sem alternativa card

### Layout (já OK, não mexer)
- `src/components/layout/AppLayout.tsx` ✓
- `src/components/layout/Sidebar.tsx` ✓ (`hidden md:flex`)
- `src/components/layout/MobileHeader.tsx` ✓
- `src/components/layout/MobileMenu.tsx` ✓
- `src/components/layout/MobileDock.tsx` ✓

---

## 5. Plano em 4 Fases

### Fase 0 — Padrões reutilizáveis (1-2h, base para tudo) ✅ CONCLUÍDA

**Objetivo:** evitar repetição em todas as views, criar a "régua" de responsividade.

> **Descoberta durante execução:** `Modal.tsx` é usado apenas pelo `ConfirmDialog.tsx`, e `Table.tsx` não é importado em nenhuma view. Os modais e tabelas das views são todos inline. Por isso o ROI real da Fase 0 está na **documentação** (REGRAS.md seção 10), que orienta as Fases 1-4. Os componentes base foram ajustados mesmo assim, para uso futuro / refatorações graduais.

- [x] **`src/components/ui/Modal.tsx`** — padronizado:
   - Header/Body/Footer com `px-4 py-3 sm:px-6 sm:py-4` (mobile compacto, desktop intacto)
   - Largura: `max-w-[95vw] sm:max-w-*` (mobile usa 95% da tela)
   - Footer empilha em mobile (`flex-col-reverse sm:flex-row`)
   - `max-h-[90vh]` + `overflow-y-auto` no body (já existia)

- [x] **`src/components/ui/Table.tsx`** — prop nova:
   - `mobileCardRender?: (row, idx) => ReactNode`
   - Quando definida: cards `sm:hidden` + tabela `hidden sm:block` (loading/empty/click funcionam em ambos)
   - `overflow-x-auto` no wrapper já existia

- [x] **`REGRAS.md` seção 10 "Responsividade Mobile"** — receitas oficiais:
   - Padding: `p-4 md:p-8` (nunca `p-8` puro)
   - Gap: `gap-4 md:gap-8` (nunca `gap-8/10/12` puro)
   - Heading: `text-xl sm:text-2xl md:text-3xl`
   - Form grid: `grid-cols-1 sm:grid-cols-2`
   - Modal: `max-w-[95vw] sm:max-w-4xl`
   - Tabela: `hidden md:block` + cards `md:hidden`
   - Estratégia: **nunca alterar desktop**, usar prefixos `sm:`/`md:`

**Entregável:** ✅ commit + deploy QAS pendente (aguardar solicitação).

---

### Fase 1 — Tabelas (4-6h, maior impacto funcional) ✅ CONCLUÍDA

**Objetivo:** transformar todas as tabelas em **dupla renderização** (tabela desktop + cards mobile).

> **Descoberta durante execução:** 4 das 5 views já tinham cards mobile completos (`md:hidden`) com tabela desktop (`hidden md:block`). O relatório inicial superestimou o problema. **Apenas UsersView estava realmente quebrada** — sem versão mobile.

Status real por view:
- [x] `views/DashboardView.tsx` — **já OK** (cards mobile linha 1351, tabela desktop linha 1398). `min-w-[680px]` da tabela está dentro de `hidden md:block`, sem vazamento mobile.
- [x] `views/StudentsView.tsx` — **já OK** (cards mobile robustos linha 704, tabela desktop linha 853). `min-w-[600px]` dentro de `hidden md:block`.
- [x] `views/InstructorsView.tsx` — **já OK** (cards mobile linha 353, tabela desktop linha 419).
- [x] `views/FinancesView.tsx` — **já OK** (cards mobile linha 432, tabela desktop linha 461).
- [x] `views/UsersView.tsx` — **CORRIGIDA**: criados cards mobile com mesma funcionalidade da tabela (avatar, nome, role, status, entity, menu de ações com Editar/Reset/Bloquear). Tabela desktop preservada intacta.

**Entregável:** ✅ commit + deploy QAS pendente (aguardar solicitação).

---

### Fase 2 — Kiosk Mode AttendanceView (1-2h) ✅ CONCLUÍDA

**Objetivo:** consertar feature principal (check-in) em mobile.

- [x] **Painel da câmera (linha 959):** `min-h-[50vh]` + `flex-[3]` → `h-[55vh] flex-none` em mobile (altura fixa, evita disputar espaço com histórico). Desktop mantém `md:flex-[3]`.
- [x] **Painel histórico (linha 1056):** `max-h-[50vh]` removido em mobile → `flex-1 min-h-0` (ocupa todo o resto da tela, scroll funciona corretamente). Desktop intacto.
- [x] **Botão X (linha 953):** reduzido em mobile (`top-3 right-3 p-2.5` + ícone 20px) para não invadir o painel "aguardando".
- [x] **Painel flutuante "aguardando" (linha 960):** passa a ocupar largura total em mobile (`left-4 right-4`) em vez de `min-w-[240px]` à esquerda; padding compacto.
- [x] **Contador "Presentes" (linha 992):** vira pílula horizontal em mobile (`flex items-center gap-2`) em vez de bloco vertical grande.
- [x] **Card de welcome (linha 1011):** todos os tamanhos reduzidos em mobile — foto 24x24 (vs 56x56), ícones 48px (vs 100px), nome `text-xl` (vs `text-5xl`), "OSS!" `text-3xl` (vs `text-6xl`), padding `p-4` (vs `p-10`). Adicionado `overflow-y-auto` como fallback.

**Princípio aplicado:** classes base = mobile, prefixos `md:` = desktop intacto. Zero alteração visual em desktop.

**Entregável:** ✅ commit + deploy QAS pendente (aguardar solicitação).

---

### Fase 3 — Modais e Formulários (3-4h) ✅ CONCLUÍDA

**Objetivo:** aplicar padrões da Fase 0 nos modais principais.

> **Descoberta:** nenhum `grid grid-cols-2` sem breakpoint encontrado nos 4 arquivos — formulários já estavam OK nesse aspecto. O problema real era padding `p-8`/`p-10` fixo em mobile.

- [x] `views/StudentsView.tsx` — modal ficha (linha 1081): `p-6 md:p-8` → `p-4 md:p-8`
- [x] `views/InstructorsView.tsx` — modal ficha (linha 515): `p-6 md:p-8` → `p-4 md:p-8`
- [x] `views/InventoryView.tsx` — 3 modais:
   - Compra (linha 401): `p-8` → `p-4 md:p-8`, raio + título reduzidos em mobile
   - Edição produto (linha 527): `p-8 md:p-10` → `p-4 md:p-10`, raio + título reduzidos
   - Exclusão (linha 680): `p-8` → `p-5 md:p-8`
- [x] `views/SettingsView.tsx` — **10 modais ajustados**:
   - Planos da Academia (684): `p-8` → `p-4 md:p-8`
   - Usuários Adicionais (865): `p-8` → `p-4 md:p-8`
   - Planos de Assinatura (1476): `p-8 md:p-10` → `p-4 md:p-10`
   - 3 modais `max-w-sm p-8` (notificações, novo plano, pagamento): → `p-5 md:p-8`
   - 2 modais `max-w-md p-8` (editar academia, perfil): → `p-4 md:p-8`
   - Checkout (1578): `max-w-sm p-10` → `p-6 md:p-10`
   - 4 overlays `p-6` → `p-4 sm:p-6` (mais respiro em telas pequenas)

**Total: 16 modais corrigidos em 4 views.** Desktop preservado intacto via prefixos `md:`/`sm:`.

**Entregável:** ✅ commit + deploy QAS pendente (aguardar solicitação).

---

### Fase 4 — Polish (2h, ROI baixo mas notável) ✅ CONCLUÍDA

**Objetivo:** ajustes finos via search & replace em todo o projeto.

- [x] **Padding `p-10`/`p-12` sem breakpoint** — 7 ocorrências corrigidas:
   - FinancesView:456 (`p-12` → `p-6 md:p-12`)
   - DashboardView:1972 & 2099 (`p-10` → `p-5 md:p-10` + raio responsivo)
   - SchedulesView:140 (`p-12` → `p-6 md:p-12`)
   - ReportsView:639 (`p-10` → `p-6 md:p-10`)
   - ReportsView:835 & 836 (`p-10` → `p-6 md:p-10`)
- [x] **Gaps `gap-10`/`gap-12` sem breakpoint** — 5 ocorrências corrigidas:
   - StudentProfileView:368 & 696 (flex/grid `gap-10` → `gap-6 md:gap-10`)
   - InstructorProfileView:287 & 477 (idem)
   - ReportsView:839 (`gap-12` → `gap-6 md:gap-12`)
- [x] **Headings `text-3xl`/`text-4xl` sem breakpoint** — 8 h1 principais corrigidos:
   - StudentsView:97 & 583 (`text-3xl` → `text-2xl md:text-3xl`)
   - FinancesView:45, ReportsView:46, PaymentView:89, DashboardView:687 & 995 (idem)
   - InventoryView:259 (`text-3xl`), 176 (`text-4xl` → `text-2xl md:text-4xl`)
   - ReportsView:379, LoginView:625 (`text-4xl` → `text-2xl md:text-4xl`)
- [x] **`text-3xl`/`text-4xl` em valores numéricos preservados** — preços, contadores, avatares, "OSS!" do kiosk continuam grandes intencionalmente (sinalização visual).
- [x] **Charts Recharts** — usados em `ReportsView` em containers `<ResponsiveContainer>` (já responsivos por padrão).

**Total: 20 ajustes em 8 views.** Desktop preservado intacto.

**Entregável:** ✅ commit + deploy QAS pendente (aguardar solicitação).

---

## 6. Estimativa Total

| Fase | Tempo estimado | Impacto |
|---|---|---|
| Fase 0 — Padrões base | 1-2h | Reduz trabalho nas outras fases |
| Fase 1 — Tabelas | 4-6h | ALTO (5 views críticas) |
| Fase 2 — Kiosk mode | 1-2h | ALTO (feature principal) |
| Fase 3 — Modais | 3-4h | MÉDIO (UX em CRUD) |
| Fase 4 — Polish | 2h | BAIXO (visual) |
| **Total** | **12-16h** | — |

Cada fase = 1 commit/deploy independente.

---

## 7. Regras a Seguir (de `REGRAS.md`)

- Sempre atualizar tag de versão em `src/components/layout/AppLayout.tsx` a cada alteração
- Commits no formato: `#<seq>-<YYYY-MM-DD> <HH:MM>-<descrição>`
- **NÃO** abrir navegador para testar — pedir teste ao usuário
- Deploy via `python deploy_run.py` (paramiko, porta 3003)
- Não instalar bibliotecas de UI novas sem aprovação

---

## 8. Próximo Passo Sugerido

Começar pela **Fase 0** (padrões base) — investimento pequeno que reduz drasticamente o trabalho das fases seguintes.

Alternativa: atacar direto a Fase 2 (AttendanceView kiosk) se for prioridade de negócio, já que é feature crítica quebrada.

---

*Plano gerado em 2026-05-22. Atualizar checkboxes conforme execução para retomar de qualquer ponto.*
