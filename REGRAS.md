# Regras do Projeto NexDojo

> **CRÍTICO:** Este documento deve ser lido e seguido integralmente em TODOS os chats que envolvam o projeto NexDojo, localizado em `d:\DEV_WEB\nexdojo`.
>
> [!IMPORTANT]
> **NÃO FAÇA TESTES DIRETO NO NAVEGADOR.** Se precisar fazer algum teste que envolva abrir o navegador ou interagir com a interface, **PEÇA AO USUÁRIO!!!!**

---

## 1. Informações Gerais do Projeto

| Campo | Valor |
|---|---|
| **Nome do Projeto** | NexDojo |
| **Caminho Local** | `d:\DEV_WEB\nexdojo` |
| **Stack** | React 19 + TypeScript + Vite + TailwindCSS v4 |
| **Porta Dev** | **3002** (portas 3000 e 3001 ocupadas) |
| **Gerenciador de Pacotes** | npm |

---

## 2. Servidor de Desenvolvimento

- **Sempre** usar a porta `3002` (nunca 3000 ou 3001)
- URL local Frontend: `http://localhost:3002/`
- URL local API: `http://localhost:3005/`
- Configuração Vite: `d:\DEV_WEB\nexdojo\vite.config.ts`

### Subir o projeto localmente (ambos os servidores de uma vez)

> Quando o usuário pedir **"rode o projeto localmente"**, **"sobe o servidor"**, **"inicia o dev"** ou equivalente, execute:

```powershell
cd d:\DEV_WEB\nexdojo
npm run dev:all
```

Ou via script:
```powershell
cd d:\DEV_WEB\nexdojo
.\start-dev.ps1
```

O `npm run dev:all` usa `concurrently` e exibe os logs da API (cyan) e do Frontend (magenta) no mesmo terminal.

### Verificar se já está rodando antes de subir

```powershell
# Checar portas 3002 e 3005
netstat -ano | findstr "3002 3005"
```

Se não retornar nada, os servidores não estão rodando — executar `npm run dev:all`.

---

## 3. Repositório Git

| Campo | Valor |
|---|---|
| **URL do Repositório** | `https://github.com/TiagoLDC/nexdojo` |
| **Branch principal** | `main` |
| **Branch de desenvolvimento** | `main` |

### Regras de Commit
As mensagens de commit devem seguir rigorosamente o formato:
`#<sequencial>-<YYYY-MM-DD> <HH:MM>-<descrição em português>`

**Exemplo:**
`#001-2026-04-28 10:19-atualização de estilos e correção de datas`

---

## 4. Portas Reservadas no Servidor QAS (162.240.167.149)

> **CRÍTICO:** Nunca usar essas portas ao criar novos serviços (ex: backend do nexdojo).

| Porta | Serviço |
|---|---|
| **80** | Apache/cPanel (proxy reverso — porta do sistema) |
| **3001** | tna-frontend-qas (container Docker) |
| **3002** | louvorhub-prod (container Docker) |
| **3003** | **nexdojo-frontend QAS (container Docker)** |
| **3004** | wordtetris-prod (container Docker) |
| **21, 25, 26, 53, 143, 587, 993, 995** | Serviços de sistema (FTP, SMTP, DNS, IMAP, etc.) |
| **2077–2096** | cPanel/WHM |
| **22022** | SSH |

**Padrão de deploy no servidor:** cada serviço roda em um container Docker numa porta exclusiva, e o Apache do cPanel faz proxy reverso via `.htaccess` no `public_html` do domínio (`RewriteRule ^(.*)$ http://127.0.0.1:<PORTA>/$1 [P,L]`).

---

## 5. Servidor Remoto / Deploy

| Campo | Valor |
|---|---|
| **Host / IP** | `162.240.167.149` |
| **Usuário SSH** | `qasnexdojo` |
| **Caminho da Chave SSH** | `(Acesso via senha: @Tmd4738@)` |
| **Porta SSH** | `22022` |
| **Diretório do projeto no servidor** | `/home/qasnexdojo/nexdojo` |

### Comando de Conexão SSH
```bash
ssh -p 22022 qasnexdojo@162.240.167.149
```

### Fluxo Completo de Deploy (quando o usuário pedir "commit, push e deploy")

1. Atualizar a tag de versão em `src/components/layout/AppLayout.tsx`
2. `git add` nos arquivos alterados → `git commit` (padrão da seção 3) → `git push origin main`
3. Criar `deploy_run.py` na raiz, executar `python deploy_run.py`, remover após

> **IMPORTANTE:** O cliente SSH do Windows não suporta senha interativa via linha de comando. O deploy deve ser feito via **Python + paramiko** conforme abaixo.

**Pré-requisito (instalar uma vez):**
```powershell
pip install paramiko --user
```

**Script de deploy** — salvar como `deploy_run.py` na raiz e executar:
```python
import paramiko, sys, re
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('162.240.167.149', port=22022, username='qasnexdojo', password='@Tmd4738@', timeout=30)

stdin, stdout, stderr = client.exec_command(
    'cd /home/qasnexdojo/nexdojo && '
    'git fetch origin && git reset --hard origin/main && '
    'sed -i "s/DB_HOST=.*/DB_HOST=host.docker.internal/" api/.env && '
    # Garante FRONTEND_URL no api/.env (idempotente: atualiza se existir, adiciona se não)
    '(grep -q "^FRONTEND_URL=" api/.env '
    '&& sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://qas.nexdojo.com.br|" api/.env '
    '|| echo "FRONTEND_URL=https://qas.nexdojo.com.br" >> api/.env) && '
    'docker compose down && docker compose up -d --build 2>&1',
    timeout=300
)

output = stdout.read().decode('utf-8', errors='replace')
ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
clean = ansi_escape.sub('', output)

for line in clean.splitlines():
    line = line.strip()
    if line:
        print(line)

exit_code = stdout.channel.recv_exit_status()
client.close()
print(f'\nExit code: {exit_code}')
sys.exit(exit_code)
```

**Como executar pelo agente:**
1. Criar o script acima como `deploy_run.py` na raiz do projeto usando a ferramenta Write
2. Executar via **ferramenta PowerShell**: `cd D:\DEV_WEB\nexdojo; py deploy_run.py` (timeout 360000ms)
   - Usar `py` (Windows Python Launcher) — `python` e `python3` não funcionam nesta máquina
3. Remover o arquivo após o deploy via **ferramenta PowerShell**: `Remove-Item D:\DEV_WEB\nexdojo\deploy_run.py -Force`
   - Usar caminho absoluto e `-Force` — NUNCA usar a ferramenta Bash para este passo (Remove-Item é PowerShell, não bash)

**Decisões técnicas já resolvidas (não alterar sem necessidade):**
- `docker compose down` antes do `up` é obrigatório — evita conflito de porta e rede
- `Dockerfile` usa `npx vite build` (não `npm run build`) — intencional para ignorar erros TS pré-existentes no QAS
- `docker-compose.yml` usa porta `3003:80` — o container nginx escuta na 80 internamente, exposto na 3003 do host
- O `~/public_html/.htaccess` no servidor **já está configurado** com proxy para `localhost:3003` — **não reescrever a cada deploy**, só se a porta mudar
- O Apache do cPanel controla a porta 80 e faz o proxy reverso de `qas.nexdojo.com.br` → `localhost:3003` via `.htaccess`

**Observações:**
- Usar `git fetch + reset --hard` em vez de `git pull` para evitar conflitos de branches divergidas no servidor
- O arquivo `api/.env` **não está no git** — se precisar recriar, usar SFTP via paramiko com o conteúdo do `api/.env` local
- `api/.env` no servidor contém: `PORT=3005`, `DATABASE_URL`, `JWT_SECRET` e `FRONTEND_URL` (sincronizado automaticamente pelo deploy)

---

## 6. Banco de Dados

| Campo | Valor |
|---|---|
| **Tipo** | `MySQL` |
| **Host** | `162.240.167.149` |
| **Porta** | `3306` |
| **Nome do Banco** | `qasnexdojo_qas` |
| **Usuário** | `qasnexdojo_qas` |
| **Senha** | `yFkL8OvxPnr3` |

---

## 7. Variáveis de Ambiente

Arquivo: `d:\DEV_WEB\nexdojo\.env`

```env
# Preencher conforme necessidade do projeto
GEMINI_API_KEY=<!-- PREENCHER -->
# Adicionar outras variáveis aqui
```

---

## 8. Credenciais de Serviços Externos

| Serviço | Usuário / API Key | Observação |
|---|---|---|
| `<!-- PREENCHER -->` | `<!-- PREENCHER -->` | `<!-- PREENCHER -->` |

---

## 9. Regras Obrigatórias para o Agente

1. **Porta local**: NUNCA usar as portas `3000` ou `3001` neste projeto. Sempre `3002` (frontend) e `3005` (API).
2. **Portas no servidor QAS**: Ver seção 4 para a lista completa de portas reservadas. Para novos serviços (ex: backend), usar portas a partir de **3006** em diante (verificar disponibilidade antes).
3. **Diretório**: Todo código do projeto fica em `d:\DEV_WEB\nexdojo`.
4. **Stack**: Não sugerir nem instalar outras bibliotecas de UI sem aprovação explícita do usuário.
5. **Deploy**: Ver seção 5 (deploy via SSH + docker compose no servidor QAS).
6. **Commits**: Seguir o padrão definido na seção 3.
7. **Frequência de Commit**: SÓ realizar commits quando o usuário solicitar explicitamente.
8. **Tag de Versão QAS**: **A CADA ALTERAÇÃO DE CÓDIGO** feita no projeto, você DEVE obrigatoriamente atualizar a etiqueta de versão localizada em `src/components/layout/AppLayout.tsx`, dentro da div com comentário `{/* Version tag */}`. Substitua o texto `VERSÃO QAS DD/MM/AAAA HH:MM:SS` com a data e hora reais do sistema (usar `Get-Date -Format "dd/MM/yyyy HH:mm:ss"` no PowerShell). Deve existir **apenas UMA** etiqueta de versão no sistema. Não concluir nenhuma tarefa sem atualizar a etiqueta.
9. **Testes no Navegador**: NÃO abrir o navegador para testes, a menos que solicitado explicitamente pelo usuário. O usuário realizará os testes manualmente para agilizar as entregas.
10. **Subir servidores locais**: Quando o usuário pedir para rodar/iniciar/subir o projeto localmente, verificar primeiro se as portas 3002 e 3005 já estão em uso (`netstat -ano | findstr "3002 3005"`). Se não estiverem, executar `cd d:\DEV_WEB\nexdojo && npm run dev:all`. Nunca subir o servidor para testes sem o usuário pedir explicitamente.
11. **Consistência de formulários (3 camadas)**: Sempre que editar um modal de formulário em `views/SettingsView.tsx` (ou qualquer view com formulário de entidade), verificar obrigatoriamente a consistência entre:
    - **Tipo** (`src/types/entities.ts`) — campos definidos na interface
    - **Payload de save** (função `handleSave*`) — campos enviados ao backend
    - **Formulário** (campos `<input>` no modal) — campos visíveis ao usuário
    Os três devem estar em sincronia. Campos presentes no tipo e no payload mas **ausentes no formulário** são o bug mais comum e silencioso. Cada modal crítico possui um comentário `CAMPOS OBRIGATÓRIOS` — conferir antes de qualquer edição.

---

## 10. Responsividade Mobile

> **CRÍTICO:** O sistema é usado em mobile. Toda alteração de UI deve preservar o desktop **e** funcionar em telas pequenas (< 640px). **NUNCA alterar a visão de desktop** ao corrigir mobile — usar prefixos `sm:` / `md:` para isolar.

### Estratégia de breakpoints (TailwindCSS v4)
- Classes **base** (sem prefixo) → aplicam-se a TODAS as telas. Use para mobile.
- `sm:` → ≥ 640px (tablet/desktop pequeno).
- `md:` → ≥ 768px (desktop). É onde a sidebar aparece.
- Para preservar desktop intacto: as classes desktop antigas devem ganhar prefixo `sm:` ou `md:`; o estado mobile vai na classe base.

### Receitas obrigatórias

| Categoria | ❌ Errado | ✅ Correto |
|---|---|---|
| Padding em cards/modais | `p-8`, `p-10`, `p-12` | `p-4 md:p-8` (ou `sm:p-8`) |
| Gap em grids/flex | `gap-8`, `gap-10`, `gap-12` | `gap-4 md:gap-8` |
| Heading principal | `text-3xl`, `text-4xl` | `text-xl sm:text-2xl md:text-3xl` |
| Grid de formulário | `grid grid-cols-2` | `grid grid-cols-1 sm:grid-cols-2` |
| Modal largura | `max-w-4xl` | `max-w-[95vw] sm:max-w-4xl` |
| Tabela HTML | tabela única para todos | tabela `hidden md:block` + cards `md:hidden` |
| Largura fixa em px | `w-[800px]`, `min-w-[600px]` | usar `w-full` ou container com `overflow-x-auto` |

### Componentes base disponíveis (Fase 0 já aplicada)
- **`src/components/ui/Modal.tsx`** — já tem padding responsivo (`p-4 sm:p-6`), `max-w-[95vw]` em mobile, footer empilha em mobile.
- **`src/components/ui/Table.tsx`** — aceita prop `mobileCardRender={(row, idx) => <Card />}`; quando definida, em mobile (`< sm`) renderiza cards no lugar da tabela.

### Antes de editar uma view, verificar
1. Tabelas têm versão card mobile? (ou usam o `Table` com `mobileCardRender`?)
2. Modais têm `max-w-[95vw] sm:max-w-*`?
3. Gaps e paddings têm breakpoint?
4. Headings têm `sm:`/`md:`?
5. Kiosk/full-screen modes funcionam em viewport vertical?

### Plano em execução
Acompanhar em `PLANO_MOBILE.md` (raiz do projeto). Marcar checkboxes conforme concluído.

---

## 11. Observações Adicionais

```
<!-- Espaço livre para anotações, gotchas, bugs conhecidos, etc. -->
```

---

*Última atualização: 21/05/2026*
