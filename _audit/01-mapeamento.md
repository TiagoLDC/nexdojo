# Fase 1 — Mapeamento do Projeto NexDojo
> Gerado em: 08/05/2026 | Somente leitura — nenhuma alteração realizada

---

## 1. Stack Completo

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite 6 + TailwindCSS v4 |
| **Backend** | Node.js + Express 5 + TypeScript |
| **ORM** | Prisma 5 |
| **Banco de dados** | MySQL 8 |
| **Autenticação** | JWT (jsonwebtoken 9) + bcryptjs |
| **Deploy** | Docker Compose (nginx + Node) |
| **Porta dev frontend** | 3002 |
| **Porta dev API** | 3005 |
| **Porta QAS frontend** | 3003 (container → porta 80 nginx) |
| **Porta QAS API** | 3005 (container → porta 3005) |
| **Gerenciador de pacotes** | npm |
| **PDF/Impressão** | html2canvas + jsPDF |
| **Gráficos** | Recharts |
| **Ícones** | Lucide React |
| **Animações** | motion (Framer Motion) |
| **QR Code** | qrcode.react |

---

## 2. Estrutura de Pastas

```
nexdojo/
├── api/                          # Backend (Node.js + Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma         # Definição de todos os modelos de dados
│   │   └── seed.ts               # Script de seed do banco
│   ├── scratch/                  # Scripts utilitários avulsos (não produção)
│   │   ├── check_db.ts
│   │   └── fix_name.ts
│   └── src/
│       ├── lib/prisma.ts         # Singleton do PrismaClient
│       ├── middleware/auth.ts    # Middleware JWT
│       ├── routes/
│       │   ├── auth.ts           # Login, registro academia, registro aluno
│       │   ├── academies.ts      # CRUD academias + gestão de usuários
│       │   ├── students.ts       # CRUD alunos
│       │   ├── instructors.ts    # CRUD instrutores
│       │   ├── staff.ts          # CRUD staff
│       │   ├── templates.ts      # CRUD templates de aula
│       │   ├── classes.ts        # CRUD sessões de aula
│       │   ├── attendance.ts     # Registro de presença (bulk)
│       │   └── finances.ts       # CRUD transações financeiras
│       └── server.ts             # Entrada: Express app, registra rotas, health check
│
├── src/                          # Frontend (React + TypeScript)
│   ├── App.tsx                   # Roteamento principal + guards de acesso
│   ├── types.ts                  # Todos os tipos/interfaces TypeScript
│   ├── constants.ts              # BELT_COLORS e outras constantes
│   ├── index.tsx                 # Entry point React
│   ├── index.css                 # Estilos globais
│   ├── context/
│   │   └── AuthContext.tsx       # Contexto global: user, academy, login/logout
│   ├── hooks/
│   │   └── useTheme.ts           # Aplica classe dark/tema no <html>
│   ├── services/
│   │   ├── api.ts                # Camada HTTP → API backend (fetch + JWT)
│   │   ├── storage.ts            # Camada localStorage (cache + módulos sem API)
│   │   ├── graduation.ts         # Lógica de graduação/faixas (cálculo de prontidão)
│   │   ├── cep.ts                # Consulta ViaCEP (API pública)
│   │   └── translations.ts       # Internacionalização (pt/en/es)
│   ├── components/
│   │   ├── common/
│   │   │   ├── BeltBadge.tsx     # Badge visual da faixa do aluno
│   │   │   └── Input.tsx         # Input reutilizável
│   │   ├── dashboard/
│   │   │   ├── DashboardComponents.tsx  # StatCard, DetailItem
│   │   │   └── PendingUserModal.tsx     # Modal de aprovação de usuários pendentes
│   │   ├── layout/
│   │   │   ├── Layout.tsx        # Shell principal (Sidebar + BottomNav + tag de versão QAS)
│   │   │   ├── Sidebar.tsx       # Navegação lateral (desktop)
│   │   │   └── BottomNav.tsx     # Navegação inferior (mobile)
│   │   └── PrivacyValue.tsx      # Mascara valores financeiros sensíveis
│   └── views/
│       ├── auth/
│       │   ├── AuthComponents.tsx
│       │   ├── AuthLayout.tsx
│       │   ├── ForgotPassword.tsx
│       │   ├── LoginForm.tsx
│       │   ├── SignupAcademy.tsx
│       │   ├── SignupChoice.tsx
│       │   └── SignupStudent.tsx
│       ├── DashboardView.tsx     # Dashboard com KPIs, gráficos, pendências
│       ├── StudentsView.tsx      # Gestão de alunos (lista, busca, CRUD)
│       ├── StudentProfileView.tsx # Perfil do aluno (visão do próprio aluno)
│       ├── InstructorsView.tsx   # Gestão de instrutores
│       ├── AttendanceView.tsx    # Chamada/frequência de aulas
│       ├── TemplateView.tsx      # Templates de aula (schedules + alunos)
│       ├── SchedulesView.tsx     # Calendário de horários de aulas
│       ├── CalendarView.tsx      # Calendário de eventos/feriados
│       ├── FinancesView.tsx      # Módulo financeiro (receitas/despesas)
│       ├── ReportsView.tsx       # Relatórios PDF de frequência e alunos
│       ├── KimonoView.tsx        # Controle de empréstimo de kimonos
│       ├── ChatView.tsx          # Mural interno da equipe
│       ├── RecycleBinView.tsx    # Lixeira de alunos/instrutores/templates
│       ├── SettingsView.tsx      # Configurações da academia
│       ├── PaymentView.tsx       # Tela de pagamento (visão do aluno)
│       ├── OnboardingView.tsx    # Onboarding inicial
│       ├── LoginView.tsx         # Wrapper de autenticação
│       └── TemplateView.tsx
│
├── _audit/                       # Relatórios de auditoria (este arquivo)
├── dist/                         # Build do frontend (gerado por `npm run build`)
├── migrated_prompt_history/      # Histórico de prompts (desenvolvimento com AI Studio)
├── scratch/                      # Scripts avulsos
├── Dockerfile                    # Build frontend + nginx
├── docker-compose.yml            # Orquestração frontend + API + rede
├── nginx.conf                    # Proxy reverso para /api → nexdojo-api:3005
├── vite.config.ts                # Config Vite: porta 3002, proxy /api → :3005
├── deploy_qas.ps1                # Script PowerShell de deploy QAS
├── REGRAS.md                     # Regras do projeto para o agente
├── CLAUDE.md                     # Instrução de leitura do REGRAS.md
├── EXECUTION_PLAN.md             # Este plano de auditoria
├── IMPLEMENTATION_PLAN.md        # Plano de implementação original
└── SCOPE_AND_USE_CASES.md        # Casos de uso e escopo do sistema
```

---

## 3. Modelo de Dados (Diagrama Lógico)

```
Academy
  ├── id (PK, UUID)
  ├── name, ownerName, email, phone
  ├── cep, address, addressNumber
  ├── logo (LongText — Base64)
  ├── pixKey, pixType, bankName, bankAgency, bankAccount
  └── createdAt, updatedAt

User
  ├── id (PK, UUID)
  ├── email (UNIQUE)
  ├── password (bcrypt hash)
  ├── name, role, status
  ├── academyId (FK → Academy, nullable — superuser não tem academia)
  └── createdAt, updatedAt

Student
  ├── id (PK, UUID)
  ├── name, email, phone, birthDate (String!), gender
  ├── bloodType, weight, height
  ├── emergencyContact, emergencyPhone
  ├── cep, address, addressNumber
  ├── guardian* (nome, phone, cpf, relation, email)
  ├── belt (String, default "WHITE"), stripes (Int)
  ├── status (Pending/Active/Inactive), joinDate
  ├── totalClasses, totalHours, absentCount (contadores desnormalizados)
  ├── hasLoanedKimono (Boolean)
  ├── photo (LongText — Base64)
  ├── academyId (FK → Academy)
  └── → AttendanceRecord[], KimonoLoan[], FinanceTransaction[], GraduationHistory[]

GraduationHistory
  ├── id (PK)
  ├── studentId (FK → Student, CASCADE DELETE)
  ├── previousBelt, newBelt, previousStripes, newStripes
  ├── date, notes
  └── (sem rota de API exposta — apenas escrita interna?)

Instructor
  ├── id, academyId (FK → Academy)
  ├── name, email, phone, birthDate, gender, maritalStatus
  ├── belt, stripes, status, joinDate, specialties
  ├── lastGraduationDate, medicalNotes, photo
  └── (sem relação explícita com ClassSession.instructorId)

Staff
  ├── id, academyId (FK → Academy)
  ├── name, email, phone, birthDate, gender
  ├── cep, address, status, joinDate, position, medicalNotes, photo
  └── (sem relacionamentos filhos)

ClassTemplate
  ├── id, academyId (FK → Academy)
  ├── name, durationMinutes, absenceLimit
  ├── schedules (Text — JSON: [{dayOfWeek, startTime, endTime}])
  ├── assignedStudentIds (LongText — JSON: [studentId, ...])
  └── → ClassSession[]

ClassSession
  ├── id, academyId (FK → Academy)
  ├── templateId (FK → ClassTemplate, nullable)
  ├── name, date, durationMinutes
  ├── instructorId (String — SEM FK para Instructor!)
  ├── status (In Progress / Finalized)
  └── → AttendanceRecord[]

AttendanceRecord
  ├── id, academyId (FK → Academy)
  ├── studentId (FK → Student)
  ├── classId (FK → ClassSession)
  ├── date, durationMinutes, kimonoTaken
  └── (sem FK para Instructor)

KimonoLoan
  ├── id, academyId (FK → Academy)
  ├── studentId (FK → Student)
  ├── borrowedAt, returnedAt, status (Active/Returned)
  └── (SEM ROTA DE API — gerenciado só por localStorage)

FinanceTransaction
  ├── id, academyId (FK → Academy)
  ├── studentId (FK → Student, nullable)
  ├── description, amount, type (income/expense)
  ├── category, date, paymentMethod
  └── status (paid/pending)

ChatMessage
  ├── id, academyId (FK → Academy)
  ├── senderId, senderName, senderRole
  ├── content, timestamp
  └── (modelo existe no banco mas ChatView usa APENAS localStorage)

CalendarEvent
  ├── id, academyId (FK → Academy)
  ├── date, reason, type (no-class/event)
  └── (modelo existe no banco mas CalendarView usa APENAS localStorage)
```

### Entidades presentes no frontend mas AUSENTES no banco
| Entidade (types.ts) | Status no banco |
|---|---|
| `RecycleBinItem` | Apenas localStorage |
| `SystemPlan` / `SystemConfig` | Apenas localStorage |
| `AcademyPlan` (planos mensalidade academia) | Apenas localStorage |

---

## 4. Rotas da Aplicação

### Frontend (React Router)
| Rota | View | Roles permitidos |
|---|---|---|
| `/login` | LoginView | — |
| `/cadastro` | LoginView | — |
| `/cadastro/academia` | LoginView (SignupAcademy) | — |
| `/cadastro/aluno` | LoginView (SignupStudent) | — |
| `/esqueci-senha` | LoginView (ForgotPassword) | — |
| `/` | DashboardView | todos |
| `/students` | StudentsView | superuser, admin, instructor, staff |
| `/instructors` | InstructorsView | superuser, admin |
| `/attendance` | AttendanceView | superuser, admin, instructor |
| `/templates` | TemplateView | superuser, admin, instructor |
| `/schedules` | SchedulesView | todos |
| `/finances` | FinancesView | superuser, admin |
| `/reports` | ReportsView | superuser, admin |
| `/kimonos` | KimonoView | superuser, admin, staff |
| `/calendar` | CalendarView | todos (requer academia selecionada) |
| `/chat` | ChatView | todos (requer academia selecionada) |
| `/recycle-bin` | RecycleBinView | superuser, admin |
| `/settings` | SettingsView | todos (requer academia selecionada) |
| `/profile` | StudentProfileView | student |
| `/pay` | PaymentView | student |

### Backend (Express API)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Login JWT |
| POST | `/api/auth/register-academy` | Cadastro de academia + admin |
| POST | `/api/auth/register-student` | Auto-cadastro de aluno (status Pending) |
| GET | `/api/academies` | Lista todas (somente superuser) |
| GET | `/api/academies/:id` | Detalhe da academia |
| PUT | `/api/academies/:id` | Atualiza academia |
| GET | `/api/academies/:id/users` | Lista usuários da academia |
| PUT | `/api/academies/:id/users/:userId/status` | Aprova/rejeita usuário |
| GET/POST/PUT/DELETE | `/api/students` | CRUD de alunos |
| GET/POST/PUT/DELETE | `/api/instructors` | CRUD de instrutores |
| GET/POST/PUT/DELETE | `/api/staff` | CRUD de staff |
| GET/POST/PUT/DELETE | `/api/templates` | CRUD de templates de aula |
| GET/POST | `/api/classes` | Lista e cria sessões de aula |
| GET | `/api/attendance` | Lista registros de presença |
| POST | `/api/attendance/bulk` | Salva chamada em lote + atualiza contadores |
| GET/POST/DELETE | `/api/finances` | CRUD financeiro |
| GET | `/health` | Health check com teste de conexão DB |

---

## 5. Roles e Permissões

| Role | Descrição | Permissões principais |
|---|---|---|
| `superuser` | Gestor master do sistema | Acesso a todas as academias; pode mudar de academia |
| `admin` | Dono/gestor da academia | Acesso completo à sua academia |
| `instructor` | Professor | Alunos, chamada, templates |
| `staff` | Funcionário | Alunos (leitura), kimonos |
| `student` | Aluno | Próprio perfil, agendas, chat, pagamento |

---

## 6. Fluxos de Negócio Mapeados

### 6.1 Cadastro e Matrícula de Aluno
**Fluxo 1 — Auto-cadastro pelo aluno:**
1. Aluno acessa `/cadastro/aluno`, preenche nome/email/senha/academyId
2. POST `/api/auth/register-student` → cria `Student` (status: Pending) + `User` (status: Pending)
3. Admin vê pendências no Dashboard → modal de aprovação → PUT `/api/academies/:id/users/:userId/status`
4. Aluno pode logar após aprovação

**Fluxo 2 — Cadastro pelo admin:**
1. Admin acessa `/students` → clica em adicionar → preenche formulário completo
2. POST `/api/students` → cria `Student` (status escolhido pelo admin)
3. Não cria `User` automaticamente (aluno sem acesso ao sistema)

### 6.2 Gestão de Planos e Mensalidades
- Admin define planos da academia em `/settings` (armazenados **apenas em localStorage**)
- Mensalidades são lançadas manualmente em `/finances` como `FinanceTransaction`
- Não há automação de cobrança, geração de boleto ou integração de pagamento
- Não há vínculo automático entre vencimento do plano do aluno e geração de cobrança

### 6.3 Agendamento e Controle de Aulas
1. Admin/instrutor cria `ClassTemplate` em `/templates` (nome, duração, horários, alunos vinculados)
2. Para registrar chamada em `/attendance`: seleciona template → sistema cria `ClassSession` → marca presença dos alunos
3. POST `/api/attendance/bulk` cria `AttendanceRecord` para cada aluno e incrementa `totalClasses`/`totalHours` no `Student`
4. `/schedules` exibe a visão de calendário semanal dos templates

### 6.4 Registro de Graduações/Faixas
- Feito dentro de `StudentsView` (botão de graduar no perfil do aluno)
- Lógica de elegibilidade calculada em `graduation.ts` (baseada em `totalClasses`)
- Atualiza `belt`, `stripes`, `lastGraduationDate` no aluno via PUT `/api/students/:id`
- **Não há rota específica para `GraduationHistory`** — o histórico aparece no schema mas não tem CRUD exposto

### 6.5 Gestão de Professores e Horários
- CRUD de instrutores em `/instructors` (POST/PUT/DELETE `/api/instructors`)
- Instrutores são selecionados por nome (não por FK) ao criar sessão de aula
- Não há gestão de disponibilidade/horários de instrutores além dos templates

### 6.6 Relatórios e Dashboards
- `DashboardView`: KPIs (total alunos, frequência, financeiro resumido), gráficos pie/area, pendências
- `ReportsView`: relatórios imprimíveis/PDF usando html2canvas+jsPDF
- Ambos leem dados **do localStorage** como fonte primária (não da API diretamente)

---

## 7. Integrações Externas

| Integração | Como é usada | Modo |
|---|---|---|
| **@google/genai** | Instalado no package.json (`^1.51.0`), **não há nenhum import/uso no código-fonte** | Não ativo |
| **GEMINI_API_KEY** | Definida no vite.config.ts como `process.env.API_KEY` e `process.env.GEMINI_API_KEY`, **não consumida em nenhuma view ou serviço** | Não ativa |
| **ViaCEP** | `src/services/cep.ts` consulta `viacep.com.br` para autocompletar endereço | Client-side |
| **html2canvas** | Captura DOM para gerar PNG em ReportsView e FinancesView | Client-side |
| **jsPDF** | Gera PDF a partir do PNG capturado | Client-side |

---

## 8. Arquitetura de Persistência — Dual Layer (Ponto Crítico)

O sistema opera com **duas fontes de verdade simultâneas**:

| Módulo | Fonte de dados | Observação |
|---|---|---|
| Alunos | API MySQL | Funcional |
| Instrutores | API MySQL | Funcional |
| Staff | API MySQL | Funcional |
| Templates | API MySQL | Funcional |
| Aulas/Sessões | API MySQL | Funcional |
| Frequência | API MySQL | Funcional |
| Financeiro | API MySQL | Funcional |
| **Chat (Mural)** | **Somente localStorage** | Schema existe no banco, sem rota |
| **Calendário de eventos** | **Somente localStorage** | Schema existe no banco, sem rota |
| **Empréstimos de Kimono** | **Misto** | Schema no banco, tela ainda usa localStorage |
| **Lixeira** | **Somente localStorage** | Sem tabela no banco |
| **Planos do sistema** | **Somente localStorage** | Sem tabela no banco |
| **Planos da academia** | **Somente localStorage** | Sem tabela no banco |

**Implicação:** dados do Chat, Calendário e Lixeira são perdidos se o usuário limpar o browser ou trocar de dispositivo.

---

## 9. Deploy e Infraestrutura

```
Servidor QAS: 162.240.167.149
├── Container nexdojo-qas (porta 3003 → nginx:80)
│   ├── Serve React SPA (/usr/share/nginx/html)
│   └── Proxy /api → nexdojo-api:3005
└── Container nexdojo-api (porta 3005)
    ├── Node.js + Express + Prisma
    └── MySQL externo: 162.240.167.149:3306 (qasnexdojo_qas)
```

Deploy: `git pull origin main && docker compose up -d --build`
Script automatizado: `deploy_qas.ps1`

---

## 10. Observações Relevantes Encontradas Durante Mapeamento

1. **JWT secret hardcoded**: `'nexdojo_secret_2026'` como fallback em `auth.ts` e `auth middleware` — se `JWT_SECRET` não for definido no env, o fallback é usado. No `docker-compose.yml` está definido como `nexdojo_super_secret_jwt_key_2026`.

2. **Credenciais no docker-compose.yml**: `DATABASE_URL` e `JWT_SECRET` estão em texto claro no `docker-compose.yml` (sem uso de Docker secrets ou `.env` separado).

3. **birthDate como String**: O campo `birthDate` no modelo `Student` é `String?` em vez de `DateTime`. Cálculos de idade (`calculateAge`) dependem de `new Date(birthDate)` sem validação de formato.

4. **ClassSession.instructorId sem FK**: Não há foreign key entre `ClassSession.instructorId` e `Instructor.id` no Prisma. Deletar um instrutor não invalida as sessões criadas por ele.

5. **Contadores desnormalizados**: `totalClasses`, `totalHours`, `absentCount` no `Student` são incrementados na rota bulk de attendance. Não há recalculo a partir da tabela `AttendanceRecord` — se um registro for deletado os contadores ficam errados.

6. **GraduationHistory sem rota API**: O modelo `GraduationHistory` existe no schema, mas não há rota REST para criação/leitura. O histórico salvo no banco é inacessível pela aplicação.

7. **Password em texto claro (legado)**: `auth.ts:24` tem lógica para aceitar senhas sem hash (`if (!user.password.startsWith('$2'))`), indicando que havia senhas plaintext no banco durante migração.

8. **`any` generalizado na API**: Todas as rotas usam `req.body` como `any` e `ApiService` retorna `any[]` / `any` em todas as chamadas — sem validação de schema no backend.

9. **Rota PUT `/api/academies/:id` sem autorização de ownership**: qualquer usuário autenticado pode alterar qualquer academia pelo ID — não há checagem de `academyId === req.params.id`.

10. **`@google/genai` instalado mas não usado**: a dependência está no `package.json` e a chave API configurada no `vite.config.ts`, mas não há nenhuma integração ativa no código. Possível funcionalidade planejada mas não implementada.
