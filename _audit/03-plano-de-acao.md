# Fase 3 — Plano de Ação NexDojo
> Gerado em: 08/05/2026 | **⏸️ AGUARDANDO APROVAÇÃO antes de executar**

---

## Legenda de Esforço
- **P** = Pequeno (< 30 min)
- **M** = Médio (1–3h)
- **G** = Grande (> 3h)

---

## 1. CORREÇÕES CRÍTICAS — Segurança e Integridade de Dados

> Fazer primeiro, sem exceção. Alguns itens afetam dados reais em produção.

| # | Ref | Problema | Esforço | Observação |
|---|---|---|---|---|
| C-01 | SEG-02 | Remover credenciais do docker-compose.yml e mover para `.env.production` não versionado | **P** | Rotacionar senha do banco após correção |
| C-02 | SEG-03 | Adicionar verificação de ownership nas rotas `PUT /academies/:id`, `GET /academies/:id/users` e `PUT /academies/:id/users/:userId/status` | **P** | 3 linhas de guard em cada rota |
| C-03 | SEG-01 | Remover JWT_SECRET hardcoded como fallback; servidor deve recusar iniciar sem env var; gerar secret forte | **P** | Atualizar docker-compose junto |
| C-04 | SEG-04 | Remover suporte a senhas plaintext do login; executar script de migration para hashear senhas remanescentes | **M** | Verificar se ainda há registros sem bcrypt antes de remover o fallback |
| C-05 | DAD-01 | Envolver bulk attendance em `prisma.$transaction()` | **P** | Uma linha de mudança na lógica, alto impacto |
| C-06 | DAD-02 | Substituir `handleQuickFinalize` (localStorage) por chamada real à API | **M** | Reescrever função para usar `ApiService.saveAttendanceBulk` |
| C-07 | DAD-03 | Criar rota `POST /api/students/:id/graduate` que escreve em `GraduationHistory` + atualiza `Student` em transação; atualizar `handlePromoteStudent` no frontend | **M** | Inclui criar migration Prisma |
| C-08 | DAD-04 | Adicionar campos ausentes ao schema Prisma (`cpf`, `rg`, `guardianRg`, `guardianProfession`, `documents` como Text JSON, `planId`, `nextPaymentDate`, `absenceLimit`); rodar migration; mapear nos routes | **G** | Migration cuidadosa; documentos como JSON no banco por enquanto |
| C-09 | DAD-05 | Adicionar campos da academia ausentes ao schema Prisma (`currentPlan`, `planStatus`, `planExpirationDate`, `paymentWarningDays`, `absenceLimit`, `plans` como JSON Text); rodar migration | **M** | Migrar dados do localStorage para o banco requer script seed |
| C-10 | DAD-07 | No `DELETE /api/students/:id`, excluir também o `User` associado com mesmo email | **P** | Uma query adicional no handler |
| C-11 | UX-01 | Implementar fluxo de reset de senha (rota `POST /api/auth/forgot-password` + tela funcional) **ou** substituir a tela por mensagem "Contate o administrador" | **M** | Sem servidor de email configurado, a opção simples é desativar a tela e orientar o usuário |

**Subtotal Correções Críticas:** 3P + 6M + 1G ≈ **8–12h de trabalho**

---

## 2. MELHORIAS ESTRUTURAIS — Refatoração, Tipagem, Responsabilidade

> Fazem o código mais seguro, previsível e fácil de manter.

| # | Ref | Problema | Esforço | Observação |
|---|---|---|---|---|
| E-01 | SEG-08 | Adicionar validação de input com Zod nas rotas do backend (ao menos nas críticas: auth, students, finances) | **G** | Zod já pode ser instalado; priorizar auth e finances |
| E-02 | COD-03 | Criar tipos DTO compartilhados para request/response das rotas principais; substituir `any` em `ApiService` | **G** | Melhor fazer junto com E-01 |
| E-03 | COD-02 | Mover funções duplicadas para arquivos compartilhados: `compressImage` → `src/utils/image.ts`; `getBeltColor` → `constants.ts`; `PrintHeader` → `components/common/PrintHeader.tsx`; `getEffectiveAbsenceLimit` → `graduation.ts` | **M** | Impacto imediato na manutenibilidade |
| E-04 | COD-06 | Refatorar pattern `const fn = async () => {}; fn()` para handlers async diretos em `StudentsView.tsx` | **P** | Puramente cosmético mas remove confusão |
| E-05 | DAD-08 | Remover persistência de `attendanceIds` em localStorage durante sessão de API no `handleCheckIn`; manter apenas estado React transitório | **P** | Remover 5 linhas em `AttendanceView.tsx:126-132` |
| E-06 | COD-01 | Quebrar `StudentsView.tsx` (1.895 linhas): extrair `StudentEditModal`, `StudentGraduationCenter`, `StudentCard` como componentes separados | **G** | Maior refatoração; fazer por partes |
| E-07 | COD-01 | Quebrar `DashboardView.tsx` (1.889 linhas): extrair `SuperuserDashboard`, `AdminDashboard`, `KpiCards`, `AlertsList` como componentes | **G** | Fazer depois de E-06 |

**Subtotal Melhorias Estruturais:** 2P + 1M + 4G ≈ **12–20h de trabalho**

---

## 3. MELHORIAS DE UX — Feedback, Estados, Fluxos

| # | Ref | Problema | Esforço | Observação |
|---|---|---|---|---|
| U-01 | UX-02 | Adicionar toast de erro em `startClass` e `handleFinishClass` no `AttendanceView` | **P** | 2 linhas em cada catch |
| U-02 | COD-04 | Criar componente `ConfirmModal` reutilizável e substituir todos os `confirm()` / `alert()` nativos (14 ocorrências) | **M** | Componente simples; substituição sistemática |
| U-03 | UX-04 | Adicionar validação inline (campo a campo) nos formulários de aluno e instrutor | **M** | Estado `errors: Record<string, string>` + mensagens inline |
| U-04 | UX-03 | Implementar soft delete no banco e restauração real da lixeira via API | **G** | Depende de C-08 estar feito |
| U-05 | UX-06 | Redirecionar superuser sem academia selecionada para `/` com toast orientador, em vez de exibir tela de bloqueio em cada rota | **P** | Ajuste no `RequireAcademy` ou na lógica de redirect |

**Subtotal Melhorias de UX:** 3P + 2M + 1G ≈ **4–7h de trabalho**

---

## 4. OTIMIZAÇÕES — Performance e Cache

| # | Ref | Problema | Esforço | Observação |
|---|---|---|---|---|
| O-01 | PERF-04 | Paralelizar updates de alunos no bulk attendance com `Promise.all` | **P** | Substitui `for await` por `Promise.all(records.map(...))` |
| O-02 | PERF-05 | Substituir re-fetch completo por atualização local do estado após mutações (criar/editar/deletar) | **M** | Impacto perceptível na percepção de velocidade |
| O-03 | PERF-03 | Corrigir fluxo do header `x-academy-id` para superuser no Dashboard para filtrar no servidor, não no frontend | **P** | Verificar por que o filtro servidor não está sendo usado no Dashboard |
| O-04 | PERF-01 | Adicionar paginação nas rotas de listagem (`students`, `finances`, `attendance`) | **G** | Requer mudanças no frontend (scroll infinito ou paginação por página) |
| O-05 | PERF-02 | Separar fotos/logos em campos omitidos nas listagens; incluí-los apenas no GET by ID | **M** | Usar `select` no Prisma para excluir `photo`/`logo` nas queries de lista |

**Subtotal Otimizações:** 2P + 2M + 1G ≈ **5–8h de trabalho**

---

## 5. DÍVIDA TÉCNICA — Segurança Residual, Documentação, Integrações

| # | Ref | Problema | Esforço | Observação |
|---|---|---|---|---|
| D-01 | SEG-05 | Configurar CORS com origem específica (remover wildcard) | **P** | 1 linha |
| D-02 | SEG-06 | Adicionar rate limiting na rota de login com `express-rate-limit` | **P** | Instalar pacote + 5 linhas |
| D-03 | SEG-07 | Remover `GEMINI_API_KEY` do `vite.config.ts`; preparar rota proxy no backend para quando a integração for ativada | **P** | Remover 2 linhas do vite.config |
| D-04 | SEG-09 | Adicionar verificação de `user.status` no middleware JWT para bloquear usuários suspensos imediatamente | **P** | Uma query no middleware |
| D-05 | COD-05 | Remover `console.log` de produção em `TemplateView.tsx:238`; definir se a feature de notificação será implementada ou removida | **P** | |
| D-06 | DAD-06 | Implementar lógica de `absentCount` no backend (presentes: reset para 0; ausentes: +1) | **M** | Requer lista de "quem deveria estar presente" por template |
| D-07 | DAD-10 | Padronizar geração de IDs — usar UUID do banco para entidades que persistem; remover `Math.random()` nesses contextos | **P** | Limpeza após C-07 e C-08 |
| D-08 | — | Adicionar `.env.example` ao repositório documentando as variáveis necessárias | **P** | Boa prática de onboarding |
| D-09 | — | Definir destino da integração `@google/genai`: implementar ou remover do `package.json` | **P** | Decisão de produto; remover dependência não usada por enquanto |

**Subtotal Dívida Técnica:** 8P + 1M ≈ **2–4h de trabalho**

---

## Ordem de Execução Sugerida

```
Bloco 1 (Segurança imediata — ~2h):
  C-01 → C-02 → C-03 → D-01 → D-02 → D-03 → D-04 → D-05

Bloco 2 (Integridade de dados — ~4h):
  C-05 → C-06 → C-10 → O-01 → E-05

Bloco 3 (Schema e persistência — ~5h):
  C-08 → C-09 → C-07 → D-07

Bloco 4 (Auth e UX crítica — ~2h):
  C-04 → C-11 → U-01 → U-05

Bloco 5 (Estrutural e UX — ~8h):
  E-03 → E-04 → U-02 → U-03 → O-03 → O-05 → D-06 → D-08 → D-09

Bloco 6 (Refatoração maior — ~15h):
  E-01 → E-02 → O-02 → O-04 → E-06 → E-07 → U-04
```

---

## Estimativa Total

| Grupo | Itens | Esforço estimado |
|---|---|---|
| 1. Correções Críticas | 11 | 8–12h |
| 2. Melhorias Estruturais | 7 | 12–20h |
| 3. Melhorias de UX | 5 | 4–7h |
| 4. Otimizações | 5 | 5–8h |
| 5. Dívida Técnica | 9 | 2–4h |
| **Total** | **37** | **~31–51h** |

> Recomendação: executar os Blocos 1 e 2 imediatamente (segurança + integridade de dados). Os blocos 3–6 podem ser planejados em sprints semanais.

---

## ⏸️ CHECKPOINT — Aguardando Aprovação

Este plano está pronto. Antes de qualquer alteração no código:

**Por favor, confirme:**
1. Quer executar todos os blocos ou apenas alguns?
2. Há algum item que não deve ser feito agora?
3. Prefere começar pelo Bloco 1 (segurança) ou tem outra prioridade?

Após sua confirmação, a Fase 4 começa — item por item, na ordem aprovada.
