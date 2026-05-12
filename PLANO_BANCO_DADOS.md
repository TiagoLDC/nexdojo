# Plano de Implementação — Banco de Dados NexDojo

> **Objetivo:** Substituir completamente o sistema de mock data (MSW + in-memory) por um backend real Node.js/Express conectado ao MySQL.  
> **Banco:** `qasnexdojo_qas` em `162.240.167.149:3306`  
> **API:** Porta `3005` (local) | Porta `3003` do Docker no QAS  

---

## Status Geral

| Fase | Nome | Status |
|------|------|--------|
| 1 | Backend: Estrutura e servidor Express | ⬜ Pendente |
| 2 | Banco: Schema MySQL (drop + create) | ⬜ Pendente |
| 3 | Banco: Seed com dados mockados | ⬜ Pendente |
| 4 | API: Rotas de autenticação | ⬜ Pendente |
| 5 | API: Rotas CRUD — Students, Instructors, Staff | ⬜ Pendente |
| 6 | API: Rotas CRUD — Templates, Attendance, Finances | ⬜ Pendente |
| 7 | API: Rotas CRUD — Calendar, Chat, Inventory, Academies, Recycle Bin | ⬜ Pendente |
| 8 | Frontend: Desligar MSW e remover mocks | ⬜ Pendente |

---

## Fase 1 — Backend: Estrutura e Servidor Express

### Objetivo
Criar a pasta `api/` com estrutura organizada, instalar dependências e configurar o servidor Express pronto para receber rotas.

### Estrutura de pastas a criar
```
api/
├── src/
│   ├── server.ts          # Entry point
│   ├── db.ts              # Pool de conexão MySQL
│   ├── middleware/
│   │   ├── auth.ts        # Middleware JWT
│   │   └── errorHandler.ts
│   └── routes/
│       ├── index.ts       # Agregador de rotas
│       ├── auth.ts
│       ├── students.ts
│       ├── instructors.ts
│       ├── staff.ts
│       ├── templates.ts
│       ├── attendance.ts
│       ├── finances.ts
│       ├── calendar.ts
│       ├── chat.ts
│       ├── inventory.ts
│       ├── academies.ts
│       └── recycleBin.ts
├── package.json
├── tsconfig.json
└── .env                   # NÃO commitado
```

### Dependências a instalar
```bash
cd api
npm init -y
npm install express mysql2 bcrypt jsonwebtoken cors dotenv
npm install -D typescript ts-node-dev @types/express @types/node @types/bcrypt @types/jsonwebtoken @types/cors
```

### Arquivo `.env` da API
```env
PORT=3005
DATABASE_URL=mysql://qasnexdojo_qas:yFkL8OvxPnr3@162.240.167.149:3306/qasnexdojo_qas
DB_HOST=162.240.167.149
DB_PORT=3306
DB_USER=qasnexdojo_qas
DB_PASSWORD=yFkL8OvxPnr3
DB_NAME=qasnexdojo_qas
JWT_SECRET=nexdojo_jwt_secret_2026
```

### Scripts `package.json` da API
```json
"scripts": {
  "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js"
}
```

### Atualizar `package.json` raiz — script `dev:all`
O script concurrently já deve rodar `api` junto com o frontend. Verificar `package.json` raiz e ajustar se necessário para `npm run dev --prefix api` ou `cd api && npm run dev`.

---

## Fase 2 — Banco: Schema MySQL

### Objetivo
Apagar todas as tabelas existentes no banco `qasnexdojo_qas` e recriar com o schema completo.

### Ordem de criação (respeitar FK)
1. `academies`
2. `academy_plans`
3. `users`
4. `students`
5. `student_documents`
6. `graduation_history`
7. `instructors`
8. `staff`
9. `class_templates`
10. `class_template_schedules`
11. `class_template_assigned_students`
12. `class_sessions`
13. `attendance_records`
14. `finance_transactions`
15. `calendar_events`
16. `chat_messages`
17. `products`
18. `recycle_bin`

### DDL Completo

```sql
-- Limpar banco
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS recycle_bin;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS calendar_events;
DROP TABLE IF EXISTS finance_transactions;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS class_sessions;
DROP TABLE IF EXISTS class_template_assigned_students;
DROP TABLE IF EXISTS class_template_schedules;
DROP TABLE IF EXISTS class_templates;
DROP TABLE IF EXISTS graduation_history;
DROP TABLE IF EXISTS student_documents;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS instructors;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS academy_plans;
DROP TABLE IF EXISTS academies;
SET FOREIGN_KEY_CHECKS = 1;

-- Academias
CREATE TABLE academies (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  alias VARCHAR(100) UNIQUE,
  logo LONGTEXT,
  owner_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  cep VARCHAR(10),
  address VARCHAR(255),
  address_number VARCHAR(20),
  absence_limit INT DEFAULT 3,
  pix_key VARCHAR(255),
  pix_type ENUM('CPF','CNPJ','E-mail','Telefone','Aleatória'),
  bank_name VARCHAR(100),
  bank_agency VARCHAR(20),
  bank_account VARCHAR(30),
  current_plan ENUM('Free','Silver','Gold','Black Belt') DEFAULT 'Free',
  plan_status ENUM('Active','Expired','Trial','Suspended','Canceled') DEFAULT 'Trial',
  plan_expiration_date DATE,
  payment_warning_days INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Planos da academia
CREATE TABLE academy_plans (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  duration_months INT NOT NULL,
  classes_per_week INT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
);

-- Usuários do sistema
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36),
  role ENUM('superuser','admin','instructor','staff','student','guest') NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('Active','Pending','Blocked') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE SET NULL
);

-- Alunos
CREATE TABLE students (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  belt ENUM('Branca','Cinza','Amarela','Laranja','Verde','Azul','Roxa','Marrom','Preta','Coral','Vermelha') DEFAULT 'Branca',
  stripes TINYINT DEFAULT 0,
  birth_date DATE,
  gender ENUM('Masculino','Feminino','Outro'),
  photo LONGTEXT,
  cpf VARCHAR(14),
  rg VARCHAR(20),
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  blood_type VARCHAR(5),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(20),
  cep VARCHAR(10),
  address VARCHAR(255),
  address_number VARCHAR(20),
  guardian_name VARCHAR(255),
  guardian_phone VARCHAR(20),
  guardian_email VARCHAR(255),
  guardian_cpf VARCHAR(14),
  guardian_rg VARCHAR(20),
  guardian_relation VARCHAR(100),
  guardian_profession VARCHAR(100),
  medical_notes TEXT,
  total_classes INT DEFAULT 0,
  total_hours INT DEFAULT 0,
  last_attendance DATE,
  absent_count INT DEFAULT 0,
  status ENUM('Active','Inactive','Dropped','Pending') DEFAULT 'Active',
  join_date DATE,
  last_graduation_date DATE,
  plan_id VARCHAR(36),
  next_payment_date DATE,
  absence_limit INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES academy_plans(id) ON DELETE SET NULL
);

-- Documentos dos alunos
CREATE TABLE student_documents (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  name VARCHAR(255),
  url LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Histórico de graduações
CREATE TABLE graduation_history (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  previous_belt VARCHAR(50),
  new_belt VARCHAR(50),
  previous_stripes TINYINT,
  new_stripes TINYINT,
  date DATE,
  instructor_id VARCHAR(36),
  notes TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Instrutores
CREATE TABLE instructors (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  belt ENUM('Branca','Cinza','Amarela','Laranja','Verde','Azul','Roxa','Marrom','Preta','Coral','Vermelha') DEFAULT 'Branca',
  stripes TINYINT DEFAULT 0,
  birth_date DATE,
  gender ENUM('Masculino','Feminino','Outro'),
  photo LONGTEXT,
  cpf VARCHAR(14),
  rg VARCHAR(20),
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  blood_type VARCHAR(5),
  marital_status VARCHAR(50),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(20),
  cep VARCHAR(10),
  address VARCHAR(255),
  address_number VARCHAR(20),
  specialties TEXT,
  medical_notes TEXT,
  status ENUM('Active','Inactive','Dropped','Pending') DEFAULT 'Active',
  join_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
);

-- Staff
CREATE TABLE staff (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  photo LONGTEXT,
  birth_date DATE,
  gender ENUM('Masculino','Feminino','Outro'),
  position VARCHAR(100),
  cpf VARCHAR(14),
  rg VARCHAR(20),
  cep VARCHAR(10),
  address VARCHAR(255),
  address_number VARCHAR(20),
  medical_notes TEXT,
  status ENUM('Active','Inactive','Dropped','Pending') DEFAULT 'Active',
  join_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
);

-- Templates de aula
CREATE TABLE class_templates (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  duration_minutes INT NOT NULL,
  absence_limit INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
);

-- Horários dos templates
CREATE TABLE class_template_schedules (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '0=Dom,1=Seg,...,6=Sab',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  FOREIGN KEY (template_id) REFERENCES class_templates(id) ON DELETE CASCADE
);

-- Alunos atribuídos a templates
CREATE TABLE class_template_assigned_students (
  template_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (template_id, student_id),
  FOREIGN KEY (template_id) REFERENCES class_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Sessões de aula
CREATE TABLE class_sessions (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36) NOT NULL,
  name VARCHAR(255),
  template_id VARCHAR(36),
  date DATE NOT NULL,
  duration_minutes INT,
  instructor_id VARCHAR(36),
  status ENUM('In Progress','Finalized') DEFAULT 'In Progress',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES class_templates(id) ON DELETE SET NULL
);

-- Presenças
CREATE TABLE attendance_records (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  class_id VARCHAR(36),
  date DATE NOT NULL,
  duration_minutes INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES class_sessions(id) ON DELETE SET NULL
);

-- Transações financeiras
CREATE TABLE finance_transactions (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type ENUM('income','expense') NOT NULL,
  category VARCHAR(100),
  date DATE NOT NULL,
  payment_method VARCHAR(100),
  status ENUM('paid','pending') DEFAULT 'paid',
  student_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);

-- Eventos do calendário
CREATE TABLE calendar_events (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  reason VARCHAR(255),
  type ENUM('no-class','event') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
);

-- Chat
CREATE TABLE chat_messages (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36) NOT NULL,
  sender_id VARCHAR(36) NOT NULL,
  sender_name VARCHAR(255),
  sender_role ENUM('admin','instructor','staff') NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
);

-- Produtos (inventário)
CREATE TABLE products (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  category VARCHAR(100),
  image LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
);

-- Lixeira
CREATE TABLE recycle_bin (
  id VARCHAR(36) PRIMARY KEY,
  academy_id VARCHAR(36) NOT NULL,
  type ENUM('student','instructor','template') NOT NULL,
  original_data LONGTEXT NOT NULL COMMENT 'JSON serializado',
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
);
```

---

## Fase 3 — Banco: Seed com Dados Mockados

### Objetivo
Inserir todas as 3 academias com seus dados completos no banco de dados real.

### Fonte dos dados
- `services/mockData.ts` — dados legados (referência)
- `src/lib/msw/seed.ts` — dados mais completos e atuais (**usar este como fonte principal**)

### O que inserir
Para cada uma das 3 academias (`mock_acad_1` NexFight, `mock_acad_2` Samurai BJJ, `mock_acad_3` Dragão Fight):
- Academia e seus planos
- Usuários (admin, instructor, staff, student) com senhas hasheadas via bcrypt
- Alunos com todos os campos
- Instrutores
- Staff
- Templates de aula + horários + alunos atribuídos
- Sessões de aula
- Registros de presença
- Transações financeiras
- Eventos de calendário
- Mensagens de chat
- Produtos

### Estratégia de execução
Criar script `api/src/scripts/seed.ts` que:
1. Lê os dados de `src/lib/msw/seed.ts` (importando como módulo)
2. Executa o DDL de drop + create (Fase 2)
3. Insere todos os dados com bcrypt nas senhas

---

## Fase 4 — API: Autenticação

### Endpoints
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Email + password → JWT |
| POST | `/api/auth/logout` | Invalida token (stateless: apenas 200 OK) |
| GET | `/api/auth/me` | Retorna usuário autenticado via token |

### Detalhes
- JWT com payload: `{ userId, academyId, role }`
- Expiração do token: 7 dias
- Middleware `auth.ts` verifica Bearer token em todas as rotas protegidas

---

## Fase 5 — API: Students, Instructors, Staff

### Students
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/students` | Lista com filtros: academyId, search, belt, status + paginação |
| GET | `/api/students/:id` | Detalhes |
| POST | `/api/students` | Criar (cria user se email informado) |
| PUT | `/api/students/:id` | Atualizar |
| DELETE | `/api/students/:id` | Move para recycle_bin |
| POST | `/api/students/:id/graduate` | Atualiza belt/stripes, insere graduation_history |
| POST | `/api/students/:id/documents` | Adiciona documento |
| DELETE | `/api/students/:id/documents/:docId` | Remove documento |

### Instructors
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/instructors` | Lista com academyId |
| GET | `/api/instructors/:id` | Detalhes |
| POST | `/api/instructors` | Criar |
| PUT | `/api/instructors/:id` | Atualizar |
| DELETE | `/api/instructors/:id` | Move para recycle_bin |

### Staff
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/staff` | Lista com academyId |
| GET | `/api/staff/:id` | Detalhes |
| POST | `/api/staff` | Criar |
| PUT | `/api/staff/:id` | Atualizar |
| DELETE | `/api/staff/:id` | Move para recycle_bin |

---

## Fase 6 — API: Templates, Attendance, Finances

### Class Templates
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/templates` | Lista com academyId |
| POST | `/api/templates` | Criar (com schedules e assignedStudentIds) |
| PUT | `/api/templates/:id` | Atualizar |
| DELETE | `/api/templates/:id` | Move para recycle_bin |

### Attendance
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/attendance` | Lista com academyId, classId, studentId |
| POST | `/api/attendance` | Registrar presença (atualiza total_classes no student) |
| GET | `/api/sessions` | Lista sessões de aula |
| POST | `/api/sessions` | Criar sessão |
| PUT | `/api/sessions/:id` | Atualizar sessão (status, instructorId) |

### Finances
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/transactions` | Lista com academyId, type, status, dateFrom, dateTo |
| POST | `/api/transactions` | Criar transação |
| PUT | `/api/transactions/:id` | Atualizar |
| DELETE | `/api/transactions/:id` | Deletar |

---

## Fase 7 — API: Calendar, Chat, Inventory, Academies, Recycle Bin

### Calendar
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/calendar` | Lista eventos com academyId |
| POST | `/api/calendar` | Criar evento |
| PUT | `/api/calendar/:id` | Atualizar |
| DELETE | `/api/calendar/:id` | Deletar |

### Chat
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/chat` | Lista mensagens com academyId |
| POST | `/api/chat` | Enviar mensagem |

### Inventory
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/products` | Lista com academyId |
| POST | `/api/products` | Criar |
| PUT | `/api/products/:id` | Atualizar |
| DELETE | `/api/products/:id` | Deletar |

### Academies
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/academies` | Lista (superuser) ou própria (admin) |
| GET | `/api/academies/:id` | Detalhes |
| PUT | `/api/academies/:id` | Atualizar configurações |
| GET | `/api/academies/by-alias/:alias` | Buscar por alias (login direto) |

### Recycle Bin
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/recycle-bin` | Lista com academyId |
| POST | `/api/recycle-bin/:id/restore` | Restaurar item |
| DELETE | `/api/recycle-bin/:id` | Deletar permanentemente |

---

## Fase 8 — Frontend: Desligar MSW e Remover Mocks

### Objetivo
Remover toda dependência de mock do frontend, sem fallbacks.

### Arquivos a alterar

#### `.env`
```env
VITE_API_URL=http://localhost:3005/api
VITE_ENABLE_MSW=false
```

#### `src/lib/msw/` — deletar ou esvaziar
- Remover inicialização do MSW worker de `main.tsx` / `App.tsx`
- Remover import do MSW se não for mais usado em nenhum lugar

#### `services/mockData.ts`
- Deletar o arquivo

#### `src/lib/msw/seed.ts` e `src/lib/msw/db.ts`
- Deletar os arquivos (dados já foram para o banco)

#### `src/lib/msw/handlers/`
- Deletar a pasta inteira (substituída pelas rotas reais)

#### Verificar todos os arquivos de serviço em `src/features/*/services/`
- Garantir que usam o cliente Axios (`src/lib/api.ts`) apontando para `VITE_API_URL`
- Remover qualquer import direto de `mockData`, `seed`, `db`

#### `src/lib/api.ts`
- Garantir que não há lógica de fallback para mock

### Verificação final
- Login funciona com email/senha do banco
- CRUD de alunos persiste entre reloads
- Sem `console.log` com dados mockados
- `VITE_ENABLE_MSW=false` em `.env` e em `.env.production`

---

## Notas Técnicas

### Padrão de ID
Usar `uuid` do Node.js (`crypto.randomUUID()`) para gerar IDs — sem dependência externa.

### Senhas no seed
As senhas do seed (`src/lib/msw/seed.ts` exporta `SEED_PASSWORDS`) devem ser hasheadas com bcrypt antes de inserir.

### Paginação padrão
Retornar no formato:
```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

### Tratamento de erros
Padrão de resposta de erro:
```json
{ "error": "Mensagem descritiva" }
```
Status HTTP: 400 (validação), 401 (não autenticado), 403 (sem permissão), 404 (não encontrado), 500 (erro interno).

### CORS
Origem permitida: `http://localhost:3002` (dev) e domínio de produção.

---

*Criado em: 12/05/2026*
