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

### Comando de Deploy

> **IMPORTANTE:** O cliente SSH do Windows não suporta senha interativa via linha de comando. O deploy deve ser feito via **Python + paramiko** conforme abaixo.

**Pré-requisito (instalar uma vez):**
```powershell
pip install paramiko --user
```

**Script de deploy** — salvar como arquivo temporário e executar:
```python
import paramiko, sys, re
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('162.240.167.149', port=22022, username='qasnexdojo', password='@Tmd4738@', timeout=30)

stdin, stdout, stderr = client.exec_command(
    'cd /home/qasnexdojo/nexdojo && git fetch origin && git reset --hard origin/main && docker compose down && docker compose up -d --build 2>&1',
    timeout=240
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

**Como executar o deploy pelo agente:**
1. Criar o script acima como arquivo temporário (ex: `deploy_run.py`) na raiz do projeto
2. Executar: `python deploy_run.py`
3. Remover o arquivo após o deploy

**Observações:**
- Usar `git fetch + reset --hard` em vez de `git pull` para evitar conflitos de branches divergidas no servidor
- O arquivo `api/.env` **não está no git** — se precisar recriar, usar SFTP via paramiko com o conteúdo do `api/.env` local
- `api/.env` no servidor contém: `PORT=3005`, `DATABASE_URL` e `JWT_SECRET`

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

---

## 10. Observações Adicionais

```
<!-- Espaço livre para anotações, gotchas, bugs conhecidos, etc. -->
```

---

*Última atualização: 12/05/2026*
