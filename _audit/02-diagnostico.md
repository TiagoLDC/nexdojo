# Fase 2 — Diagnóstico de Problemas NexDojo
> Gerado em: 08/05/2026 | Base: leitura completa do código-fonte

---

## CATEGORIA: SEGURANÇA

---

### [SEG-01] JWT secret hardcoded como fallback

**Arquivo(s):** `api/src/routes/auth.ts:7` | `api/src/middleware/auth.ts:4`
**Severidade:** 🔴 Crítica
**Descrição:** O `JWT_SECRET` usa `'nexdojo_secret_2026'` como fallback se a variável de ambiente não estiver definida. Se o container subir sem a env var configurada, tokens são assinados com chave previsível. No `docker-compose.yml` o valor é `nexdojo_super_secret_jwt_key_2026` — curto e sem entropia suficiente.
**Impacto:** Qualquer pessoa que conheça o segredo pode forjar tokens JWT válidos e impersonar qualquer usuário, incluindo superuser.
**Correção sugerida:** Gerar um secret de 64+ caracteres aleatórios. Remover o fallback hardcoded — se `JWT_SECRET` não estiver definido, o servidor deve se recusar a iniciar. Usar Docker secrets ou variáveis seguras no CI/CD.

---

### [SEG-02] Credenciais de banco e JWT em texto claro no repositório

**Arquivo(s):** `docker-compose.yml:25-26` | `api/.env:3-4`
**Severidade:** 🔴 Crítica
**Descrição:** `DATABASE_URL` com senha (`yFkL8OvxPnr3`) e `JWT_SECRET` estão em texto claro no `docker-compose.yml`, que provavelmente está versionado no Git. O `api/.env` também contém a senha em plaintext com comentário explicativo.
**Impacto:** Qualquer pessoa com acesso ao repositório tem acesso completo ao banco de dados de produção e pode forjar tokens JWT.
**Correção sugerida:** Mover segredos para `.env.production` não versionado ou Docker secrets. No `docker-compose.yml`, usar `env_file: .env.production`. Garantir que `api/.env` está no `.gitignore`. Rotacionar imediatamente as credenciais expostas.

---

### [SEG-03] Autorização ausente em rotas críticas de academias

**Arquivo(s):** `api/src/routes/academies.ts:37-48` | `api/src/routes/academies.ts:52-63` | `api/src/routes/academies.ts:67-78`
**Severidade:** 🔴 Crítica
**Descrição:** As rotas `PUT /api/academies/:id`, `GET /api/academies/:id/users` e `PUT /api/academies/:id/users/:userId/status` verificam apenas se o token é válido, mas **não verificam** se o usuário autenticado pertence à academia que está modificando. Um admin da academia A pode alterar dados da academia B, ver os usuários da B e aprovar/rejeitar usuários da B.
**Impacto:** Quebra total de isolamento multi-tenant. Qualquer admin pode comprometer dados de outras academias.
**Correção sugerida:** Adicionar verificação `if (req.user.role !== 'superuser' && req.user.academyId !== req.params.id) return res.status(403)`.

---

### [SEG-04] Senhas em texto claro ainda aceitas (modo legado)

**Arquivo(s):** `api/src/routes/auth.ts:23-28`
**Severidade:** 🔴 Crítica
**Descrição:** O login aceita senhas sem hash bcrypt (`if (!user.password.startsWith('$2'))`) para "suporte a migração". Se existem registros com senha plaintext no banco, qualquer dump do DB expõe senhas diretamente.
**Impacto:** Comprometimento de credenciais de usuários em caso de vazamento de banco.
**Correção sugerida:** Executar migration para hashear todas as senhas restantes e remover o branch de plaintext. Adicionar script utilitário de migração se necessário.

---

### [SEG-05] CORS totalmente aberto

**Arquivo(s):** `api/src/server.ts:21`
**Severidade:** 🟡 Média
**Descrição:** `app.use(cors())` sem configuração aceita requisições de qualquer origem. Em QAS isso pode ser aceitável, mas em produção permite que sites maliciosos façam requests autenticados usando os tokens do usuário.
**Impacto:** CSRF-like attacks via cross-origin requests com tokens válidos.
**Correção sugerida:** Restringir com `cors({ origin: ['https://qas.nexdojo.com.br'] })`.

---

### [SEG-06] Sem rate limiting na rota de login

**Arquivo(s):** `api/src/routes/auth.ts:10-55`
**Severidade:** 🟡 Média
**Descrição:** Nenhum middleware de rate limiting ou throttling. A rota `POST /api/auth/login` pode ser bruteforçada indefinidamente.
**Impacto:** Ataque de força bruta a contas de usuários.
**Correção sugerida:** Usar `express-rate-limit` com limite de ~5 tentativas por minuto por IP na rota de auth.

---

### [SEG-07] GEMINI_API_KEY exposta no bundle do frontend

**Arquivo(s):** `vite.config.ts:24-25`
**Severidade:** 🟡 Média
**Descrição:** `process.env.GEMINI_API_KEY` é injetada no bundle JS do frontend via Vite `define`. Qualquer pessoa pode inspecionar o bundle e extrair a chave. Mesmo sem uso atual, quando a integração for ativada, a chave será pública.
**Impacto:** Uso não autorizado da cota da API Gemini com custos para a conta.
**Correção sugerida:** Chamadas à API Gemini devem ser feitas pelo backend (rota proxy), nunca pelo frontend. Remover o `define` do vite.config.ts.

---

### [SEG-08] Sem validação de input no backend

**Arquivo(s):** Todas as rotas em `api/src/routes/`
**Severidade:** 🟡 Média
**Descrição:** Nenhuma rota valida os dados recebidos. O `req.body` é aceito e passado diretamente ao Prisma. Exemplos: `amount` em finances pode ser negativo ou string; `role` em academies PUT pode ser alterado para `superuser`; campos como `academyId` podem ser sobrescritos pelo payload.
**Impacto:** Dados corrompidos no banco, possível privilege escalation via `role` override.
**Correção sugerida:** Usar Zod ou similar para validar e sanitizar todos os inputs. Nunca confiar em campos como `role`, `academyId` vindos do corpo da requisição — usar sempre `req.user` do middleware JWT.

---

### [SEG-09] Token JWT sem revogação

**Arquivo(s):** `api/src/routes/auth.ts:42-46`
**Severidade:** 🟢 Baixa
**Descrição:** Tokens têm expiração de 7 dias mas não há mecanismo de revogação (blacklist). Se um usuário for bloqueado (`status: Blocked`) ou um token vazar, o token permanece válido até expirar.
**Impacto:** Acesso indevido por até 7 dias após bloqueio de conta ou comprometimento de token.
**Correção sugerida:** Implementar verificação do status do usuário no middleware de autenticação (query ao banco a cada request ou cache curto). Alternativamente, reduzir a expiração para 24h com refresh token.

---

## CATEGORIA: CONFIABILIDADE DE DADOS

---

### [DAD-01] Bulk attendance sem transação — risco de inconsistência crítica

**Arquivo(s):** `api/src/routes/attendance.ts:31-63`
**Severidade:** 🔴 Crítica
**Descrição:** `POST /api/attendance/bulk` faz `createMany` para os registros de presença e depois um loop `for` com N updates individuais nos alunos (`totalClasses++`, `totalHours++`). Essas operações não estão dentro de uma `prisma.$transaction()`. Se o servidor cair ou a conexão cair após o `createMany` mas antes dos updates, os registros de presença existem mas os contadores dos alunos não foram incrementados.
**Impacto:** Contadores de aulas (`totalClasses`, `totalHours`) incorretos, afetando diretamente as regras de graduação.
**Correção sugerida:** Envolver todo o bloco em `prisma.$transaction(async (tx) => { ... })`.

---

### [DAD-02] `handleQuickFinalize` — chamada salva apenas em localStorage, ignora API

**Arquivo(s):** `src/views/AttendanceView.tsx:361-407`
**Severidade:** 🔴 Crítica
**Descrição:** O botão "Finalizar Rapidamente" em aulas já existentes usa `StorageService.saveAttendance`, `StorageService.saveClasses` e `StorageService.saveStudents` — nenhuma chamada à API. A sessão fica como "Finalizada" no localStorage mas permanece "In Progress" no banco. Os contadores do aluno são atualizados só localmente.
**Impacto:** Divergência completa entre banco e localStorage. Dados de chamada perdidos ao trocar de dispositivo ou limpar o browser.
**Correção sugerida:** Substituir todo o bloco por chamada a `ApiService.saveAttendanceBulk`, igual ao `handleFinishClass`.

---

### [DAD-03] GraduationHistory nunca escrito no banco

**Arquivo(s):** `src/views/StudentsView.tsx:418-458`
**Severidade:** 🔴 Crítica
**Descrição:** `handlePromoteStudent` constrói um `GraduationHistoryItem` e o anexa ao array `graduationHistory` do objeto aluno. Esse array é enviado para `ApiService.updateStudent` como parte do payload. Porém, o backend (`students.ts`) não mapeia `graduationHistory` para nenhum campo do Prisma — ele é silenciosamente descartado. O modelo `GraduationHistory` existe no banco mas nunca recebe dados.
**Impacto:** Todo o histórico de graduações é perdido ao trocar de dispositivo. A auditoria de quem graduou quem não existe no banco.
**Correção sugerida:** Criar rota `POST /api/students/:id/graduate` que escreve em `GraduationHistory` e atualiza o `Student` na mesma transação.

---

### [DAD-04] Campos críticos do aluno descartados silenciosamente pelo backend

**Arquivo(s):** `api/src/routes/students.ts:44-68` | `api/prisma/schema.prisma:58-102`
**Severidade:** 🔴 Crítica
**Descrição:** Os seguintes campos existem nos tipos do frontend mas **não estão no schema Prisma** e são descartados silenciosamente pelo backend:
- `cpf`, `rg` (documento pessoal do aluno)
- `guardianRg`, `guardianProfession`
- `documents` (documentos anexados)
- `graduationHistory`
- `planId`, `nextPaymentDate`
- `absenceLimit` (no nível do aluno)

O frontend envia esses dados, a API os recebe mas não salva. O usuário pensa que salvou, mas esses dados só existem em localStorage.
**Impacto:** Perda de dados críticos. CPF/RG do aluno e documentos são dados legais obrigatórios para academias de luta.
**Correção sugerida:** Adicionar os campos ausentes ao schema Prisma e rodar migration. Alternativamente, documentar explicitamente quais campos são localStorage-only.

---

### [DAD-05] Campos da academia descartados pelo banco

**Arquivo(s):** `api/prisma/schema.prisma:13-42` | `src/types.ts:214-235`
**Severidade:** 🔴 Crítica
**Descrição:** Os campos `currentPlan`, `planStatus`, `planExpirationDate`, `paymentWarningDays`, `absenceLimit` e `plans` (AcademyPlan[]) existem no tipo `Academy` do frontend mas não estão no schema Prisma. Salvos e lidos apenas do localStorage.
**Impacto:** Configurações críticas da academia (plano ativo, limite de faltas, aviso de pagamento) se perdem ao trocar de dispositivo. O dashboard exibe dados potencialmente inconsistentes.
**Correção sugerida:** Migrar esses campos para o banco (ou tabela separada `AcademyConfig`).

---

### [DAD-06] `absentCount` nunca incrementado pela API

**Arquivo(s):** `api/src/routes/attendance.ts:47-56`
**Severidade:** 🟡 Média
**Descrição:** A rota de bulk attendance incrementa `totalClasses` e `totalHours` mas nunca incrementa `absentCount`. O contador de faltas só é atualizado pelo fluxo legado de localStorage (`handleQuickFinalize`). A lógica de "resetar absentCount para 0 quando o aluno comparece" também não está na API.
**Impacto:** Alertas de falta no Dashboard são baseados em dados inconsistentes ou desatualizados.
**Correção sugerida:** Implementar lógica de contagem de faltas no backend: alunos presentes têm `absentCount = 0`, alunos ausentes têm `absentCount + 1`.

---

### [DAD-07] `DELETE /api/students/:id` não exclui o User associado

**Arquivo(s):** `api/src/routes/students.ts:106-113`
**Severidade:** 🟡 Média
**Descrição:** Ao deletar um aluno, apenas o registro `Student` é removido. O `User` correspondente (com email e senha) permanece no banco e o ex-aluno ainda consegue fazer login.
**Impacto:** Usuários excluídos continuam tendo acesso ao sistema.
**Correção sugerida:** No DELETE, buscar e excluir também o `User` com mesmo email (ou mesmo `academyId` + `role: 'student'`). Ou adicionar `onDelete: Cascade` na relação User→Student.

---

### [DAD-08] `handleCheckIn` persiste `attendanceIds` em localStorage durante sessão de API

**Arquivo(s):** `src/views/AttendanceView.tsx:126-132`
**Severidade:** 🟡 Média
**Descrição:** Durante uma aula criada via API, cada check-in de aluno atualiza `StorageService.saveClasses` com `attendanceIds` localmente. Isso cria um estado paralelo: o banco tem a `ClassSession` mas sem `attendanceIds` (campo que nem existe no schema Prisma — a lista de presença está em `AttendanceRecord`).
**Impacto:** Confusão entre o estado local e o estado do banco. `handleEditClass` lê `session.attendanceIds` que vem do banco como undefined, resultando em Set vazio.
**Correção sugerida:** Remover a persistência em localStorage durante sessões de API. Usar apenas o estado React (`checkedIds`) como estado transitório até o `handleFinishClass`.

---

### [DAD-09] Lixeira (RecycleBin) sem persistência no banco

**Arquivo(s):** `src/views/RecycleBinView.tsx` | `src/services/storage.ts:226-236`
**Severidade:** 🟡 Média
**Descrição:** A lixeira existe apenas em localStorage. Quando um aluno é "deletado" via RecycleBin, o dado vai para localStorage. A restauração não recria o registro no banco. A exclusão permanente não deleta do banco.
**Impacto:** Dados de alunos deletados não existem mais no banco (foram deletados pela API), então a "restauração" da lixeira cria um objeto local que não reflete a realidade do banco.
**Correção sugerida:** Implementar soft delete no banco (`deletedAt DateTime?`) e uma rota de restore. Remover a lixeira baseada em localStorage.

---

### [DAD-10] IDs gerados no frontend com `Math.random()` para dados persistidos

**Arquivo(s):** `src/views/StudentsView.tsx:216` | `src/views/StudentsView.tsx:359` | `src/views/StorageService.ts:229` (e outros 10+ locais)
**Severidade:** 🟢 Baixa
**Descrição:** IDs de documentos, itens de lixeira, histórico de graduação e outros são gerados com `Math.random().toString(36).substr(2,9)`. Para dados que chegam ao banco (como GraduationHistory quando for implementado), o banco deve gerar o UUID via `@default(uuid())`.
**Impacto:** Risco baixo de colisão. Inconsistência de formato (9 chars random vs UUID).
**Correção sugerida:** Para entidades que persistem no banco, deixar a geração de ID para o Prisma. Para localStorage-only, o formato atual é aceitável.

---

## CATEGORIA: BOAS PRÁTICAS DE CÓDIGO

---

### [COD-01] Arquivos de view com mais de 1.800 linhas

**Arquivo(s):** `src/views/StudentsView.tsx` (1.895 linhas) | `src/views/DashboardView.tsx` (1.889 linhas) | `src/views/SettingsView.tsx` (1.407 linhas) | `src/views/AttendanceView.tsx` (1.000 linhas)
**Severidade:** 🟡 Média
**Descrição:** Múltiplas views concentram lógica de negócio, estado, chamadas de API, formatação, modais e renderização em um único arquivo. Isso dificulta manutenção, testes e revisão de código.
**Impacto:** Alto custo cognitivo para manutenção. Bugs difíceis de isolar.
**Correção sugerida:** Extrair modais como componentes separados, hooks de negócio (`useStudents`, `useAttendance`) e sub-componentes de seção.

---

### [COD-02] Código duplicado — funções repetidas em múltiplos arquivos

**Arquivo(s):** Múltiplos
**Severidade:** 🟡 Média
**Descrição:** Duplicações identificadas:
- `compressImage` duplicada em `StudentsView.tsx:65-93` e `SettingsView.tsx:13-41`
- `calculateAge` duplicada em `AttendanceView.tsx:34-44` e `src/services/graduation.ts:11-20`
- `getBeltColor` e `getBeltTheme` em `DashboardView.tsx:137-169` duplicando lógica de `constants.ts`
- `PrintHeader` duplicado em `StudentsView.tsx`, `FinancesView.tsx`, `ReportsView.tsx`
- `getEffectiveAbsenceLimit` duplicada em `StudentsView.tsx:461-473` e `DashboardView.tsx:263-269`

**Impacto:** Mudança em uma cópia não propaga para as outras. Bugs corrigidos em um lugar persistem nas cópias.
**Correção sugerida:** Mover para arquivos de utilitários/services compartilhados.

---

### [COD-03] `any` generalizado na camada de serviço e backend

**Arquivo(s):** `src/services/api.ts` (17 ocorrências) | `api/src/routes/` (28 ocorrências)
**Severidade:** 🟡 Média
**Descrição:** Praticamente todos os métodos da `ApiService` aceitam e retornam `any`. No backend, `req.body` é usado sem tipagem. Isso anula os benefícios do TypeScript end-to-end.
**Impacto:** Erros de tipo não são detectados em tempo de compilação. Regressões silenciosas ao alterar contratos de API.
**Correção sugerida:** Criar tipos compartilhados (DTOs) para request/response de cada rota e usá-los tanto no frontend quanto no backend.

---

### [COD-04] `confirm()` e `alert()` nativos do browser em 14 locais

**Arquivo(s):** `src/views/AttendanceView.tsx:270,362,789` | `src/views/RecycleBinView.tsx:107,114,273` | `src/views/InstructorsView.tsx:149,194` | `src/views/StudentsView.tsx:351` | `src/views/FinancesView.tsx:189,277` | e outros
**Severidade:** 🟡 Média
**Descrição:** O sistema mistura `window.confirm()` e `alert()` nativos com modais customizados para ações destrutivas. Os nativos bloqueiam a UI, não podem ser estilizados, são inconsistentes com o design system e em alguns browsers mobile têm comportamento diferente.
**Impacto:** UX inconsistente e inferior. Em modo kiosk (fullscreen) do AttendanceView, `confirm()` pode ser bloqueado pelo browser.
**Correção sugerida:** Criar componente `ConfirmModal` reutilizável e substituir todos os `confirm()`/`alert()`.

---

### [COD-05] `console.log` de dados sensíveis em produção

**Arquivo(s):** `src/views/TemplateView.tsx:238`
**Severidade:** 🟡 Média
**Descrição:** `console.log(`Enviando para ${notifyingTemplate.assignedStudentIds.length} alunos: ${notificationMsg}`)` vaza IDs de alunos e conteúdo de notificações para o console do browser em produção.
**Impacto:** Vazamento de IDs de usuários. A funcionalidade de notificação é apenas um stub — não envia nada de fato.
**Correção sugerida:** Remover o `console.log`. Implementar ou remover a funcionalidade de notificação.

---

### [COD-06] Pattern `const fn = async () => {}; fn()` desnecessariamente complexo

**Arquivo(s):** `src/views/StudentsView.tsx:286-307` | `src/views/StudentsView.tsx:313-330` | `src/views/StudentsView.tsx:418-458`
**Severidade:** 🟢 Baixa
**Descrição:** Handlers como `handleSaveStudent` e `handleDeleteStudent` definem uma função async interna e a invocam imediatamente, em vez de simplesmente serem funções async elas mesmas.
**Impacto:** Código desnecessariamente verboso e difícil de ler.
**Correção sugerida:** Transformar `handleSaveStudent` em `async handleSaveStudent()` diretamente.

---

### [COD-07] Campos `cpf` e `rg` no schema Prisma do Student ausentes

**Arquivo(s):** `api/prisma/schema.prisma:58-102`
**Severidade:** 🟡 Média (cross-cutting com DAD-04)
**Descrição:** O modelo `Student` no Prisma não tem `cpf`, `rg`, `guardianRg`, `guardianProfession`, `documents`, `planId`, `nextPaymentDate`. Esses são campos do tipo TypeScript `Student` no frontend mas sem contrapartida no banco.
**Impacto:** Divergência silenciosa entre o schema do banco e os tipos TypeScript. Novos desenvolvedores não percebem que esses campos não persistem.
**Correção sugerida:** Sincronizar schema Prisma com os tipos TypeScript ou documentar explicitamente os campos localStorage-only.

---

## CATEGORIA: PERFORMANCE

---

### [PERF-01] Nenhuma paginação em nenhuma rota

**Arquivo(s):** Todas as rotas GET em `api/src/routes/`
**Severidade:** 🟡 Média
**Descrição:** Todos os `findMany` retornam 100% dos registros sem `skip`/`take`. Para academias com centenas de alunos com fotos Base64, a resposta de `/api/students` pode ter centenas de MB.
**Impacto:** Lentidão progressiva conforme a base de dados cresce. Timeout e crash em academias grandes.
**Correção sugerida:** Adicionar paginação (`?page=1&limit=50`) ou cursor-based pagination. No mínimo, excluir campos pesados (foto Base64) nas listagens e incluí-los apenas no GET by ID.

---

### [PERF-02] Fotos e logos em Base64 no banco MySQL

**Arquivo(s):** `api/prisma/schema.prisma:17` (Academy.logo LongText) | `api/prisma/schema.prisma:90` (Student.photo LongText) | `api/prisma/schema.prisma:135` (Instructor.photo LongText) | `api/prisma/schema.prisma:158` (Staff.photo LongText)
**Severidade:** 🟡 Média
**Descrição:** Imagens são armazenadas como Base64 em campos LongText no MySQL. Uma foto de 400x400px comprimida (conforme `compressImage`) tem ~40-80KB. Com 100 alunos, uma query `SELECT *` retorna ~8MB só em fotos.
**Impacto:** Respostas lentas, alto uso de memória no servidor, alto consumo de dados no mobile.
**Correção sugerida:** Armazenar imagens em storage dedicado (S3, Cloudflare R2, ou volume Docker com nginx) e salvar apenas a URL no banco. A compressão atual é boa, mas a arquitetura de storage precisa mudar.

---

### [PERF-03] Superuser filtra dados no frontend (client-side filtering)

**Arquivo(s):** `src/views/DashboardView.tsx:88-102`
**Severidade:** 🟡 Média
**Descrição:** Quando o superuser seleciona uma academia, o frontend busca TODOS os alunos/instrutores/staff da API (que retorna dados de todas as academias) e filtra por `academyId` no JavaScript do browser.
**Impacto:** Para sistema com 50 academias × 100 alunos = 5.000 registros com fotos carregados a cada troca de academia.
**Correção sugerida:** O header `x-academy-id` já é enviado nas requests. A API já usa esse header para filtrar quando presente. O problema é que o DashboardView não inclui o header corretamente para superuser. Verificar e corrigir o fluxo do header.

---

### [PERF-04] N+1 queries no bulk attendance

**Arquivo(s):** `api/src/routes/attendance.ts:47-56`
**Severidade:** 🟡 Média
**Descrição:** Para cada aluno na chamada, é feito um `prisma.student.update` individual. Para uma turma de 30 alunos, são 30 queries sequenciais (`for` sem `Promise.all`).
**Impacto:** Latência alta ao finalizar chamadas grandes. 30 queries de ~5ms = 150ms só de overhead de DB.
**Correção sugerida:** Usar `Promise.all` para paralelizar os updates, ou melhor, usar `updateMany` com condição `WHERE id IN (...)`. Considerar incrementar contadores via query raw para atomicidade.

---

### [PERF-05] Re-fetch completo após cada mutação

**Arquivo(s):** `src/views/StudentsView.tsx:296` | `src/views/AttendanceView.tsx:290` | `src/views/InstructorsView.tsx` (padrão similar)
**Severidade:** 🟢 Baixa
**Descrição:** Após criar/editar/deletar um registro, o padrão é chamar `await loadData()` ou `await fetchStudents()` que recarrega todos os registros da API. Em vez disso, poderia atualizar o estado local com o resultado da mutação.
**Impacto:** UX mais lento do que necessário; tráfego de rede desnecessário.
**Correção sugerida:** Usar o objeto retornado pelo POST/PUT para atualizar o array local via `setStudents(prev => [...prev, newStudent])` ou `setStudents(prev => prev.map(s => s.id === id ? updated : s))`.

---

## CATEGORIA: UX E FLUXOS QUEBRADOS

---

### [UX-01] "Esqueci a senha" não tem rota no backend

**Arquivo(s):** `src/views/auth/ForgotPassword.tsx` | `api/src/routes/auth.ts`
**Severidade:** 🔴 Crítica
**Descrição:** A tela de recuperação de senha existe no frontend (`/esqueci-senha`), mas não há nenhuma rota `POST /api/auth/forgot-password` no backend. A funcionalidade não está implementada.
**Impacto:** Usuários que esquecem a senha não têm como recuperar o acesso de forma self-service.
**Correção sugerida:** Implementar fluxo de reset de senha por email, ou remover a rota do frontend e indicar que deve contatar o administrador.

---

### [UX-02] Erros críticos de chamada sem feedback ao usuário

**Arquivo(s):** `src/views/AttendanceView.tsx:296-298` | `src/views/AttendanceView.tsx:353-355`
**Severidade:** 🟡 Média
**Descrição:** `startClass` e `handleFinishClass` têm `catch` que apenas fazem `console.error`, sem nenhuma notificação ao usuário. Se a aula falhar ao criar ou ao finalizar, o usuário não sabe o que aconteceu.
**Impacto:** Professor acha que a chamada foi salva quando não foi. Dados de presença perdidos silenciosamente.
**Correção sugerida:** Adicionar toast de erro nas funções `startClass` e `handleFinishClass`.

---

### [UX-03] Restauração da lixeira não funciona

**Arquivo(s):** `src/views/RecycleBinView.tsx`
**Severidade:** 🟡 Média
**Descrição:** A lixeira restaura dados do localStorage, mas os registros foram deletados do banco via API. Restaurar um aluno da lixeira apenas o recria no localStorage, não no banco MySQL. Na próxima sessão (ou outro dispositivo), o aluno "restaurado" some.
**Impacto:** Administradores acreditam que restauraram dados que na verdade estão permanentemente perdidos no banco.
**Correção sugerida:** Implementar soft delete no banco (campo `deletedAt`). A restauração deve chamar a API para reverter o `deletedAt`.

---

### [UX-04] Validação de formulários apenas com toast genérico, não inline

**Arquivo(s):** `src/views/StudentsView.tsx:263-276` | `src/views/InstructorsView.tsx:149`
**Severidade:** 🟢 Baixa
**Descrição:** Erros de validação mostram um toast no canto da tela com a mensagem, mas não destacam o campo com problema. Em formulários longos (ficha de aluno tem dezenas de campos), o usuário não sabe qual campo está incorreto.
**Impacto:** UX degradada em formulários complexos. Usuário precisa procurar qual campo está faltando.
**Correção sugerida:** Adicionar estado de `errors: Record<string, string>` e mostrar mensagem vermelha inline abaixo de cada campo com problema.

---

### [UX-05] Estados de carregamento ausentes em módulos de localStorage

**Arquivo(s):** `src/views/KimonoView.tsx` | `src/views/ChatView.tsx` | `src/views/CalendarView.tsx`
**Severidade:** 🟢 Baixa
**Descrição:** Estas views não têm nenhum indicador de carregamento. Como leem do localStorage de forma síncrona, o usuário pode não perceber se os dados estão desatualizados ou se falhou ao carregar.
**Impacto:** Baixo atualmente (dados síncronos), mas se migrados para API, a ausência de loading states causará flash de conteúdo vazio.
**Correção sugerida:** Preparar estrutura de loading state para migração futura para API.

---

### [UX-06] `superuser` sem academia selecionada vê tela de aviso em todas as rotas

**Arquivo(s):** `src/App.tsx:41-60`
**Severidade:** 🟢 Baixa
**Descrição:** O componente `RequireAcademy` bloqueia o acesso a qualquer módulo se `academy === null`. Para o superuser, que pode não ter academia selecionada ao iniciar, todas as rotas retornam "Unidade não Selecionada" até ele ir ao Dashboard e selecionar uma academia.
**Impacto:** UX confusa — o superuser pode navegar para qualquer rota pela URL e ver a tela de bloqueio sem entender o que fazer.
**Correção sugerida:** Para superuser sem academia selecionada, redirecionar automaticamente para `/` com um toast explicativo, em vez de mostrar a tela de bloqueio em cada rota.

---

## RESUMO EXECUTIVO

| Categoria | 🔴 Crítica | 🟡 Média | 🟢 Baixa |
|---|---|---|---|
| Segurança | 4 | 3 | 2 |
| Confiabilidade de Dados | 5 | 4 | 1 |
| Boas Práticas | 0 | 4 | 3 |
| Performance | 0 | 4 | 1 |
| UX / Fluxos | 1 | 2 | 3 |
| **Total** | **10** | **17** | **10** |

**Problemas críticos que precisam de atenção imediata:**
1. Credenciais de banco expostas no repositório (SEG-02)
2. Autorização ausente em rotas de academias — qualquer admin pode modificar qualquer academia (SEG-03)
3. Bulk attendance sem transação (DAD-01)
4. Dados críticos de alunos (CPF, histórico de graduação) não persistindo no banco (DAD-03, DAD-04)
5. `handleQuickFinalize` bypassando totalmente a API (DAD-02)
6. "Esqueci a senha" sem implementação (UX-01)
