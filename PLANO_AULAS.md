# Plano de Implementação — Reforma de Planos / Turmas / Aulas / Presenças

> Criado em: 22/05/2026
> Contexto: Eliminação do conceito de "Turmas" (mantido comentado para futuro), evolução dos "Planos de Aula" como entidade central com horários/idade/tolerância, e reforma da presença para ser por aluno+data+horário sem abertura/fechamento de chamada.

---

## Princípio norteador

> **Aditivo primeiro, remoção depois.** Não apagar nada de Turmas/Aulas no banco nem no código nesta fase. Só "esconder e desviar o fluxo". Se algo der ruim, basta reverter um commit pequeno. Remoção definitiva só depois que o novo modelo estiver rodando em QAS por alguns dias.

---

## Estado atual mapeado (resumo)

| Domínio | Hoje |
|---|---|
| **`academy_plans`** | Tabela com `id, name, duration_months, classes_per_week, price, category, description`. Gerenciado no modal de Academia (`SettingsView`) via `PUT /api/academies/:id`. Aluno tem FK `students.plan_id`. |
| **`class_templates` (Turmas)** | Tabela própria + `class_template_schedules` + `class_template_assigned_students` (N:M). Gerenciado em `views/SchedulesView.tsx`. |
| **`class_sessions` (Aulas)** | Instâncias de turma em uma data, com status `In Progress`/`Finalized`. É aqui que mora a "abertura/fechamento de chamada". |
| **`attendance_records`** | Tupla `(student_id, class_id?, date)`. `class_id` já é opcional. |
| **Kiosk de presença** | `views/AttendanceView.tsx` — hoje exige escolher uma `ClassSession` para marcar. |
| **Permissões** | RBAC já implementado (`requireRole`). Instrutor vê preço hoje — precisa restringir. |

---

## Decisões fechadas (Fase 0)

| # | Decisão |
|---|---|
| D1 | ✅ Múltiplos horários por dia da semana → tabela `academy_plan_schedules` 1:N |
| D2 | ✅ Idade: `min_age` e `max_age` ambos opcionais (NULL = sem limite) |
| D3 | ✅ Tolerância **configurável por plano**, em dois campos: `tolerance_before_minutes` (antes de começar) e `tolerance_after_start_minutes` (depois de começar). **Sem tolerância depois do fim** — presença é para iniciar a aula. Defaults: 15/15. |
| D4 | ✅ Aluno sem plano: bloqueio rígido (mensagem clara) |
| D5 | ✅ Aluno inativo/dropped/pending: bloqueia presença (só `status='Active'` marca) |
| D6 | ✅ "Selecionar instrutor" no plano é informativo, não bloqueia presença |
| D7 | ✅ `classes_per_week` permanece **manual** no formulário (não derivado) |
| D8 | ✅ Aluno só marca nos horários do plano (não em qualquer dia/horário) |
| D9 | ✅ QAS pode recriar schema via `migrate.ts` |

---

## Fase 1 — Schema do banco (`api/src/scripts/migrate.ts`) ✅ CONCLUÍDA (22/05/2026)

**O que foi feito:**
- `academy_plans` ampliada com `min_age, max_age, instructor_id, active, tolerance_before_minutes, tolerance_after_start_minutes` ([api/src/scripts/migrate.ts:58-76](api/src/scripts/migrate.ts#L58-L76))
- Nova tabela `academy_plan_schedules` criada (1:N, índice em `(plan_id, day_of_week)`) ([api/src/scripts/migrate.ts:78-86](api/src/scripts/migrate.ts#L78-L86))
- `attendance_records` ampliada com `check_in_time, matched_plan_id, matched_schedule_id` + FKs e índice `(student_id, date)` ([api/src/scripts/migrate.ts:279-297](api/src/scripts/migrate.ts#L279-L297))
- DROP de `academy_plan_schedules` adicionado no topo do DDL
- Tipos TS: novo `PlanSchedule` + `AcademyPlan` ampliado + `AttendanceRecord` com novos campos auditáveis ([src/types/entities.ts:212-238](src/types/entities.ts#L212-L238))
- `tsc --noEmit` passou limpo no frontend (`tsconfig.json`) e no backend (`api/tsconfig.json`)
- Tag de versão atualizada: `VERSÃO QAS 22/05/2026 14:35:32`

**Decisão técnica:** `academy_plans.instructor_id` ficou sem constraint de FK no DDL inline (a tabela `instructors` é criada depois neste DDL sequencial). A integridade é garantida na camada de aplicação. Comentário documentando isto está no schema.

**Compatibilidade preservada:** `mapPlans` em `api/src/routes/academies.ts` continua mapeando só os 7 campos legados — o modal antigo de Academia segue funcionando inalterado. Os novos campos só serão escritos quando a Fase 2/3 chegar.

---

### Detalhes do que foi alterado

### 1.1 Ampliação de `academy_plans`

Adicionar colunas ao CREATE:

```sql
ALTER TABLE academy_plans
  ADD COLUMN min_age INT NULL,
  ADD COLUMN max_age INT NULL,
  ADD COLUMN instructor_id VARCHAR(36) NULL,
  ADD COLUMN active TINYINT(1) DEFAULT 1,
  ADD COLUMN tolerance_before_minutes INT DEFAULT 15,
  ADD COLUMN tolerance_after_start_minutes INT DEFAULT 15,
  ADD CONSTRAINT fk_academy_plans_instructor
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE SET NULL;
```

> Reaproveitamos `price` como mensalidade (já é semanticamente isso). `classes_per_week` continua manual.

### 1.2 Nova tabela `academy_plan_schedules`

```sql
CREATE TABLE academy_plan_schedules (
  id VARCHAR(36) PRIMARY KEY,
  plan_id VARCHAR(36) NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '0=Dom,1=Seg,...,6=Sab',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES academy_plans(id) ON DELETE CASCADE,
  INDEX idx_plan_day (plan_id, day_of_week)
);
```

### 1.3 Ampliação de `attendance_records`

```sql
ALTER TABLE attendance_records
  ADD COLUMN check_in_time TIME NULL,
  ADD COLUMN matched_plan_id VARCHAR(36) NULL,
  ADD COLUMN matched_schedule_id VARCHAR(36) NULL;
```

Auditoria: registra qual plano e qual horário permitiram a presença. `class_id` permanece NULL daqui em diante.

### 1.4 Tipos TypeScript (`src/types/entities.ts`)

```typescript
export interface PlanSchedule {
  id?: string;
  dayOfWeek: number;     // 0..6
  startTime: string;     // 'HH:MM'
  endTime: string;
}

export interface AcademyPlan {
  id: string;
  academyId?: string;
  name: string;
  durationMonths: number;
  classesPerWeek?: number;       // manual
  price: number;                 // mensalidade
  category?: string;
  description?: string;
  minAge?: number;
  maxAge?: number;
  instructorId?: string;
  active?: boolean;
  toleranceBeforeMinutes?: number;
  toleranceAfterStartMinutes?: number;
  schedules?: PlanSchedule[];
}
```

Todos os novos campos opcionais → não quebra consumidores existentes.

---

## Fase 2 — API: rotas dedicadas de Planos ✅ CONCLUÍDA (22/05/2026)

**O que foi feito:**
- Novo arquivo [api/src/routes/plans.ts](api/src/routes/plans.ts) com GET (lista), GET/:id, POST, PUT/:id, DELETE/:id
- `price` **omitido do payload** quando `req.user.role === 'instructor'` (mascaramento no `mapPlan`)
- `schedules` (1:N) anexados via `attachSchedules`; criação/atualização em transação (`withTransaction`)
- Validação de horários: dia 0–6, início < fim, campos obrigatórios
- DELETE inteligente: soft delete (`active=0`) se houver alunos vinculados; hard delete (CASCADE nos schedules) se não houver
- Rota registrada em [api/src/routes/index.ts](api/src/routes/index.ts) como `/api/plans`
- Service frontend [src/features/plans/services/plansService.ts](src/features/plans/services/plansService.ts) espelhando o padrão de `templateService`
- `tsc --noEmit` limpo no backend e frontend
- Tag de versão: `VERSÃO QAS 22/05/2026 15:07:44`

**Nota sobre conversão de chaves:** o interceptor em `src/lib/api.ts` converte camelCase→snake_case no request e snake_case→camelCase no response, recursivamente (inclui o array `schedules`). O backend lê ambas as formas defensivamente (`s.dayOfWeek ?? s.day_of_week`). `mapPlan` já devolve camelCase (idempotente na conversão de resposta).

**`PUT /api/academies/:id` permanece intacto** — coexistência garantida durante a transição.

---

### Especificação original da Fase 2

### 2.1 Novo arquivo `api/src/routes/plans.ts`

| Endpoint | Permissão | Comportamento |
|---|---|---|
| `GET /api/plans` | qualquer auth | Lista planos da academia + schedules (JOIN). **Mascarar `price` se `role === 'instructor'`** (omitir do payload). |
| `GET /api/plans/:id` | qualquer auth | Idem para um plano. |
| `POST /api/plans` | `admin`, `superuser` | Cria plano + schedules em transação. |
| `PUT /api/plans/:id` | `admin`, `superuser` | Atualiza plano + substitui schedules em transação. |
| `DELETE /api/plans/:id` | `admin`, `superuser` | Soft delete: `active = 0`. (Se nenhum aluno usa, hard delete.) |

Registrar em `api/src/routes/index.ts`.

### 2.2 Service frontend

Criar `src/features/plans/services/plansService.ts` espelhando padrão dos outros services.

### 2.3 Manter `PUT /api/academies/:id` funcionando

- Manter o endpoint atual funcionando para retrocompatibilidade
- Aceitar (opcionalmente) os novos campos quando vierem no payload
- Permitir (opcionalmente) substituir schedules quando vierem

---

## Fase 3 — Frontend: nova UI de Planos

### 3.1 Decisão: substituir aba "Planos" dentro de `SettingsView.tsx`

Menos pontos de mudança no menu/rotas; plano é "configuração da academia" semanticamente.

### 3.2 Modal de plano (campos)

- Nome
- Mensalidade (price)
- Duração (meses)
- Aulas por semana (manual)
- Categoria (opcional)
- **Idade mínima / máxima** (dois inputs opcionais)
- **Instrutor responsável** (select, opcional)
- **Tolerância antes do início (min)** — default 15
- **Tolerância após o início (min)** — default 15
- **Horários**: lista dinâmica `(dia da semana, hora início, hora fim)` com botão "Adicionar horário"
- Switch "Ativo"

Aplicar regra das 3 camadas (tipo + payload + form sincronizados). Aplicar receitas mobile (REGRAS seção 10).

### 3.3 Ficha do aluno — seleção de plano

`views/StudentsView.tsx`:
- Campo `planId` (já existe)
- **Somente admin/superuser** vê e pode editar este campo
- Mostrar resumo do plano selecionado (nome, dias, horários)
- Validação backend em `PUT /api/students/:id`: rejeita alteração de `plan_id` se requester não é admin

### 3.4 Esconder a tela de Turmas (não remover)

- `src/components/layout/navConfig.ts`: comentar item "Turmas/Schedules"
- `src/App.tsx`: comentar a rota `/schedules`
- `views/SchedulesView.tsx`: deixar arquivo intacto + comentário no topo: `// DESATIVADO em #XXX — substituído por Planos de Aula.`
- **NÃO** remover tabelas `class_templates*` do banco
- Manter endpoints `/api/sessions` e `/api/templates` por enquanto

---

## Fase 4 — Reforma do kiosk de presença

### 4.1 Novo modelo

- Sem "aula aberta". O backend recebe `student_id` + `date` (server) + `check_in_time` (server).
- O backend faz o match com o plano do aluno e grava em `attendance_records` com `class_id = NULL`.

### 4.2 `POST /api/attendance` — validações (em ordem)

1. Aluno existe, é da academia, `status='Active'`. Senão → 400 "Aluno inativo".
2. Aluno tem `plan_id` setado. Senão → 400 "Aluno sem plano de aula".
3. Plano está `active=1`. Senão → 400 "Plano inativo".
4. Calcular idade do aluno por `birth_date`. Se `min_age`/`max_age` definidos e idade fora → 400 "Idade fora do plano".
5. Buscar `academy_plan_schedules` do plano onde `day_of_week = hoje`. Existe `schedule` tal que:
   ```
   (start_time − plan.tolerance_before_minutes)
   ≤ check_in_time ≤
   (start_time + plan.tolerance_after_start_minutes)
   ```
   Senão → 400 "Fora do horário do seu plano".
6. **Idempotência**: já existe `attendance_records` deste aluno hoje? Default: bloquear → 400 "Presença já registrada hoje".
7. OK: insere com `matched_plan_id`, `matched_schedule_id`, `check_in_time`. Atualiza `students.total_classes` e `total_hours` (com `endTime − startTime` do horário batido).

Cada erro retorna mensagem específica e clara para a UI.

### 4.3 Refatorar `views/AttendanceView.tsx`

Em estágios pequenos:
1. Remover o fluxo "selecionar turma → selecionar aula" (manter services de sessions, só não usar).
2. **Tela nova:**
   - Cabeçalho com data de hoje
   - Lista de presentes hoje (`GET /api/attendance?dateFrom=hoje&dateTo=hoje`)
   - Botão grande "Marcar presença" → busca aluno por nome OU scanner QR
   - Em 400, mostrar erro humano (mensagem do backend)
3. Manter modo kiosk fullscreen e scanner QR (`Html5Qrcode`).
4. Histórico (`showFullHistory`) continua — readequar query sem filtro de classe.
5. Listar alunos disponíveis filtrando por `status='Active'` e com `plan_id` (apenas dica UX; validação real no backend).

### 4.4 Permissões na UI

- Admin/superuser: vê tudo dos planos
- Instructor: **não vê `price`** (mascarado pela API e oculto na UI)
- Student: como antes nesta fase

---

## Fase 5 — Testes & Verificação

> Sem abrir navegador (REGRAS seção 9). Backend smoke + frontend manual pelo usuário.

- Criar plano com 3 horários
- Listar planos como admin e como instructor (verificar mascaramento de price)
- Criar presença válida
- Criar presença inválida (4 motivos: sem plano, fora do horário, idade, inativo)
- Verificar idempotência (mesmo aluno 2x no mesmo dia)
- Tag de versão atualizada em `AppLayout.tsx` a cada commit

---

## Ordem de commits (cada um pequeno, testável, reversível)

| # | Commit | Risco |
|---|---|---|
| 1 | Schema: novas colunas em `academy_plans`, nova tabela `academy_plan_schedules`, colunas em `attendance_records` | Baixo (aditivo) |
| 2 | API: rotas `/api/plans` (GET/POST/PUT/DELETE) + service frontend; price mascarado para instructor | Baixo (novo endpoint) |
| 3 | Frontend: novo modal de Planos em `SettingsView`; mantém o antigo desativado | Médio (UI) |
| 4 | Backend: `POST /api/attendance` com novas validações (compat preservada) | Médio (lógica nova) |
| 5 | Frontend: refatorar `AttendanceView.tsx` para o novo fluxo (sem `currentClass`) | **Alto** (UX) |
| 6 | Esconder Turmas: remover do menu + rota; arquivos preservados | Baixo |
| 7 | Permissões: `plan_id` em student bloqueado para não-admin (back+front) | Baixo |
| 8 | Cleanup: comentários, documentar, validar tag de versão | Baixo |

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| `AttendanceView.tsx` é grande, tem QR e kiosk fullscreen | Refatoração em commit isolado (#5). Manter UI mobile/kiosk. |
| Algum dashboard/relatório consome `class_sessions` | Grep `class_sessions\|currentClass\|ClassSession` em `views/` antes do commit #5 |
| Aluno marca presença antes do horário | Janela configurável por plano (tolerance_before/after_start) |
| Plano sem horários cadastrados | Form e API rejeitam criação sem schedules |
| Migração: já tem alunos com `plan_id` no QAS | Campos novos são opcionais; planos antigos ficam sem horários até alguém editar |
| Instructor ainda vê preço em listagens cacheadas | Limpar cache localStorage; mascarar em todos os GETs |

---

*Documento vivo — atualizar à medida que cada fase for concluída, marcando ✅ na seção respectiva.*
