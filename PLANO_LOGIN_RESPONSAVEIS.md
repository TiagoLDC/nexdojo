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

- [ ] Seletor de perfil (dropdown no sidebar), reaproveitando o padrão já usado hoje para troca de academia (superuser)
- [ ] `RoleGuard`/`App.tsx` passam a decidir permissões pelo perfil ativo selecionado, não pelo `role` fixo da conta
- [ ] Tela de aceite de convite (responsável define senha e assume a conta)

## Fase 4 — Admin / Dados Existentes

- [ ] Botão "Convidar responsável" na ficha do aluno, pré-preenchendo o convite com os dados de `guardian_name`/`guardian_email` já cadastrados como sugestão
- [ ] (Opcional, sob demanda) Script de agrupamento por CPF/email para identificar responsáveis repetidos entre irmãos, antes de disparar convites em lote

---

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
