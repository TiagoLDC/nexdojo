# Plano de Implementação — Login de Responsáveis (Conta Multi-Perfil Familiar)

**Data:** 21/07/2026
**Status:** Fase 1 em andamento

---

## Visão Geral

Hoje, um pai/mãe/tio/tia que também é aluno ou colaborador da academia precisa de um login separado para acompanhar cada filho matriculado. O objetivo é permitir que uma única conta gerencie o próprio perfil (se houver) e o(s) perfil(is) dos filhos, cobrindo três casos:

1. **Aluno + filhos alunos** — a pessoa já tem conta (`role='student'`) e passa a poder alternar para o perfil dos filhos.
2. **Colaborador + filhos alunos** — a pessoa já tem conta (`role='instructor'`/`'staff'`) e passa a poder alternar para o perfil dos filhos.
3. **Responsável sem perfil próprio no sistema** (pai, mãe, tio, tia) — precisa de uma conta nova, cujo único propósito é gerenciar o(s) filho(s). Hoje, sem alternativa, essa pessoa provavelmente usa o login do próprio filho — o que só "funciona" (mal) quando há 1 filho só.

---

## Decisões já tomadas

- **Novo role `guardian`** no enum `users.role`. Usa a mesma tabela `users` de sempre (email, senha, status) — nenhuma estrutura de conta diferente. Só se aplica ao caso 3; nos casos 1 e 2 a pessoa mantém o role que já tem.
- **Nova tabela `guardianships`** (relação N:N entre `users` e `students`) para modelar o vínculo familiar — independente de qual role o responsável tem.
- **O aluno (filho) não precisa de conta própria.** O vínculo é feito pela tabela nova; `students.user_id` continua opcional.
- **Os campos de texto `guardian_*` em `students` não são alterados nem exigidos.** Continuam existindo como informação de contato, sem relação obrigatória com a tabela nova — o recurso é aditivo e opt-in por família.
- **Sem migração automática dos dados de responsável já cadastrados.** Quando o admin/responsável quiser uma conta de fato, o fluxo será de convite (reaproveitando o padrão de `invite_token` já usado em `staff`), não uma criação silenciosa em massa.

---

## Fase 1 — Modelo de Dados

- [x] Adicionar `'guardian'` ao enum `users.role` (`api/src/scripts/migrate.ts` + patch idempotente em `api/src/server.ts`)
- [x] Criar tabela `guardianships` (`guardian_user_id`, `student_id`, `relation`, `UNIQUE(guardian_user_id, student_id)`) em `migrate.ts` + patch `CREATE TABLE IF NOT EXISTS` em `server.ts`
- [x] Adicionar `'guardian'` ao type `UserRole` (`src/types/common.ts`)

## Fase 2 — Backend

- [x] `GET /api/auth/profiles` — lista todos os perfis acessíveis pela conta logada (perfil próprio, se houver, + todos os `students` vinculados via `guardianships`)
- [x] Coluna `students.guardian_invite_token` (padrão idêntico ao `invite_token` do `staff`)
- [x] Fluxo de convite para responsável:
  - `POST /api/students/:id/guardian-invite` (admin/superuser) — gera o token e o link
  - `GET /api/auth/guardian-invite/:token` (público) — valida token, retorna nome do aluno/academia
  - `POST /api/auth/register/guardian` (público) — aceita o convite. Se o e-mail já pertence a uma conta existente (caso do aluno/colaborador que também é responsável), autentica com a senha informada e só cria o vínculo; senão, cria conta nova `role='guardian'` (status `Pending`, mesma aprovação manual do admin usada para `staff`)
- [x] Endpoint para vincular um responsável **existente** por e-mail, sem convite: `POST /api/students/:id/guardians` (admin/superuser)
- [x] `GET /api/students/:id/guardians` e `DELETE /api/students/:id/guardians/:guardianUserId` (admin/superuser) — listar/desvincular
- [x] Restrição de acesso para o role `guardian`: só vê/edita os alunos vinculados via `guardianships` (`GET/PUT /api/students`, `GET /api/transactions`) — fechado desde já porque é um role novo, sem uso legado a preservar
- [ ] Mecanismo de "perfil ativo" (Fase 3, junto com o seletor de UI) — trocar entre perfis sem novo login
- [ ] Ajustar `/pay` e `/instructor-profile` no frontend para aceitar um `studentId` selecionável (hoje resolvem o aluno via `email`/`userId` do próprio usuário logado — ver Fase 3)

## Fase 3 — Frontend

- [x] `useProfileStore` (Zustand, persistido) com `profiles` + `activeProfileId`, e helper `getActiveProfile` (self por padrão; primeiro perfil disponível para responsável "puro" sem ficha própria)
- [x] Perfis buscados (`GET /api/auth/profiles`) ao montar o `AppLayout`; resetados no login/logout
- [x] Componente `ProfileSwitcher` (dropdown "Alternar Perfil", inspirado no mockup do usuário) integrado no `Sidebar` (desktop) e `MobileHeader` (mobile). Só aparece quando há de fato mais de um perfil para escolher — sem isso, mostra a identidade normalmente, sem abrir painel
- [x] `RoleGuard` de `/profile` e `/pay` passa a aceitar também `guardian`; `/` redireciona `guardian` direto para `/profile` (responsável "puro" não tem dashboard geral)
- [x] `StudentProfileView` e `PaymentView` resolvem o aluno pelo perfil ativo (`activeProfile.entityId`) quando selecionado; sem seleção, mantêm o fluxo antigo (resolve pelo próprio e-mail/userId) — cobre tanto o responsável "puro" quanto o aluno/colaborador alternando para o filho
- [x] `PaymentView` agora filtra transações no servidor (`studentId`) em vez de buscar 1000 registros e filtrar no cliente (corrige ineficiência pré-existente, aproveitada nesta mudança)
- [x] Tela de aceite de convite (`GuardianInvitePage`, rota `/guardian-invite/:alias/:token`) — se o e-mail já tem conta (aluno/colaborador que também é responsável), autentica e só cria o vínculo; senão, cria conta `guardian` pendente de aprovação
- [x] **Decisão do usuário**: sem self-service de vínculo (o "Vincular Conta" que aparecia no mockup do admin) — permanece exclusivamente admin-mediado (Fase 2). O painel mostra apenas "Nenhum dependente vinculado" + instrução para pedir ao admin
- [x] UI de admin na ficha do aluno (`StudentsView`, seção "Acesso de Responsável ao Sistema"): lista responsáveis vinculados, vincula por e-mail, gera link de convite, remove vínculo

## Fase 4 — Admin / Dados Existentes

- [x] Botão "Gerar Link de Convite" na ficha do aluno (feito na Fase 3, dentro de `GuardianAccessSection`) — gera o link para o admin copiar e enviar por fora (WhatsApp/e-mail)
- [x] Convite pré-preenchido com `guardian_name`/`guardian_email`/`guardian_relation` já cadastrados na ficha (quem aceita só confirma/edita, não digita do zero — `suggestedRelation` só pré-seleciona se bater exatamente com uma das opções do select, já que o cadastro original é texto livre)
- [ ] (Opcional, sob demanda) Script de agrupamento por CPF/email para identificar responsáveis repetidos entre irmãos, antes de disparar convites em lote — não implementado; avaliar só se o volume de convites em massa justificar

---

## Bugs encontrados em teste (QAS) e corrigidos

- **Dashboard (`/`) não respeitava o perfil ativo** — só `/profile` e `/pay` tinham sido conectados ao seletor na Fase 3; a tela inicial do aluno continuava sempre resolvendo "quem sou eu" pelo e-mail da conta logada, ignorando a troca de perfil. Corrigido em `views/DashboardView.tsx`: a saudação, ID digital, mensalidade e faixa agora seguem o dependente selecionado no "Alternar Perfil" quando houver um.
- **Auto-vínculo de responsável consigo mesmo** — nada impedia vincular a própria conta como responsável do próprio cadastro (aconteceu em teste: Theo→Theo e a conta da Maria→Maria). Isso fazia a pessoa aparecer duplicada no painel (como "Sua Conta" e como "Dependente" ao mesmo tempo). Adicionada validação em `POST /api/students/:id/guardians` e `POST /api/auth/register/guardian` rejeitando esse caso; os 2 vínculos incorretos já existentes no banco do QAS foram removidos.

## Riscos / Pontos de Atenção

| Risco | Mitigação |
|---|---|
| Alterar `users.role` (ENUM) em produção sem quebrar sessões existentes | `ALTER TABLE ... MODIFY COLUMN` é aditivo (só acrescenta um valor); nenhum dado existente muda |
| `RoleGuard`/rotas ainda não sabem lidar com `role='guardian'` até a Fase 3 | Fase 1 só cria o modelo de dados; nenhuma conta `guardian` é criada até a Fase 2/3 estarem prontas |
| Confundir "perfil ativo" com "role da conta" no JWT | Perfil ativo deve ser resolvido a cada request a partir de `guardianships`, não gravado permanentemente no token |
| Convite de responsável duplicado para o mesmo aluno | `UNIQUE(guardian_user_id, student_id)` na tabela `guardianships` impede vínculo duplicado |
| **Gap pré-existente descoberto**: hoje, qualquer usuário autenticado da academia (inclusive `student`) pode buscar `GET /api/students/:id` de qualquer outro aluno por ID — não há restrição por role além de `admin`-only em algumas rotas | Fora do escopo desta feature (comportamento já existente, não introduzido por ela). O role novo `guardian` já nasce restrito corretamente; **não foi feita** a mesma restrição retroativa para `student`/`instructor`/`staff` — avaliar separadamente se for uma preocupação |

---

*Plano criado em 21/07/2026.*
