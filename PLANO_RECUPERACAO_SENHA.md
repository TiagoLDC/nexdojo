# Plano de Implementação — Recuperação de Senha via E-mail

**Data:** 21/05/2026  
**Status:** Em planejamento

---

## Visão Geral

Implementar recuperação de senha por e-mail com link temporário (30 min), precedida pela criação de uma página de **Configurações Gerais do Sistema** (exclusiva para `superuser`) onde serão cadastradas as credenciais SMTP usadas para o envio.

---

## Etapas

---

### ETAPA 1 — Tabela de Configurações do Sistema

**Arquivo:** `api/src/scripts/migrate.ts`

Criar tabela `system_config` com estrutura chave-valor, sem vínculo com academia (configuração global do sistema, não por academia):

```sql
CREATE TABLE system_config (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

Chaves iniciais a inserir no seed:
- `smtp_host`
- `smtp_port`
- `smtp_user`
- `smtp_pass`
- `smtp_from_name`
- `smtp_from_email`
- `smtp_secure` (true/false — TLS)

**Por que chave-valor e não colunas fixas?** Flexibilidade para adicionar novas configurações no futuro sem nova migração.

---

### ETAPA 2 — Tabela de Tokens de Reset

**Arquivo:** `api/src/scripts/migrate.ts`

```sql
CREATE TABLE password_reset_tokens (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,  -- SHA-256 do token, não o token em si
  expires_at DATETIME NOT NULL,
  used       TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```

**Por que armazenar hash?** Se o banco vazar, o token bruto não pode ser usado. O token enviado no e-mail é gerado com `crypto.randomBytes(32)`, e só o `sha256(token)` vai para o banco.

---

### ETAPA 3 — Rotas da API de Configurações do Sistema

**Arquivo novo:** `api/src/routes/systemConfig.ts`

```
GET  /api/system-config        → retorna todas as configs (superuser only)
PUT  /api/system-config        → salva/atualiza batch de configs (superuser only)
POST /api/system-config/smtp/test → envia e-mail de teste para o usuário logado
```

- Ambas as rotas usam `requireAuth + requireRole('superuser')`
- O endpoint de teste envia um e-mail simples para o e-mail do superuser logado e retorna sucesso/erro com a mensagem exata (útil para debug de SMTP)
- Nunca retornar `smtp_pass` no GET — retornar `"*****"` se preenchida, `""` se vazia

Registrar em `api/src/routes/index.ts`:
```typescript
router.use('/system-config', systemConfigRouter);
```

---

### ETAPA 4 — Utilitário de E-mail

**Arquivo novo:** `api/src/utils/mailer.ts`

- Usa `nodemailer` (instalar: `npm install nodemailer` + `npm install -D @types/nodemailer` na pasta `api/`)
- Lê as configs SMTP dinamicamente do banco a cada envio (para refletir mudanças sem restart)
- Exporta função `sendMail({ to, subject, html })` que:
  1. Busca configs do banco
  2. Lança erro descritivo se SMTP não estiver configurado
  3. Cria transporter com as credenciais
  4. Envia e retorna resultado

---

### ETAPA 5 — Rotas de Recuperação de Senha

**Arquivo:** `api/src/routes/auth.ts` (adicionar dois endpoints)

#### `POST /api/auth/forgot-password`
- Body: `{ email }`
- Fluxo:
  1. Busca usuário pelo e-mail na tabela `users` (sem revelar se existe ou não — resposta sempre `200`)
  2. Se encontrado: invalida tokens anteriores do mesmo usuário (`UPDATE ... SET used = 1`)
  3. Gera `token = crypto.randomBytes(32).toString('hex')` (64 chars hex)
  4. Calcula `tokenHash = sha256(token)`
  5. Insere em `password_reset_tokens` com `expires_at = NOW() + 30 minutos`
  6. Monta link: `https://<FRONTEND_URL>/reset-password?token=<token>`
  7. Envia e-mail HTML com o link
  8. Retorna `200 { message: 'Se o e-mail existir, você receberá as instruções.' }`
- Rate limiting: máximo 3 requisições por IP a cada 15 minutos (usar o rate limiter existente ou criar instância separada)

#### `POST /api/auth/reset-password`
- Body: `{ token, newPassword }`
- Fluxo:
  1. Calcula `tokenHash = sha256(token)`
  2. Busca `password_reset_tokens WHERE token_hash = ? AND used = 0 AND expires_at > NOW()`
  3. Se não encontrado: `400 { error: 'Link inválido ou expirado' }`
  4. Valida `newPassword` (mínimo 6 caracteres)
  5. Faz hash da nova senha com `bcrypt`
  6. Atualiza `users SET password_hash = ?`
  7. Marca token como usado: `UPDATE ... SET used = 1`
  8. Retorna `200 { message: 'Senha alterada com sucesso' }`

**Variável de ambiente necessária:** Adicionar `FRONTEND_URL=https://qas.nexdojo.com.br` no `api/.env` (e `.env.example`)

---

### ETAPA 6 — Página de Configurações Gerais (Frontend)

**Arquivos novos:**
- `src/pages/SystemConfigPage.tsx`
- `src/views/SystemConfigView.tsx`

**Acesso:** Apenas `superuser` — adicionar verificação de role na rota e no menu lateral.

**Seções da página:**

#### 6.1 Configurações de SMTP
Campos:
| Campo | Tipo | Placeholder |
|---|---|---|
| Servidor SMTP (host) | text | `smtp.gmail.com` |
| Porta | number | `587` |
| Usuário (login) | text | `seuemail@dominio.com` |
| Senha | password | `••••••••` |
| Nome do remetente | text | `NexDojo` |
| E-mail do remetente | email | `noreply@dominio.com` |
| Usar TLS/SSL | toggle | - |

- Botão **Salvar Configurações**
- Botão **Testar Conexão** — chama `POST /api/system-config/smtp/test` e exibe resultado (sucesso em verde, erro em vermelho com mensagem técnica)
- Campo senha: mostrar `••••••••` se já configurada, com opção de editar

**Serviço frontend:** `src/services/systemConfigService.ts`
```typescript
getAll(): Promise<Record<string, string>>
save(config: Record<string, string>): Promise<void>
testSmtp(): Promise<{ ok: boolean; message: string }>
```

---

### ETAPA 7 — Alterar Tela de Login (Esqueci a Senha)

**Arquivo:** `src/pages/LoginPage.tsx` (ou `LoginView.tsx`)

A tela de "esqueci a senha" já existe estruturalmente. Alterar para:

1. **Tela de solicitação** — campo de e-mail + botão "Enviar link de recuperação"
   - Chama `POST /api/auth/forgot-password`
   - Após resposta (independente de sucesso/erro): exibe mensagem `"Se o e-mail informado estiver cadastrado, você receberá um link de recuperação em instantes."`
   - Não revelar se o e-mail existe ou não (segurança anti-enumeração)

2. **Tela de confirmação** — mostrar instrução para checar a caixa de entrada + link para voltar ao login

---

### ETAPA 8 — Tela de Redefinição de Senha (Rota Pública)

**Arquivo novo:** `src/pages/ResetPasswordPage.tsx`

Rota: `/reset-password?token=<token>`

Fluxo:
1. Ao carregar a página, extrair `token` da URL
2. Exibir formulário com:
   - Campo **Nova senha** (mínimo 6 caracteres, com toggle mostrar/ocultar)
   - Campo **Confirmar nova senha**
   - Botão **Redefinir Senha**
3. Ao submeter: chamar `POST /api/auth/reset-password` com `{ token, newPassword }`
4. **Sucesso:** exibir mensagem de confirmação + botão "Ir para o Login"
5. **Erro (token inválido/expirado):** exibir mensagem `"Este link é inválido ou já expirou. Solicite um novo link de recuperação."` + botão de voltar

Adicionar rota pública no React Router (sem autenticação exigida).

---

### ETAPA 9 — Adicionar no Menu Lateral (Superuser)

**Arquivo:** `src/components/layout/Sidebar.tsx` (ou equivalente)

- Adicionar item "Config. do Sistema" visível apenas para `superuser`
- Ícone sugerido: `Settings2` ou `SlidersHorizontal` (Lucide)
- Posicionar no final do menu, antes de "Configurações" normais

---

## Dependências a Instalar

```bash
# Na pasta api/
npm install nodemailer
npm install -D @types/nodemailer
```

---

## Variáveis de Ambiente

Adicionar em `api/.env` (local) e documentar no `REGRAS.md`:

```env
FRONTEND_URL=http://localhost:3002   # local
# FRONTEND_URL=https://qas.nexdojo.com.br  # QAS
```

---

## Ordem de Execução Sugerida

```
1. Migração do banco (system_config + password_reset_tokens)
2. Utilitário mailer.ts
3. Rotas da API (system-config + forgot/reset-password)
4. Serviço frontend (systemConfigService.ts)
5. Página SystemConfig (frontend)
6. Adicionar no menu (superuser)
7. Alterar LoginPage (forgot-password flow)
8. Criar ResetPasswordPage
```

---

## Pontos de Atenção / Riscos

| Risco | Mitigação |
|---|---|
| SMTP não configurado no momento do reset | Endpoint retorna erro amigável; SystemConfig mostra aviso destacado se SMTP estiver vazio |
| Token bruto interceptado em trânsito | HTTPS obrigatório em QAS; token tem 32 bytes de entropia |
| Enumeração de e-mails cadastrados | Resposta do forgot-password é sempre `200` com mesma mensagem |
| Tokens não expirados acumulando no banco | Limpar tokens expirados no início de cada `forgot-password` (DELETE WHERE expires_at < NOW()) |
| Senha do SMTP exposta em logs | Nunca logar o body completo das rotas de system-config |

---

*Plano criado em 21/05/2026 — aguardando aprovação para início da implementação*
