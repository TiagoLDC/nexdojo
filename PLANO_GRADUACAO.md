# Plano de Implementação — Faixas, Graus e Graduação Configuráveis por Academia

> Criado em: 07/08/2026
> Contexto: Hoje o sistema tem UMA sequência de faixas fixa (Jiu-Jitsu/CBJJ, hardcoded em 5 lugares diferentes do código) e UM critério de graduação por academia (só meses OU só aulas, agrupado em 4 "baldes": kids/white/intermediate/black). O objetivo é permitir que cada academia configure, faixa por faixa, uma combinação de meses + aulas ("o que ocorrer primeiro"), e abrir caminho para o sistema suportar outras artes marciais no futuro via um "Cadastro de Esporte" administrado pelo super.

---

## Princípio norteador

> **Aditivo primeiro, remoção depois.** Nada de faixa/graduação existente é apagado nesta fase (colunas antigas `students.belt` ENUM, `academies.graduation_rules` JSON permanecem no banco, sem uso, até o novo modelo rodar em QAS por um tempo). Remoção definitiva fica para uma fase de limpeza separada, só depois de validado.

---

## Estado atual mapeado (resumo da investigação)

| Domínio | Hoje |
|---|---|
| **Faixas** | `Belt` enum fixo em `src/types/common.ts:3-25` (idêntico em `types.ts:4-26`) — 19 faixas, só Jiu-Jitsu (CBJJ). Coluna `students.belt` / `instructors.belt` é `ENUM(...)` no MySQL — trocar a lista exige `ALTER TABLE`. |
| **Graus** | `students.stripes TINYINT`, sem tabela própria. Cap de 4 graus (6 na faixa preta) hardcoded em `services/graduation.ts` (`getNextRank`). Existe um campo `degree` morto (não persistido, não usado exceto um fallback de export CSV) — candidato a remoção. |
| **Critério de graduação** | `Academy.graduationRules` (`src/types/entities.ts:28-40`) — 1 `mode` (`'classes'|'hours'|'months'`) global por academia + 4 baldes (`kids`/`white`/`intermediate`/`black`) com 1 `stripeThreshold` cada, reaproveitado tanto para trocar de grau quanto para trocar de faixa. UI só expõe `'classes'` e `'months'` (`'hours'` existe no tipo mas nunca teve botão). |
| **Central de Graduação** | Modal dentro de `views/StudentsView.tsx:1946-2243`. Elegibilidade calculada por `services/graduation.ts` (`isReadyForGraduation`, `getMetric`, `getNextRank`) — bucket do aluno decidido por faixa + heurística de idade (`<16` = kids). |
| **Duplicação de faixas** | **5 arrays/hardcodes independentes**: `constants.ts` (`BELT_COLORS`, `MIN_AGE_FOR_BELT`), `src/utils/constants.ts`, `services/graduation.ts` (`BELT_LIST`), `src/utils/graduation.ts` (cópia), `views/ReportsView.tsx:208-231` (que inclusive tem um bug: omite Coral/Vermelha do gráfico). |
| **Multi-esporte** | Não existe nenhum conceito de esporte/modalidade no sistema. `academy_plans.category` é texto livre de plano (preço/categoria), não tem relação com faixa. |
| **Dívida técnica adjacente** | `types.ts` (legado, usado pelas `views/*` antigas) e `src/types/entities.ts` (novo, usado por `src/features/*`) duplicam `Belt`/`GraduationRules`/`Student` — qualquer mudança de schema precisa tocar os dois, a menos que sejam consolidados. |

---

## Crítica ao "to-be" original e decisões tomadas

O rascunho do usuário estava certo na estrutura geral (esporte → template de faixas/graus → configuração por academia), mas tinha 4 pontos abertos que definem o desenho do banco. Foram resolvidos assim:

| # | Ponto aberto | Decisão fechada |
|---|---|---|
| D1 | Uma academia pode ensinar mais de um esporte? | **Não, por ora.** 1 esporte por academia (`academies.sport_id`). Cobre 100% do cenário atual; multi-esporte por aluno é uma reforma maior (faixa por matrícula/modalidade) e fica fora de escopo. |
| D2 | Como marcar quais faixas do template são infantis? | **Flag manual no cadastro da faixa** (`category: 'kids'|'adult'|'both'`), decidido pelo super ao montar o template — não depende de heurística de idade calculada em runtime. |
| D3 | Meses e aulas são sempre obrigatórios juntos, por faixa? | **Livre por faixa.** Admin pode preencher só meses, só aulas, ou os dois (aí vale o que ocorrer primeiro — OR). Preserva o comportamento atual de quem usa só 1 critério. |
| D4 | Como migrar as configurações antigas por balde? | **Migração automática**: cada faixa do balde antigo (`kids`/`white`/`intermediate`/`black`) herda o `stripeThreshold` do balde como valor inicial (mapeado para `months_required` ou `classes_required` conforme o `mode` antigo). Admin ajusta depois, faixa a faixa, se quiser granularidade. |
| D5 | O modo `'hours'` (nunca teve UI) deve continuar existindo? | **Descontinuado.** Não migra para o novo modelo; o novo `academy_belt_settings` só conhece `months_required`/`classes_required`. |
| D6 | Quando a academia pode trocar de esporte? | **Nunca, depois de cadastrada.** `sport_id` é definido uma única vez no cadastro da academia (`POST /academies`) e não aparece em nenhum formulário de edição depois disso — nem no configurador de faixas, nem em nenhum outro lugar. Não existe janela de "trocar enquanto não tem aluno"; é campo de escrita única. |

**Outros pontos que o to-be não cobria e que este plano resolve:**
- Consolidação das 5 listas de faixa duplicadas em **uma única fonte** (API), o que também corrige de brinde o bug do gráfico de faixas no `ReportsView.tsx` que omite Coral/Vermelha.
- Limpeza do campo `degree` morto.

---

## Modelo de dados proposto

### `sports` (nova tabela — gerenciada só pelo super)
```sql
CREATE TABLE sports (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `belt_ranks` (template de faixas/graus por esporte — gerenciado só pelo super)
```sql
CREATE TABLE belt_ranks (
  id VARCHAR(36) PRIMARY KEY,
  sport_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,           -- ex: "Azul"
  color_key VARCHAR(50) NOT NULL,       -- chave de estilo (mapeada p/ classes Tailwind no front)
  order_index INT NOT NULL,             -- posição na sequência de graduação
  degree_count TINYINT NOT NULL DEFAULT 4, -- quantos graus essa faixa tem (preta = 6, por ex.)
  category ENUM('kids','adult','both') NOT NULL DEFAULT 'adult',
  min_age INT NULL,
  max_age INT NULL,
  FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
  UNIQUE (sport_id, order_index)
);
```

### `academy_belt_settings` (configuração por academia — substitui `academies.graduation_rules`)
```sql
CREATE TABLE academy_belt_settings (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36) NOT NULL,
  belt_rank_id VARCHAR(36) NOT NULL,
  months_required INT NULL,
  classes_required INT NULL,
  warn_before_months INT NULL,
  warn_before_classes INT NULL,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
  FOREIGN KEY (belt_rank_id) REFERENCES belt_ranks(id) ON DELETE CASCADE,
  UNIQUE (academy_id, belt_rank_id)
);
```
Aplica-se uniformemente a cada "passo" dentro daquela faixa (cada troca de grau e a troca final de faixa), igual ao comportamento atual de reaproveitar 1 valor por balde — só que agora por faixa individual.

### `academies` (alteração)
- `+ sport_id VARCHAR(36) NOT NULL` (FK → `sports.id`). Academias existentes recebem o esporte "Jiu-Jitsu" seedado via backfill (exceção única da migração); academias novas passam a exigir esse campo em `POST /academies` e ele **nunca mais é editável** depois de salvo — campo de escrita única, sem UI de alteração em nenhum lugar do sistema.
- `graduation_rules JSON` — mantido por ora (aditivo primeiro), passa a ser lido só pelo script de migração.

### `students` / `instructors` (alteração)
- `+ belt_rank_id VARCHAR(36) NULL` (FK → `belt_ranks.id`), backfill por nome a partir do `belt` ENUM atual, depois torna-se `NOT NULL`.
- `belt ENUM(...)` — continua sendo o campo primário/autoritativo enquanto o frontend não migrar (Fases 4-8); backend passa a gravar os dois em paralelo (dual-write, ver Fase 3). Só deixa de ser escrito na Fase 9.
- `stripes TINYINT` — sem mudança de coluna; validação do teto passa a usar `belt_ranks.degree_count` em vez de constante fixa (4 / 6).

### `graduation_history` (alteração)
- `+ belt_rank_id VARCHAR(36) NULL`, `+ previous_belt_rank_id VARCHAR(36) NULL` (FKs, nullable).
- `previous_belt` / `new_belt` (texto livre) **permanecem** como snapshot histórico — não dependem de o rank continuar existindo/com o mesmo nome.

---

## Mudanças de API (backend `api/`)

- **`GET/POST/PUT /api/sports`** — CRUD de esportes, restrito a `superuser`.
- **`GET/POST/PUT/DELETE /api/sports/:id/belt-ranks`** — CRUD do template de faixas/graus (nome, cor, ordem, graus, categoria, idade), restrito a `superuser`. `DELETE` bloqueado se a faixa estiver em uso (`academy_belt_settings` ou `students/instructors.belt_rank_id` referenciando).
- **`GET/PUT /api/academies/:id/belt-settings`** — lista as faixas do esporte da academia + configuração atual (`months_required`, `classes_required`, `warn_before_*`); `PUT` aceita array de `{ belt_rank_id, months_required, classes_required, warn_before_months, warn_before_classes }`. Restrito a `admin` da própria academia (+ `superuser`).
- **`POST /api/auth/register/academy`** — ⚠️ correção em relação à primeira versão deste plano: **não existe rota `POST /academies` nem cadastro de academia pelo super**. Toda academia é criada pelo próprio usuário via **auto-cadastro público** (`POST /api/auth/register/academy`, consumido por `views/LoginView.tsx`). É esse o único lugar em todo o sistema que grava `sport_id` — hoje escolhe automaticamente o único esporte ativo (Jiu-Jitsu) se o body não especificar um, e aceita um `sport_id` explícito no body para o dia em que houver mais de um esporte e o formulário de cadastro ganhar um seletor.
- **`PUT /api/academies/:id`** — `sport_id` **não entra** no whitelist `ALLOWED`; é imutável após a criação, sem exceção (nenhuma rota de edição aceita esse campo).
- **`students.ts` / `instructors.ts`**: ⚠️ **revisão de escopo feita durante a implementação (Fase 3)** — em vez de *substituir* a validação de `belt` (enum) por `belt_rank_id` de uma vez, adotado **dual-write**: toda rota que grava `belt`/`stripes` (`POST/PUT /students`, `POST/PUT /instructors`, `POST /students/:id/graduate`) passou a resolver e gravar `belt_rank_id` **em paralelo**, sem parar de gravar/validar `belt`. Motivo: o frontend atual (Fases 4-8, ainda não feitas) só lê/exibe `belt` — se o backend parasse de tratá-lo como campo primário agora, faixas e promoções sairiam do ar no QAS antes de o frontend saber ler `belt_rank_id`. `GET ?belt=` continua funcionando; um novo `GET ?beltRankId=` foi adicionado como opção adicional (aditivo, para o frontend usar quando migrar). A remoção definitiva de `belt` como campo primário só acontece na Fase 9, depois das Fases 4-8 migrarem o frontend.
- **Elegibilidade de graduação** (usada pela Central de Graduação): nova função que, para o `belt_rank_id` atual do aluno, busca a linha em `academy_belt_settings` e aplica OR: elegível se (`classes_required` preenchido E `classesSinceGraduation >= classes_required`) OU (`months_required` preenchido E `monthsSince(lastGraduationDate) >= months_required`). "Prestes a graduar" usa os `warn_before_*` da mesma linha, mesma lógica OR com a métrica mais próxima do limite.

---

## Mudanças de Frontend

- **Fonte única de faixas**: novo hook `useSportBeltRanks(academyId)` (ou serviço equivalente) que busca do backend e substitui os 5 arrays hardcoded hoje espalhados em `constants.ts`, `src/utils/constants.ts`, `services/graduation.ts`, `src/utils/graduation.ts`, `views/ReportsView.tsx`.
- **`BeltBadge`**: refatorar para receber um objeto `beltRank` (nome + `color_key`) em vez de fazer `switch` no enum `Belt`.
- **Nova tela "Esportes"** (só super) — CRUD de esporte + editor do template de faixas/graus (lista ordenável, cada linha: nome, cor, nº de graus, categoria, idade min/max).
- **`SettingsView.tsx`**: a seção atual "Critérios de Graduação" (baldes) é substituída por **"Faixas e Graduação"** — tabela com uma linha por faixa do esporte da academia (nome + badge), campos editáveis de meses/aulas necessários (+ aviso antecipado), na ordem do template.
- **Central de Graduação (`StudentsView.tsx`)**: elegibilidade e fila de promoção passam a usar a nova função combinada (meses OU aulas) por faixa individual, exibindo progresso das duas métricas quando ambas configuradas (ex: `18/20 aulas · 4/6 meses`).
- **Demais pontos de exibição de faixa** a atualizar para a fonte dinâmica: filtro/seletor de faixa e modal de edição em `StudentsView.tsx`, gráfico de distribuição em `ReportsView.tsx`, `DashboardView.tsx`, `InstructorProfileView.tsx`, `InstructorsView.tsx`, `AttendanceView.tsx`, `StudentProfileView.tsx`, `KimonoLoanView.tsx`, `TemplateView.tsx`, `LoginView.tsx`.

---

## Estratégia de migração de dados (script one-off, idempotente)

1. Seed de `sports`: 1 linha "Jiu-Jitsu" (`slug: jiu-jitsu`).
2. Seed de `belt_ranks` para esse esporte a partir da ordem atual do enum `Belt` + `BELT_COLORS` + `MIN_AGE_FOR_BELT` (`constants.ts`): `degree_count = 4` para todas, `6` para Preta; `category` definida revisando a lógica real de bucket em `services/graduation.ts` (confirmar exatamente quais faixas hoje caem no balde "kids" vs "white" antes de fixar o flag — não assumir só pelo nome).
3. `ALTER TABLE academies ADD sport_id`, backfill todas para o Jiu-Jitsu seedado.
4. `ALTER TABLE students/instructors ADD belt_rank_id NULL`, backfill por casamento de nome com a faixa do esporte da academia; só depois tornar `NOT NULL`.
5. Gerar `academy_belt_settings`: para cada academia com `graduation_rules` preenchido, explodir cada balde (`kids`/`white`/`intermediate`/`black`) nas faixas individuais daquela categoria, usando o `mode` antigo para decidir se o valor do balde vai para `months_required` ou `classes_required` (D4). Academias com `mode='hours'` (modo descontinuado, D5) ficam sem configuração automática — logar para ajuste manual.
6. `ALTER TABLE graduation_history ADD belt_rank_id/previous_belt_rank_id NULL`, backfill best-effort por nome (deixar `NULL` onde ambíguo — as colunas de texto continuam valendo como registro histórico).
7. Colunas antigas (`students.belt` ENUM, `academies.graduation_rules` JSON) **não são removidas** nesta fase.

---

## Fases de execução

- [x] **Fase 0 — Decisões** ✅ concluída (D1–D6 acima)
- [x] **Fase 1 — Schema do banco** ✅ concluída (07/08/2026) — código pronto e `migrate_belt_ranks_schema.ts` executado com sucesso no QAS
- [x] **Fase 2 — Backend** ✅ concluída (10/08/2026) — rotas novas de `/sports` e `/academies/:id/belt-settings` + `sport_id` na criação de academia. **Cutover de `students.ts`/`instructors.ts`/`/graduate` de `belt` para `belt_rank_id` foi movido para a Fase 3** (ver nota acima) — sem mudança de comportamento em rotas já existentes nesta fase.
- [x] **Fase 3 — Migração de dados + dual-write nas rotas de aluno/instrutor** ✅ concluída (10/08/2026) — backfill executado no QAS, `students.ts`/`instructors.ts`/`/graduate` passam a escrever `belt_rank_id` em paralelo ao `belt` (ver detalhes abaixo — o cutover final, removendo `belt`, é a Fase 9)
- [x] **Fase 4 — Frontend infra** ✅ concluída (11/08/2026) — duplicação eliminada, novo serviço criado; nenhuma tela ainda consome dados dinâmicos por academia (isso é Fases 5-8)
- [x] **Fase 5 — Frontend** ✅ concluída (11/08/2026) — tela "Esportes" (superuser) criada e roteada
- [x] **Fase 6 — Frontend** ✅ concluída (11/08/2026) — `SettingsView` com a nova seção "Faixas e Graduação" por academia
- [x] **Fase 7 — Frontend** ✅ concluída (11/08/2026) — Central de Graduação (`StudentsView.tsx`) com elegibilidade combinada por faixa + seção "Quase Lá"
- [x] **Fase 8 — Frontend** ✅ concluída (11/08/2026) — `DashboardView`, `ReportsView` e `StudentProfileView` migrados para a elegibilidade por faixa (mesmas funções da Fase 7)
- [ ] **Fase 9 — Limpeza** (só após soak em QAS): remover campo `degree` morto; avaliar remoção de `students.belt` ENUM / `academies.graduation_rules` JSON; oportunidade de consolidar `types.ts` legado com `src/types/entities.ts` para as entidades tocadas
- [ ] **Fase 10 — Testes manuais** (usuário testa na interface, conforme regra do projeto) **e Deploy QAS** — só quando solicitado explicitamente

---

### Detalhes do que foi feito na Fase 1 (07/08/2026)

- **`api/src/scripts/migrate.ts`** (recriação completa do schema, usado em QAS/ambiente do zero): adicionadas as tabelas `sports`, `belt_ranks`, `academy_belt_settings`; coluna `sport_id` em `academies`; coluna `belt_rank_id` em `students`/`instructors`; colunas `belt_rank_id`/`previous_belt_rank_id` em `graduation_history`. Incluído o `INSERT` de seed do template Jiu-Jitsu (19 faixas, usando `SET @sport_jiujitsu = UUID()` + `UUID()` por linha, executado na mesma conexão do restante do DDL).
- **`api/src/scripts/migrate_belt_ranks_schema.ts`** (novo — script incremental, aditivo, idempotente, para rodar em bancos **já existentes** sem apagar dados, seguindo o padrão de `migrate_graduation_counters.ts`): cria as 3 tabelas novas com `CREATE TABLE IF NOT EXISTS`, adiciona as colunas novas via `ALTER TABLE` (nullable, ignorando erro `ER_DUP_FIELDNAME` se já existirem), adiciona as FKs nomeadas (ignorando erro de FK duplicada em reruns) e semeia o template Jiu-Jitsu só se ainda não existir (`slug='jiu-jitsu'`).
- **Categorização das faixas no seed** (definida revisando a lógica real de bucket em `services/graduation.ts`, não só pelo nome): faixas Cinza/Amarela/Laranja/Verde (todas as variações) = `kids`; Azul/Roxa/Marrom/Preta = `adult` (com `min_age` 16/16/18/19, igual ao `MIN_AGE_FOR_BELT` atual); Coral/Vermelha = `adult`, `degree_count = 0` (são faixas honoríficas — hoje `isReadyForGraduation` já retorna sempre `false/false` para elas, então "sem critério configurável" preserva o comportamento atual); **Branca = `both`** (é a mesma faixa inicial compartilhada por kids e adultos hoje — ver nota de risco abaixo).
- **`src/types/entities.ts`**: novos tipos `Sport`, `BeltRank`, `AcademyBeltSetting`, `BeltCategory` (seção "Sports & Belt Ranks"); campo `sportId?: string` adicionado a `Academy`.
- **Verificação**: `npx tsc --noEmit` limpo no backend (`api/`); no frontend, os erros existentes são todos pré-existentes (confirmado via `git stash` + `tsc --noEmit` antes desta mudança) — nenhum erro novo introduzido.
- **Execução confirmada em QAS (07/08/2026)**: `migrate_belt_ranks_schema.ts` rodado contra o banco `qasnexdojo_qas` (162.240.167.149) — único MySQL disponível para este projeto, já que o `api/.env` local aponta direto para o QAS (não há MySQL local separado). Saída: 3 tabelas criadas, 5 colunas novas adicionadas, 5 FKs nomeadas criadas, esporte "Jiu-Jitsu" e as 19 faixas semeadas. Verificado por query direta: `sports` com 1 linha, `belt_ranks` com 19 linhas na ordem/categoria/degree_count esperados (script de verificação temporário, removido após a checagem). Nenhuma tabela/coluna/linha pré-existente foi alterada.

### Detalhes do que foi feito na Fase 2 (10/08/2026)

- **`api/src/routes/sports.ts`** (novo): router inteiro protegido por `requireAuth, requireRole('superuser')`. CRUD de `sports` (`GET/POST/PUT /`) e de `belt_ranks` (`GET/POST/PUT/DELETE /:id/belt-ranks[/:rankId]`), com slug único auto-gerado, validação de `order_index` duplicado dentro do mesmo esporte, e bloqueio de `DELETE` de faixa em uso (`students`, `instructors` ou `academy_belt_settings` referenciando). Registrado em `api/src/routes/index.ts` como `/api/sports`.
- **`api/src/routes/academies.ts`**: novas rotas `GET/PUT /:id/belt-settings` (admin da própria academia ou superuser). `GET` faz `LEFT JOIN belt_ranks` + `academy_belt_settings` pelo `sport_id` da academia, ordenado por `order_index`; se a academia ainda não tem `sport_id` (caso de todas as academias existentes agora, antes do backfill da Fase 3), retorna `{ sport: null, belt_ranks: [] }` em vez de erro. `PUT` recebe `{ settings: [...] }` e faz upsert (`INSERT ... ON DUPLICATE KEY UPDATE`) validando que cada `belt_rank_id` pertence ao esporte da academia.
- **`api/src/routes/auth.ts`** (`POST /register/academy`): agora grava `sport_id` na criação — usa o valor do body se enviado, senão busca automaticamente o único esporte `active=1` mais antigo (hoje só existe Jiu-Jitsu). Único ponto de escrita de `sport_id` em todo o sistema, conforme D6.
- **Correção ao plano original**: a Fase 2 revelou que **não existe rota de criação de academia pelo superuser** — toda academia nasce por auto-cadastro público (`register/academy`, sem `superuser` envolvido). A seção "Mudanças de API" acima foi corrigida para refletir isso.
- **Decisão de sequenciamento**: o cutover de `students.ts`/`instructors.ts`/`/graduate`/filtro `?belt=` de `belt` (ENUM) para `belt_rank_id` foi **adiado para a Fase 3** — ver nota na seção "Mudanças de API" acima. Nenhuma rota existente teve comportamento alterado nesta fase.
- **Verificação**: `npx tsc --noEmit` limpo no backend. Rotas não testadas via HTTP (servidor não foi iniciado nesta sessão, conforme regra do projeto de não subir servidor sem pedido explícito) — validação ficou restrita à revisão de código e checagem de tipos.

### Detalhes do que foi feito na Fase 3 (10/08/2026)

- **`api/src/utils/beltRanks.ts`** (novo): helper `resolveBeltRank(academyId, beltName)` — resolve a linha de `belt_ranks` correspondente a um nome de faixa, dentro do esporte da academia. Retorna `null` (sem bloquear a operação) se a academia ainda não tem `sport_id` ou se o nome não casar com nenhuma faixa do template.
- **`api/src/routes/students.ts`**: `POST /` e `PUT /:id` (incluindo o fluxo que grava `graduation_history` na edição manual de faixa/grau) e `POST /:id/graduate` agora resolvem e gravam `belt_rank_id` toda vez que `belt` é gravado/alterado, sem deixar de gravar `belt`. `GET /` ganhou o filtro adicional `?beltRankId=` (junto do `?belt=` que já existia). Bônus: corrigido bug pré-existente em `/graduate` — a validação de `new_stripes` tinha `max: 4` fixo para **todas** as faixas, inclusive Preta (que já permite 6 graus na lógica do frontend); agora o teto vem de `belt_ranks.degree_count` quando resolvível, com fallback para o comportamento antigo (4, ou 6 para Preta) caso não resolva.
- **`api/src/routes/instructors.ts`**: mesmo padrão de dual-write em `POST /` e `PUT /:id`; `GET /` ganhou `?beltRankId=`.
- **`api/src/scripts/migrate_belt_ranks_backfill.ts`** (novo): script one-off de backfill, executado no QAS. Resultado final: `academies.sport_id` preenchido em 6 academias, `students.belt_rank_id` em 164 alunos, `instructors.belt_rank_id` em 20 instrutores, `graduation_history` (ambas as colunas) em 52 registros, `academy_belt_settings` com 68 linhas geradas a partir do `graduation_rules` de 4 academias. Todas as 3 colunas (`academies.sport_id`, `students.belt_rank_id`, `instructors.belt_rank_id`) confirmadas em 0 linhas `NULL` e travadas como `NOT NULL`.
- **Dois bugs encontrados e corrigidos durante a execução real no QAS** (a primeira tentativa falhou/ficou incompleta por causa deles):
  1. **Nomes de chave errados no parser do `graduation_rules`**: o JSON salvo no banco usa `snake_case` (`stripe_threshold`, `warn_before`) porque o backend só faz `JSON.stringify` do que o interceptor do frontend já converteu de camelCase→snake_case antes de enviar — confirmado inspecionando o JSON real de 4 academias no QAS. O script lia `stripeThreshold`/`warnBefore` (camelCase), então escrevia 0 linhas em `academy_belt_settings` na primeira tentativa. Corrigido para ler as chaves certas; segunda execução gerou as 68 linhas corretamente.
  2. **FK com `ON DELETE SET NULL` impede `NOT NULL` depois**: as FKs de `academies.sport_id`, `students.belt_rank_id` e `instructors.belt_rank_id` foram criadas na Fase 1 com `ON DELETE SET NULL` — o MySQL recusa tornar uma coluna `NOT NULL` se sua FK for `SET NULL` (`ER_FK_COLUMN_NOT_NULL`), e nem sequer aceita um `MODIFY` normal nela depois (`ER_FK_COLUMN_CANNOT_CHANGE`, exige `SET FOREIGN_KEY_CHECKS=0` em volta do `ALTER`). Corrigido em 3 lugares: as 3 FKs já criadas no QAS foram recriadas com `ON DELETE RESTRICT` (via script temporário, removido depois); `migrate_belt_ranks_schema.ts` e `migrate.ts` atualizados para já nascerem com `RESTRICT` em instalações futuras; `migrate_belt_ranks_backfill.ts` envolve os `ALTER ... MODIFY ... NOT NULL` com `SET FOREIGN_KEY_CHECKS=0/1`. `graduation_history.previous_belt_rank_id`/`belt_rank_id` **permanecem** `SET NULL` de propósito — são só snapshot histórico, nunca vão virar `NOT NULL`.
- **Verificação pós-backfill**: `tsc --noEmit` limpo; consulta direta confirmou 0 linhas `NULL` nas 3 colunas, os 68 registros de `academy_belt_settings` da academia "GUERREIROS ICP" batem exatamente com os valores do `graduation_rules` antigo (32 aulas para kids/white/intermediate, 435 para black), e uma amostra de alunos mostra `belt` e o nome da faixa resolvida (`belt_rank_id → belt_ranks.name`) idênticos.
- **Resolução do caso da faixa Branca** (risco levantado na Fase 1): usado o valor do balde `white` como padrão inicial para a faixa Branca (em vez do balde `kids`) — confirmado no resultado real: para "GUERREIROS ICP" a Branca recebeu `classes_required: 32`, igual ao balde `white` daquela academia (que coincidentemente era igual ao `kids` nesse caso específico, mas a regra aplicada foi `white`). Admin pode ajustar depois na tela de configuração (Fase 6).

### Detalhes do que foi feito na Fase 4 (11/08/2026)

Escopo desta fase: eliminar a duplicação real de código (arrays/switch de faixa repetidos) e criar o serviço novo que as Fases 5-8 vão consumir — **sem** ainda religar nenhuma tela existente para buscar dados dinâmicos por academia (isso fica para as próprias Fases 5-8, que também trazem a UI para usar essa configuração).

- **Código morto removido** (zero consumidores, confirmado por busca antes de apagar):
  - `src/utils/graduation.ts` — cópia inteira de `services/graduation.ts`, nunca importada por nenhum arquivo. Apagado; removida também a linha correspondente em `src/utils/index.ts` (barrel export).
  - Exports de faixa em `src/utils/constants.ts` (`BELT_COLORS`, `MIN_AGE_FOR_BELT`, `BELT_ORDER`, `KIDS_BELTS`, `ADULT_BELTS`, `MIXED_KIDS_BELTS`, `MAX_STRIPES`, `KIDS_MAX_AGE`, `ADULT_MIN_AGE`) — só eram usados pelo `src/utils/graduation.ts` já removido. `COLOR_PALETTES`/`FINANCE_CATEGORIES`/`PAYMENT_METHODS`/`STORAGE_KEYS` (não relacionados a faixa) permanecem intactos nesse arquivo.
- **`services/graduation.ts`**: o array `KIDS_MIXED`/`KIDS_MIXED_BELTS` estava duplicado **3 vezes dentro do próprio arquivo** (em `isReadyForGraduation`, `getGraduationThreshold`, `getWarnBefore`) — consolidado em uma única constante exportada `KIDS_MIXED_BELTS`, reaproveitada nas 3 funções.
- **`views/StudentsView.tsx`**: os arrays locais `kidsBelts`/`adultBelts`/`allBeltOptions` (usados no filtro de faixa e no seletor do modal de edição) eram, na prática, idênticos ao `BELT_LIST` já exportado por `services/graduation.ts` — substituídos por um import direto, eliminando a duplicata.
- **`views/ReportsView.tsx`**: corrigido o bug real encontrado na investigação inicial — o array `order` do gráfico de distribuição de faixas não incluía Coral/Vermelha (só ia até Preta), então alunos nessas faixas nunca apareciam no gráfico mesmo o `colorMap` já tendo cor definida para elas. Trocado para usar `BELT_LIST` (import de `services/graduation.ts`), que tem as 19 faixas — corrige o bug e elimina a duplicata na mesma mudança.
- **`components/BeltBadge.tsx`**: o `switch(belt)` privado do componente (bg/border/text/bar/listra central por faixa — a versão mais detalhada entre todas as duplicatas encontradas) foi extraído para `constants.ts` como `BELT_VISUAL_CONFIG`/`DEFAULT_BELT_VISUAL_CONFIG` (valores copiados 1:1, zero mudança visual). `BeltBadge` agora só faz o lookup — API do componente (`belt`, `stripes`, `className`, `showText`) não mudou, nenhum dos 10+ pontos de uso precisou ser tocado.
- **`constants.ts`** (raiz) e **`BELT_COLORS`/`MIN_AGE_FOR_BELT`/`DAYS_MAP`** (usados ativamente por 8 views) **não foram alterados** — continuam sendo, junto com `services/graduation.ts`, as duas fontes estáticas canônicas do sistema. Trocar essas 8 views para buscar a lista de faixas da API (por academia) é trabalho da Fase 8, não desta fase.
- **`src/features/settings/services/beltRankService.ts`** (novo): serviço (padrão idêntico a `academyService.ts` já existente — objeto plano com métodos async, sem introduzir um padrão de "hook" que o projeto não usa) com `getAcademyBeltSettings(academyId)` e `updateAcademyBeltSettings(academyId, settings)`, consumindo as rotas `GET/PUT /academies/:id/belt-settings` da Fase 2. Ainda não é chamado por nenhuma tela — infraestrutura pronta para a Fase 6 (tela de configuração) e a Fase 7 (Central de Graduação).
- **Verificação**: `npx tsc --noEmit` no frontend — comparado byte a byte (`diff`) entre a saída antes e depois de todas as mudanças desta fase: **idêntica**, mesmos 69 erros pré-existentes (dívida de duplicação `types.ts`/`src/types/entities.ts`, não relacionada a esta feature). Nenhum erro novo, nenhum corrigido.

### Detalhes do que foi feito na Fase 5 (11/08/2026)

- **Descoberta importante feita ao decidir onde plugar a tela**: o projeto tem **dois `App.tsx` distintos**. O `index.tsx` (raiz) monta o `App.tsx` da **raiz** (`HashRouter` + `views/*.tsx` + `types.ts` legado) — esse é o app que roda de verdade. Já existe também um `src/App.tsx` (React Router com `<Routes>` apontando para `src/pages/*Page.tsx`, que por sua vez envolvem `src/features/*/views/*`) — **esse não é importado por nada, é código morto/uma migração não finalizada**. Prova: `UsersView`/`SystemConfigView` (as versões novas em `src/features/*`) não aparecem em nenhum import do `App.tsx` da raiz. Implementação desta fase seguiu o app que **realmente roda** (raiz). Achado registrado aqui só como observação — não foi mexido/limpo, é decisão de outra frente.
- **`src/features/sports/services/sportService.ts`** (novo): CRUD de `sports` e `belt_ranks` consumindo as rotas da Fase 2, seguindo o mesmo padrão de `academyService.ts`/`beltRankService.ts`.
- **`views/SportsView.tsx`** (novo, no padrão legado `views/*.tsx` — é esse que o app carrega): tela do superuser com seletor de esporte (hoje só Jiu-Jitsu), lista de faixas do template em cards responsivos (sem tabela — mobile-friendly por padrão, sem precisar do `mobileCardRender` do `Table`), com reordenação por setas ↑/↓ (troca de `order_index` com o vizinho, sem drag-and-drop), modais de criar/editar Esporte e criar/editar Faixa (nome, cor, categoria, graus, idade mín/máx), e exclusão de faixa com confirmação (backend já bloqueia se estiver em uso).
- **Seletor de cor**: em vez de tentar reaproveitar a paleta específica do Jiu-Jitsu (`BELT_VISUAL_CONFIG`, que é key-por-classe-Tailwind e não serve pra um esporte novo/arbitrário), a tela usa `COLOR_PALETTES` — o sistema de cores genérico que já existe em `src/utils/constants.ts` (hex + `style` inline, funciona pra qualquer faixa de qualquer esporte futuro sem precisar gerar classes Tailwind dinamicamente). `color_key` das faixas cadastradas por essa tela usa as chaves desse palette (ex: `azul`, `preto`), **diferente** do formato usado no seed do Jiu-Jitsu (`BLUE`, `BLACK` — vindo do nome do enum `Belt`). Isso não quebra nada hoje porque nenhuma tela ainda lê `color_key` para exibir faixa (só acontece na Fase 8); registrado aqui para quem for religar a exibição não se confundir com os dois formatos convivendo.
- **Bug pego antes de rodar**: o primeiro rascunho do "mover faixa" usava `order_index = -1` como valor temporário pra evitar colisão com o `UNIQUE(sport_id, order_index)` durante a troca — mas a validação do backend (`min: 0`) rejeitaria isso com 400. Trocado para um valor temporário alto (`999999`) antes de qualquer teste.
- **Rota e navegação**: `/sports` adicionada em `App.tsx` (raiz) **fora** do bloco `{academy ? (...) : ...}`, já que é uma tela global (independe de academia selecionada), protegida por `ProtectedRoute roles={['superuser']}`. Link de acesso colocado dentro do painel "Master Control" da Sidebar (o mesmo bloco que já tem o seletor de academia do superuser) — visível com ou sem academia selecionada.
- **Verificação**: `npx tsc --noEmit` comparado com a baseline pré-existente (69 erros) — **idêntico**, nenhum erro novo. Não testado no navegador (regra do projeto — só o usuário testa via interface).

### Detalhes do que foi feito na Fase 6 (11/08/2026)

- **`views/SettingsView.tsx`**: removida a seção "Critérios de Graduação" (baldes `kids`/`white`/`intermediate`/`black`, `GraduationRules`, `academyService.update({ graduationRules })`) e substituída por **"Faixas e Graduação"**, consumindo `beltRankService` (Fase 4) em vez de `academyService`. Carregamento automático ao montar a view (mesmo padrão já usado para planos/instrutores nesta tela) para alimentar o card-resumo, e recarregado ao abrir o modal para garantir dados frescos.
- **Modal novo**: lista todas as faixas do esporte da academia (ordenadas), cada uma com 2 campos principais — **Meses** e **Aulas** (D3: livre por faixa, ambos opcionais, o que ocorrer primeiro) — e um `<details>` colapsável com os 2 campos de aviso antecipado (`warnBeforeMonths`/`warnBeforeClasses`), para não sobrecarregar a tela com 19 faixas × 4 campos sempre visíveis. Estado local (`editBeltSettings`) sincronizado via `useEffect` sempre que os dados carregados mudam. `handleSaveBeltSettings` envia todas as linhas de uma vez para `PUT /academies/:id/belt-settings` (upsert no backend).
- **Card-resumo**: mostra o nome do esporte + contagem "X de Y faixas configuradas" (configurada = tem `monthsRequired` ou `classesRequired` preenchido); trata o estado `sport: null` (academia ainda sem esporte — não deveria mais ocorrer após o backfill da Fase 3, mas o fallback fica por segurança) e o estado de carregamento.
- **Consistência de 3 camadas (regra do projeto)**: não se aplica da mesma forma aqui — faixas/graduação agora são um recurso próprio (`academy_belt_settings`, com endpoint dedicado `GET/PUT /academies/:id/belt-settings`), não um campo dentro do payload de `Academy`/`PUT /academies/:id` como era antes. Não há mais `graduationRules` no tipo `Academy` sendo lido/escrito por esta tela.
- **Verificação**: `npx tsc --noEmit` comparado com a baseline (69 erros) — **68 erros**, uma diferença **esperada e correta**: a função antiga `handleSaveGraduation` (removida) era um dos 6 pontos que chamava `onUpdateAcademy({ ...academy, ...saved })` com um literal cuja forma já dava erro de tipo pré-existente (`currentPlan`/`VIP`); ao remover esse código morto, esse ponto de erro específico deixou de existir — não foi mascarado, foi genuinamente eliminado junto com o código que o causava. Todos os outros 68 erros restantes são exatamente os mesmos de antes (confirmado por diff, só mudaram de número de linha).

### Detalhes do que foi feito na Fase 7 (11/08/2026)

- **Escopo desta fase, decidido ao mapear o código**: `isReadyForGraduation`/`getGraduationThreshold`/`getGraduationWarning` (baldes fixos) são usadas em **4 arquivos** (`StudentsView.tsx`, `DashboardView.tsx`, `ReportsView.tsx`, `StudentProfileView.tsx`). A Fase 7 tocou **só `StudentsView.tsx`** — é o arquivo que contém literalmente a "Central de Graduação" (nome da tela, por isso é o escopo desta fase). Os outros 3 continuam com a lógica antiga de baldes; migrá-los é explicitamente Fase 8 no plano ("demais telas... dashboard").
- **`services/graduation.ts`**: 3 novas funções aditivas (nada removido) — `isReadyForGraduationByBeltRank`, `getGraduationProgressByBeltRank`, `isCloseToGraduationByBeltRank` — operam sobre um `BeltRankConfig` (degreeCount + meses/aulas necessários + aviso antecipado) resolvido pelo chamador a partir do `belt_rank` correspondente, em vez do balde fixo da academia. `readyForBelt`/`readyForStripe` seguem a mesma forma de retorno de antes (compatibilidade de leitura no restante do arquivo).
- **`views/StudentsView.tsx`**: novo estado `beltRanksConfig`/`beltSettingsSport` (carregado via `beltRankService.getAcademyBeltSettings`, mesmo hook de dados já usado no `SettingsView` da Fase 6) e helper `getBeltConfig(student)` que resolve a config da faixa atual do aluno **por nome** (`student.belt`) — os 11 pontos que chamavam `isReadyForGraduation(x, academy.graduationRules)` foram trocados para `isReadyForGraduationByBeltRank(x, getBeltConfig(x))` (badge no card mobile/desktop, filtro "prontos para graduar", botão de promoção rápida no modal de edição, cards de status, fila de promoção, botões de copiar nomes, estado vazio).
- **Painel "Configuração Ativa"**: trocado de "4 baldes com 1 valor cada" para "esporte da academia + X de Y faixas configuradas", com link direto para a nova tela de configuração (Fase 6).
- **Fila de Promoção**: a métrica única por `mode` (`gradMode`) foi trocada por `getGraduationProgressByBeltRank`, que escolhe entre meses/aulas o que estiver **mais perto de bater** (maior proporção concluída) quando os dois estão configurados para a faixa — reflete a semântica "o que ocorrer primeiro" (D3) também na ordenação da fila (mais próximos de graduar aparecem primeiro).
- **Nova seção "Quase Lá"**: usa `isCloseToGraduationByBeltRank` (aviso antecipado por faixa, D3) para listar alunos dentro da margem configurada mas ainda não elegíveis — funcionalidade nova, não existia na Central de Graduação antes (o aviso antecipado só existia no dashboard pessoal do aluno, que é uma tela diferente e continua com a lógica antiga até a Fase 8).
- **Verificação**: `npx tsc --noEmit` comparado com a saída da Fase 6 — **idêntico** (68 erros, só um deles mudou de número de linha por causa do código adicionado acima dele no arquivo).

### Detalhes do que foi feito na Fase 8 (11/08/2026)

- **`src/features/settings/hooks/useAcademyBeltRanks.ts`** (novo): hook compartilhado (`sport`, `beltRanks`, `isLoading`, `getBeltConfig(beltName: string)`) — extraído para não repetir pela 3ª/4ª vez o mesmo par fetch+state já escrito em `SettingsView`/`StudentsView` (Fases 6/7). Usado pelos 3 arquivos desta fase.
- **`views/ReportsView.tsx`**: os 4 pontos que liam `isReadyForGraduation(s, academy.graduationRules)` (stat de "prontos para graduar" no relatório) trocados para `isReadyForGraduationByBeltRank(s, getBeltConfig(s.belt))`.
- **`views/StudentProfileView.tsx`**: card "Próxima Graduação" (tela `/profile`) trocado para `getGraduationProgressByBeltRank`. De brinde corrigido um bug pré-existente: para `mode === 'months'` o `current` estava **hardcoded em `0`** (nunca calculava os meses desde a última graduação) — o card sempre mostrava a contagem cheia como "faltante" para quem usava esse modo. A nova versão calcula corretamente via `monthsSince`.
- **`views/DashboardView.tsx`** (maior escopo desta fase): 3 pontos migrados —
  1. `graduationAlerts` (widget de alerta para admin/instrutor/staff, lista de até 10 alunos elegíveis).
  2. Banner "Graduação Próxima" do próprio aluno (`graduationWarning`) — antes vinha de `getGraduationWarning` (baldes, unidade `'treinos'|'horas'|'dias'`), agora de `isCloseToGraduationByBeltRank` + `getGraduationProgressByBeltRank` (unidade `'aulas'|'meses'`); texto da mensagem (`Falta só 1 treino/hora/dia!`) ajustado para o novo vocabulário (`mês`/`aula`).
  3. Card "Jornada de Graduação" (barra de progresso %, `current`/`target`/`unit`) — a lógica de `mode` (hours/months/classes) computada manualmente foi substituída por `getGraduationProgressByBeltRank`, mesma função das outras duas telas.
  - Só a **computação de dados** mudou nos 3 pontos — nenhum JSX/animação/estilo foi alterado, para minimizar risco numa tela vista por todo usuário logado.
- **Decisão consciente de não uniformizar 100%**: `views/StudentsView.tsx` (Fase 7) mantém sua própria implementação inline de `getBeltConfig` (que recebe o `Student` inteiro, não só o nome da faixa) em vez de adotar o hook novo — trocar os 14 pontos de chamada só por consistência cosmética não valia o risco de re-tocar código da Fase 7 já verificado. Fica registrado como candidato a unificação na Fase 9 (limpeza), não é um bug.
- **Verificação**: `npx tsc --noEmit` comparado com a Fase 7 — **idêntico** (68 erros, só shifts de linha). Nenhuma tela testada no navegador (regra do projeto).

### Correção pós-Fase 8 (11/08/2026) — cor da faixa não vinha do cadastro

**Problema encontrado pelo usuário**: a tela de Esportes (Fase 5) deixa o superuser editar a cor de cada faixa, mas nada na exibição real do sistema lia esse valor — `BeltBadge` e demais pontos de exibição usavam uma tabela estática (`constants.ts`), indexada pelo enum `Belt`, nunca pelo `belt_ranks.color_key`. Pior: o seletor de cor da tela de Esportes usava uma paleta diferente (`COLOR_PALETTES`, 9 cores genéricas) da que o `BeltBadge` realmente sabe renderizar (`BELT_VISUAL_CONFIG`, 19 estilos, incluindo o visual de duas cores/listra central de faixas como Cinza-e-Branca) — ou seja, mesmo se algo lesse o valor salvo, ele não corresponderia a um estilo válido.

**Correção aplicada**:
- **`constants.ts`**: novo `BELT_VISUAL_CONFIG_BY_COLOR_KEY` — mesmo conteúdo de `BELT_VISUAL_CONFIG`, mas indexado pela string `color_key` (`"WHITE"`, `"GREY_WHITE"`, ...) em vez do enum `Belt`. É o vocabulário canônico de cor agora — usado tanto pelo seletor quanto pela exibição.
- **`views/SportsView.tsx`**: seletor de cor trocado de `COLOR_PALETTES` (9 cores genéricas, inline hex) para `BELT_VISUAL_CONFIG_BY_COLOR_KEY` (19 estilos, classes Tailwind) — agora uma edição de cor ali corresponde a um estilo que de fato existe no render.
- **`components/BeltBadge.tsx`**: novo prop opcional `colorKey?: string` — quando informado, resolve via `BELT_VISUAL_CONFIG_BY_COLOR_KEY`; sem ele, cai no comportamento de sempre (fallback pelo enum `Belt`). Aditivo — nenhum call site existente quebra se não passar o prop.
- **Todos os 6 arquivos que renderizam `<BeltBadge>`** (`StudentsView`, `DashboardView`, `AttendanceView`, `InstructorsView`, `KimonoLoanView`, `TemplateView`) passam a resolver e enviar `colorKey` a partir da config de faixas da academia (`getBeltConfig`/`useAcademyBeltRanks`) — os 4 que ainda não carregavam essa config (`AttendanceView`, `InstructorsView`, `KimonoLoanView`, `TemplateView`) ganharam o hook `useAcademyBeltRanks` (Fase 8) para isso.
- **Verificação**: `npx tsc --noEmit` idêntico à Fase 8 (68 erros, só shifts de linha).

**Extensão completa (12/08/2026), a pedido do usuário ("faça tudo correto, não quero gambiarras")** — os ~34 pontos restantes que liam `BELT_COLORS[belt]` diretamente (fundos de avatar, seletor de faixa em formulário, histórico de graduação) foram migrados:

- **`constants.ts`**: nova função `getBeltClassName(belt, colorKey?)` — substituto dinâmico de `BELT_COLORS[belt]`, mesma string combinada `"bg text border"` (mesma ordem — os call sites antigos que faziam `.split(' ')[0]` para pegar só o bg continuam funcionando sem alteração). `BELT_COLORS` (a tabela estática) foi **removida** — zero consumidores restantes depois da migração.
- **8 arquivos migrados**: `AttendanceView`, `DashboardView` (incluindo um 4º bug de "faixa faltando" na legenda "Composição do Tatame" — array local hardcoded parava em Preta, sem Coral/Vermelha, igual ao bug já corrigido no `ReportsView` na Fase 4 — trocado para `BELT_LIST`), `InstructorProfileView`, `InstructorsView`, `KimonoLoanView`, `ReportsView`, `StudentProfileView`, `StudentsView`. Cada `BELT_COLORS[x]` virou `getBeltClassName(x, getBeltConfig(x)?.colorKey)` (ou a variante correta de `getBeltConfig` de cada arquivo — objeto `Student` no `StudentsView`, nome de faixa string nos demais).
- **`LoginView.tsx` — caso especial**: é uma tela **pública**, sem sessão, então não pode chamar `GET /academies/:id/belt-settings` (exige `requireAuth`). Resolvido criando uma rota nova **pública** `GET /api/academies/:id/belt-ranks/public` (`api/src/routes/academies.ts`, mesmo padrão já existente de `GET /api/plans/public?academyId=`) que retorna só `id/name/colorKey/orderIndex` das faixas do esporte da academia — sem meses/aulas/graus, que não são dado sensível nem necessário pré-cadastro. Novo método `beltRankService.getPublicBeltRanks(academyId)` no frontend, chamado junto da já existente busca de academia por alias.
- **Limite remanescente, deliberado**: o gráfico de distribuição de faixas do `ReportsView` (`colorMap`, usado como `fill` de um componente de chart) continua com cores em **hex fixo**, não dinâmico — motivo: é uma tecnologia de cor diferente (hex de preenchimento SVG, não classe Tailwind) e o cadastro de faixa não guarda um valor hex, só `color_key` (nome de classe). Estender isso exigiria adicionar um campo hex ao `belt_ranks`, o que não foi pedido; é uma extensão de escopo separada caso o usuário queira o gráfico também dinâmico.

> **PENDÊNCIA PARA REVISAR DEPOIS** (anotado 12/08/2026, a pedido do usuário): decidir se o gráfico de distribuição de faixas (`views/ReportsView.tsx`, `colorMap` hex) também deve virar dinâmico a partir do cadastro de Esporte. Hoje ele é a única exibição de faixa que ainda não lê `belt_ranks` — todo o resto do sistema já foi migrado (ver correção de 11-12/08/2026 acima). Se sim, precisa adicionar um campo de cor em hex a `belt_ranks` (hoje só tem `color_key`, um nome de classe Tailwind, não serve para `fill` de SVG).
- **Verificação**: `npx tsc --noEmit` (frontend e backend) idêntico ao estado anterior — 68 erros pré-existentes, zero novos. `noUnusedLocals`/`noUnusedParameters` estão ativos no `tsconfig.json`, então a ausência de erros novos também confirma que nenhum import ficou órfão depois da remoção de `BELT_COLORS`.

### Nota de risco identificada durante a implementação (Resolvida na Fase 3)

A faixa **Branca** hoje é compartilhada por duas regras de negócio diferentes: um praticante com menos de 16 anos usa o limiar do balde `kids` (padrão 25), um adulto usa o limiar do balde `white` (padrão 20) — mesma faixa, dois critérios, decidido em runtime pela idade no momento do cálculo. Como a Branca virou **uma única linha** em `belt_ranks` (`category: 'both'`), o novo modelo só permite **um** critério de meses/aulas para ela em `academy_belt_settings`, não dois. **Resolução aplicada no backfill**: usado o valor do balde `white` como padrão inicial (ver detalhe na seção da Fase 3 acima) — admin pode ajustar manualmente depois pela tela de configuração (Fase 6) se quiser um valor diferente para a Branca infantil.

---

## Riscos e pontos de atenção

- Trocar `students.belt` de `ENUM` para FK é migração de dados sensível — **fazer backup do banco QAS antes de rodar o script da Fase 3**.
- Academias existentes recebem `sport_id` do Jiu-Jitsu via backfill (única vez em que o campo é preenchido "por fora" do cadastro) — depois disso o campo trava igual às academias novas, mesmo para essas.
- Ambos `types.ts` (legado) e `src/types/entities.ts` (novo) precisam ser atualizados em paralelo enquanto convivem — risco de esquecer um dos dois em cada fase de frontend.
