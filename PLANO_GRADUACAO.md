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
- `belt ENUM(...)` — mantido por ora, sem uso depois do cutover.
- `stripes TINYINT` — sem mudança de coluna; validação do teto passa a usar `belt_ranks.degree_count` em vez de constante fixa (4 / 6).

### `graduation_history` (alteração)
- `+ belt_rank_id VARCHAR(36) NULL`, `+ previous_belt_rank_id VARCHAR(36) NULL` (FKs, nullable).
- `previous_belt` / `new_belt` (texto livre) **permanecem** como snapshot histórico — não dependem de o rank continuar existindo/com o mesmo nome.

---

## Mudanças de API (backend `api/`)

- **`GET/POST/PUT /api/sports`** — CRUD de esportes, restrito a `superuser`.
- **`GET/POST/PUT/DELETE /api/sports/:id/belt-ranks`** — CRUD do template de faixas/graus (nome, cor, ordem, graus, categoria, idade), restrito a `superuser`. `DELETE` bloqueado se a faixa estiver em uso (`academy_belt_settings` ou `students/instructors.belt_rank_id` referenciando).
- **`GET/PUT /api/academies/:id/belt-settings`** — lista as faixas do esporte da academia + configuração atual (`months_required`, `classes_required`, `warn_before_*`); `PUT` aceita array de `{ belt_rank_id, months_required, classes_required, warn_before_months, warn_before_classes }`. Restrito a `admin` da própria academia (+ `superuser`).
- **`POST /api/academies`** — passa a exigir `sport_id` no cadastro (restrito a `superuser`, que é quem cria academias).
- **`PUT /api/academies/:id`** — `sport_id` **não entra** no whitelist `ALLOWED`; é imutável após a criação, sem exceção (nenhuma rota de edição aceita esse campo).
- **`students.ts` / `instructors.ts`**:
  - Trocar validação de `belt` (enum fixo `BELT_VALUES`) por `belt_rank_id` (deve existir e pertencer ao `sport_id` da academia do aluno).
  - `POST /students/:id/graduate`: `new_stripes` valida contra `belt_ranks.degree_count` da faixa em vez do `0-4` fixo.
  - `GET /students?belt=` → `?beltRankId=`.
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
- [ ] **Fase 2 — Backend**: rotas `/sports` e `/sports/:id/belt-ranks` (CRUD, superuser); rotas `/academies/:id/belt-settings`; ajustar `students.ts`/`instructors.ts` (validação de `belt_rank_id`, cap de graus, `/graduate`, filtro `?beltRankId=`); `sport_id` no whitelist de `academies.ts` com bloqueio pós-primeiro-aluno
- [ ] **Fase 3 — Migração de dados**: script one-off (idempotente), rodar em QAS primeiro, validar contagens antes de considerar pronto para PRD
- [ ] **Fase 4 — Frontend infra**: hook/serviço único de faixas; refatorar `BeltBadge`; remover os 5 arrays duplicados
- [ ] **Fase 5 — Frontend**: tela "Esportes" (superuser) — CRUD do template
- [ ] **Fase 6 — Frontend**: `SettingsView` — nova seção "Faixas e Graduação" por academia
- [ ] **Fase 7 — Frontend**: Central de Graduação — elegibilidade combinada (meses OU aulas) + aviso antecipado
- [ ] **Fase 8 — Frontend**: demais telas com exibição de faixa (filtros, modais, gráficos, dashboard) migradas para a fonte dinâmica
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

### Nota de risco identificada durante a implementação

A faixa **Branca** hoje é compartilhada por duas regras de negócio diferentes: um praticante com menos de 16 anos usa o limiar do balde `kids` (padrão 25), um adulto usa o limiar do balde `white` (padrão 20) — mesma faixa, dois critérios, decidido em runtime pela idade no momento do cálculo. Como a Branca virou **uma única linha** em `belt_ranks` (`category: 'both'`), o novo modelo só permite **um** critério de meses/aulas para ela em `academy_belt_settings`, não dois. Ao migrar os dados existentes (Fase 3), será preciso decidir manualmente qual dos dois valores antigos (`kids.stripeThreshold` ou `white.stripeThreshold`) vira o valor inicial da Branca — não há como preservar os dois automaticamente sem desdobrar a Branca em duas linhas (o que reabriria a discussão de D2). Ponto para revisar com o usuário na Fase 3.

---

## Riscos e pontos de atenção

- Trocar `students.belt` de `ENUM` para FK é migração de dados sensível — **fazer backup do banco QAS antes de rodar o script da Fase 3**.
- Academias existentes recebem `sport_id` do Jiu-Jitsu via backfill (única vez em que o campo é preenchido "por fora" do cadastro) — depois disso o campo trava igual às academias novas, mesmo para essas.
- Ambos `types.ts` (legado) e `src/types/entities.ts` (novo) precisam ser atualizados em paralelo enquanto convivem — risco de esquecer um dos dois em cada fase de frontend.
